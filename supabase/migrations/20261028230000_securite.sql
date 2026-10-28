-- Sweet Family : renforcement de la sécurité (audit du 28/10/2026).
-- 1. Visites : plafonds globaux (on ne peut plus gonfler les statistiques ni remplir la base) + nettoyage après 13 mois.
-- 2. Newsletter : adresses strictement valides (pas de formule Excel), plafonds d'inscriptions plus bas.
-- 3. Codes promo : 20 essais maximum par client et par heure.
-- 4. Photos : 5 Mo maximum, images uniquement.

-- 1. Visites ---------------------------------------------------------------
create index if not exists visites_created_idx on public.visites(created_at);

create or replace function public.enregistrer_visite(p_visiteur text, p_chemin text, p_langue text default null, p_source text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(length(p_visiteur), 0) not between 8 and 40 or coalesce(left(p_chemin, 1), '') <> '/' or length(p_chemin) > 200 then return; end if;
  if (select count(*) from public.visites where visiteur = p_visiteur and created_at > now() - interval '1 minute') >= 30 then return; end if;
  -- Plafonds globaux, quel que soit l'identifiant envoyé : 600 vues par minute, 20 000 par jour.
  if (select count(*) from public.visites where created_at > now() - interval '1 minute') >= 600 then return; end if;
  if (select count(*) from public.visites where jour = current_date) >= 20000 then return; end if;
  insert into public.visites (visiteur, chemin, langue, source)
  values (p_visiteur, p_chemin, case when p_langue in ('fr','en','ar') then p_langue end, nullif(left(coalesce(p_source, ''), 80), ''));
end $$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('sweet-family-nettoyage-visites') where exists (select 1 from cron.job where jobname = 'sweet-family-nettoyage-visites');
    perform cron.schedule('sweet-family-nettoyage-visites', '17 3 * * *', $c$delete from public.visites where created_at < now() - interval '13 months'$c$);
  end if;
end $$;

-- 2. Newsletter ------------------------------------------------------------
create or replace function public.abonner_newsletter(p_email text, p_langue text default 'fr', p_source text default 'site')
returns void language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email,'')));
begin
  if e !~ '^[a-z0-9][a-z0-9._%+-]*@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$' or length(e) > 160 then
    raise exception 'E-mail invalide';
  end if;
  if (select count(*) from public.abonnes_newsletter where created_at > now() - interval '1 minute') >= 10
     or (select count(*) from public.abonnes_newsletter where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Trop de demandes, réessayez plus tard';
  end if;
  insert into public.abonnes_newsletter (email, langue, source)
  values (e, case when p_langue in ('fr','en','ar') then p_langue else 'fr' end, left(coalesce(p_source,'site'), 30))
  on conflict (email) do update set actif = true, langue = excluded.langue;
end $$;

-- 3. Codes promo -----------------------------------------------------------
create table if not exists public.essais_promo (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists essais_promo_user_idx on public.essais_promo(user_id, created_at);
alter table public.essais_promo enable row level security; -- aucune règle : invisible depuis le site
revoke all on public.essais_promo from anon, authenticated;

create or replace function public.verifier_code_promo(p_code text, p_lignes jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s numeric; fr numeric; r public.reglages;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if coalesce(trim(p_code), '') <> '' then
    if (select count(*) from public.essais_promo where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
      return jsonb_build_object('valide', false, 'message', 'Trop d''essais, réessayez dans une heure.');
    end if;
    insert into public.essais_promo (user_id) values (auth.uid());
    delete from public.essais_promo where created_at < now() - interval '1 day';
  end if;
  select * into r from public.reglages where id = 1;
  s := public._sous_total(p_lignes);
  fr := case when r.livraison_gratuite_des is not null and s >= r.livraison_gratuite_des then 0 else r.frais_livraison end;
  return public._promo(p_code, s, fr, auth.uid(), false);
end $$;

-- Les fonctions internes ne doivent pas être appelables depuis le site.
revoke execute on function public._promo(text, numeric, numeric, uuid, boolean) from public, anon, authenticated;
revoke execute on function public._sous_total(jsonb) from public, anon, authenticated;
revoke execute on function public._a_recu(uuid) from public, anon, authenticated;

-- 4. Photos ----------------------------------------------------------------
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'produits';
