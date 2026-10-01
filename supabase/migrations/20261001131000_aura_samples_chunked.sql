-- Le clip Battle Royale (~3 min) dépassait le statement_timeout (8s)
-- si on upsertait toutes les poses d'un coup. Paquets + 60s sur cette RPC.

drop function if exists public.aura_upsert_samples(text, text, text, jsonb);
drop function if exists public.aura_upsert_samples(text, text, text, jsonb, boolean);

create or replace function public.aura_upsert_samples(
  p_code text,
  p_host_token text,
  p_slug text,
  p_samples jsonb,
  p_append boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
set statement_timeout to '60s'
as $function$
declare
  r public.aura_rooms%rowtype;
begin
  if p_slug is null or p_slug = '' then
    raise exception 'slug invalide';
  end if;
  if p_samples is null or jsonb_typeof(p_samples) <> 'array' then
    raise exception 'samples invalides';
  end if;
  if jsonb_array_length(p_samples) > 400 then
    raise exception 'trop de samples';
  end if;
  select * into r from public.aura_rooms where code = upper(trim(p_code));
  if not found then
    raise exception 'salon introuvable';
  end if;
  if r.host_token_hash <> crypt(p_host_token, r.host_token_hash) then
    raise exception 'pas l hote';
  end if;
  if p_append then
    update public.aura_move_samples
       set samples = coalesce(samples, '[]'::jsonb) || p_samples,
           updated_at = now()
     where slug = p_slug;
    if not found then
      insert into public.aura_move_samples (slug, samples, updated_at)
      values (p_slug, p_samples, now());
    end if;
  else
    insert into public.aura_move_samples (slug, samples, updated_at)
    values (p_slug, p_samples, now())
    on conflict (slug) do update
      set samples = excluded.samples, updated_at = now();
  end if;
  return jsonb_build_object('ok', true, 'slug', p_slug);
end;
$function$;

grant execute on function public.aura_upsert_samples(text, text, text, jsonb, boolean) to anon, authenticated, service_role;
