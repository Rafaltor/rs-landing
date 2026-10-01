-- Arrêter le jeu : retour lobby, scores et état royale effacés pour relancer un mode.

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
  if p_status = 'lobby' then
    delete from public.aura_scores where room_id = r.id;
    delete from public.aura_royale where room_id = r.id;
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
