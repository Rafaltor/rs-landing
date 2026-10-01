-- Battle Royale Fall Guys : coupes par classement, pas de vies.
-- Pulse ne peut plus ressusciter un joueur déjà out.

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
    0,
    greatest(0, coalesce(p_combo, 0)),
    greatest(0, coalesce(p_max_combo, 0)),
    coalesce(p_aura, 0),
    true,
    now()
  )
  on conflict (player_id) do update
    set combo = excluded.combo,
        max_combo = greatest(public.aura_royale.max_combo, excluded.max_combo),
        aura = excluded.aura,
        alive = public.aura_royale.alive,
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.aura_royale_cutoff(p_code text, p_host_token text, p_keep integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  r public.aura_rooms%rowtype;
  kept int;
  dropped int;
begin
  kept := greatest(1, coalesce(p_keep, 1));
  select * into r from public.aura_rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'salon introuvable';
  end if;
  if r.host_token_hash <> crypt(p_host_token, r.host_token_hash) then
    raise exception 'pas l hote';
  end if;
  if r.mode <> 'royale' or r.status <> 'playing' then
    raise exception 'coupe hors battle royale';
  end if;

  with ranked as (
    select player_id,
           row_number() over (order by aura desc, max_combo desc, combo desc, updated_at asc) as rk
    from public.aura_royale
    where room_id = r.id and alive
  )
  update public.aura_royale x
     set alive = false, updated_at = now()
    from ranked
   where x.player_id = ranked.player_id
     and ranked.rk > kept;

  get diagnostics dropped = row_count;
  return jsonb_build_object('ok', true, 'keep', kept, 'eliminated', dropped);
end;
$$;

grant execute on function public.aura_royale_cutoff(text, text, integer) to anon, authenticated;
grant execute on function public.aura_royale_pulse(uuid, text, integer, integer, integer, boolean, integer) to anon, authenticated;
