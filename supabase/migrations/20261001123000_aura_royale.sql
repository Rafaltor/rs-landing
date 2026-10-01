-- Battle Royale : mode de salon + état live (vies / combo)

drop function if exists public.aura_create_room(text, text);

alter table public.aura_rooms
  add column if not exists mode text not null default 'classic';

alter table public.aura_rooms drop constraint if exists aura_rooms_mode_check;
alter table public.aura_rooms
  add constraint aura_rooms_mode_check check (mode in ('classic', 'royale'));

create table if not exists public.aura_royale (
  player_id uuid primary key references public.aura_players(id) on delete cascade,
  room_id uuid not null references public.aura_rooms(id) on delete cascade,
  lives int not null default 3,
  combo int not null default 0,
  max_combo int not null default 0,
  aura int not null default 0,
  alive boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists aura_royale_room_idx on public.aura_royale (room_id);

alter table public.aura_royale enable row level security;

drop policy if exists aura_royale_select on public.aura_royale;
create policy aura_royale_select on public.aura_royale for select using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'aura_royale'
  ) then
    execute 'alter publication supabase_realtime add table public.aura_royale';
  end if;
end $$;

create or replace function public.aura_create_room(p_code text, p_host_token text, p_mode text default 'classic')
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  rid uuid;
  cleaned text;
  mode_clean text;
begin
  cleaned := upper(regexp_replace(coalesce(p_code, ''), '[^A-Z0-9]', '', 'g'));
  if length(cleaned) < 4 or length(cleaned) > 8 then
    raise exception 'code invalide';
  end if;
  if p_host_token is null or length(p_host_token) < 16 then
    raise exception 'token invalide';
  end if;
  mode_clean := lower(trim(coalesce(p_mode, 'classic')));
  if mode_clean not in ('classic', 'royale') then
    raise exception 'mode invalide';
  end if;
  insert into public.aura_rooms (code, host_token_hash, mode)
  values (cleaned, crypt(p_host_token, gen_salt('bf')), mode_clean)
  returning id into rid;
  return jsonb_build_object('id', rid, 'code', cleaned, 'mode', mode_clean);
end;
$$;

create or replace function public.aura_set_mode(p_code text, p_host_token text, p_mode text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  r public.aura_rooms%rowtype;
  mode_clean text;
begin
  mode_clean := lower(trim(coalesce(p_mode, 'classic')));
  if mode_clean not in ('classic', 'royale') then
    raise exception 'mode invalide';
  end if;
  select * into r from public.aura_rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'salon introuvable';
  end if;
  if r.host_token_hash <> crypt(p_host_token, r.host_token_hash) then
    raise exception 'pas l hote';
  end if;
  if r.status <> 'lobby' then
    raise exception 'le mog a deja commence';
  end if;
  update public.aura_rooms set mode = mode_clean where id = r.id returning * into r;
  return jsonb_build_object('id', r.id, 'code', r.code, 'mode', r.mode, 'status', r.status);
end;
$$;

create or replace function public.aura_advance(p_code text, p_host_token text, p_status text, p_round integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  r public.aura_rooms%rowtype;
begin
  if p_status not in ('lobby', 'preview', 'playing', 'reveal', 'finished') then
    raise exception 'statut invalide';
  end if;
  if p_round is null or p_round < 0 then
    raise exception 'round invalide';
  end if;
  select * into r from public.aura_rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'salon introuvable';
  end if;
  if r.host_token_hash <> crypt(p_host_token, r.host_token_hash) then
    raise exception 'pas l hote';
  end if;
  update public.aura_rooms
    set status = p_status,
        round = p_round,
        round_started_at = case when p_status in ('playing', 'preview') then now() else round_started_at end
    where id = r.id
    returning * into r;
  if r.mode = 'royale' and p_status = 'playing' then
    insert into public.aura_royale (player_id, room_id)
    select p.id, p.room_id from public.aura_players p where p.room_id = r.id
    on conflict (player_id) do update
      set lives = 3, combo = 0, max_combo = 0, aura = 0, alive = true, updated_at = now();
  end if;
  return jsonb_build_object(
    'id', r.id,
    'code', r.code,
    'status', r.status,
    'round', r.round,
    'mode', r.mode,
    'round_started_at', r.round_started_at
  );
end;
$$;

create or replace function public.aura_royale_pulse(
  p_player_id uuid,
  p_secret text,
  p_lives integer,
  p_combo integer,
  p_aura integer,
  p_alive boolean,
  p_max_combo integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  p public.aura_players%rowtype;
begin
  select * into p from public.aura_players where id = p_player_id;
  if not found then
    raise exception 'joueur introuvable';
  end if;
  if p.secret_hash <> crypt(p_secret, p.secret_hash) then
    raise exception 'secret invalide';
  end if;
  insert into public.aura_royale (player_id, room_id, lives, combo, max_combo, aura, alive, updated_at)
  values (
    p.id,
    p.room_id,
    greatest(0, least(9, coalesce(p_lives, 0))),
    greatest(0, coalesce(p_combo, 0)),
    greatest(0, coalesce(p_max_combo, 0)),
    coalesce(p_aura, 0),
    coalesce(p_alive, true),
    now()
  )
  on conflict (player_id) do update
    set lives = excluded.lives,
        combo = excluded.combo,
        max_combo = greatest(public.aura_royale.max_combo, excluded.max_combo),
        aura = excluded.aura,
        alive = excluded.alive,
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.aura_set_mode(text, text, text) to anon, authenticated;
grant execute on function public.aura_create_room(text, text, text) to anon, authenticated;
grant execute on function public.aura_royale_pulse(uuid, text, integer, integer, integer, boolean, integer) to anon, authenticated;
grant execute on function public.aura_advance(text, text, text, integer) to anon, authenticated;
