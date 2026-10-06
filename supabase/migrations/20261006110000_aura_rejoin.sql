-- Rejoindre ou revenir pendant preview / playing.
-- Un joueur qui recharge au milieu d'une battle royale reçoit une place vivante.

create or replace function public.aura_join_room(p_code text, p_name text, p_secret text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  r public.aura_rooms%rowtype;
  pid uuid;
  cleaned_name text;
begin
  if p_secret is null or length(p_secret) < 16 then
    raise exception 'secret invalide';
  end if;
  select * into r from public.aura_rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'salon introuvable';
  end if;
  if r.status = 'finished' then
    raise exception 'le mog est fini';
  end if;
  cleaned_name := left(trim(coalesce(p_name, '')), 20);
  if cleaned_name = '' then
    cleaned_name := 'NPC';
  end if;
  insert into public.aura_players (room_id, name, secret_hash)
  values (r.id, cleaned_name, crypt(p_secret, gen_salt('bf')))
  returning id into pid;
  if r.mode = 'royale' and r.status = 'playing' then
    insert into public.aura_royale (player_id, room_id, alive)
    values (pid, r.id, true)
    on conflict (player_id) do nothing;
  end if;
  return jsonb_build_object('id', pid, 'room_id', r.id, 'name', cleaned_name, 'code', r.code);
end;
$$;
