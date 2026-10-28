-- Sweet Family : codes promo, coordonnées modifiables, statistiques de visites, avis clients, campagnes newsletter.
-- À exécuter UNE FOIS dans Supabase (SQL Editor), APRÈS le fichier « comptes clients ». Peut être relancé sans danger.

-- 1. Coordonnées et réglages d'envoi modifiables depuis l'administration
alter table public.reglages
  add column if not exists email_contact text not null default 'contact@swtfamily.com',
  add column if not exists instagram text not null default '',
  add column if not exists facebook text not null default '',
  add column if not exists tiktok text not null default '',
  add column if not exists adresse text not null default '',
  add column if not exists horaires text not null default '',
  add column if not exists newsletter_expediteur text not null default 'Sweet Family <contact@swtfamily.com>',
  add column if not exists bienvenue_actif boolean not null default false,
  add column if not exists bienvenue_sujet text not null default 'Bienvenue chez Sweet Family',
  add column if not exists bienvenue_texte text not null default E'Merci de vous être inscrit(e) à notre newsletter !\n\nVous recevrez nos nouveautés et nos offres.\n\nÀ très vite,\nL''équipe Sweet Family';
update public.reglages set whatsapp = '212677859227' where id = 1 and coalesce(whatsapp, '') = '';

-- 2. Codes promo
create table if not exists public.codes_promo (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('pourcentage', 'montant', 'livraison')),
  valeur numeric(10,2) not null default 0 check (valeur >= 0),
  minimum numeric(10,2) not null default 0 check (minimum >= 0),
  debut date, fin date,
  max_utilisations int check (max_utilisations is null or max_utilisations > 0),
  utilisations int not null default 0,
  une_par_client boolean not null default true,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.codes_promo enable row level security;
drop policy if exists codes_promo_equipe on public.codes_promo;
create policy codes_promo_equipe on public.codes_promo for all using (public.est_equipe()) with check (public.est_equipe());
alter table public.commandes add column if not exists code_promo text, add column if not exists remise numeric(10,2) not null default 0;

create or replace function public._sous_total(p_lignes jsonb) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(coalesce(v.prix, pr.prix) * least(greatest(x.quantite, 0), 99)), 0)
  from jsonb_to_recordset(p_lignes) as x(variante_id uuid, quantite int)
  join public.variantes v on v.id = x.variante_id and v.actif
  join public.produits pr on pr.id = v.produit_id and pr.actif;
$$;

create or replace function public._promo(p_code text, p_sous numeric, p_frais numeric, p_user uuid, p_verrou boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := upper(trim(coalesce(p_code, ''))); c public.codes_promo; r numeric := 0; f numeric := p_frais;
begin
  if k = '' then return jsonb_build_object('valide', true, 'code', null, 'remise', 0, 'frais', p_frais); end if;
  if p_verrou then select * into c from public.codes_promo where codes_promo.code = k for update;
  else select * into c from public.codes_promo where codes_promo.code = k; end if;
  if not found or not c.actif then return jsonb_build_object('valide', false, 'message', 'Code promo invalide.'); end if;
  if c.debut is not null and current_date < c.debut then return jsonb_build_object('valide', false, 'message', 'Ce code n''est pas encore valable.'); end if;
  if c.fin is not null and current_date > c.fin then return jsonb_build_object('valide', false, 'message', 'Ce code a expiré.'); end if;
  if c.max_utilisations is not null and c.utilisations >= c.max_utilisations then return jsonb_build_object('valide', false, 'message', 'Ce code n''est plus disponible.'); end if;
  if p_sous < c.minimum then return jsonb_build_object('valide', false, 'message', format('Ce code est valable dès %s MAD d''achats.', trim(trailing '.' from trim(trailing '0' from c.minimum::text)))); end if;
  if c.une_par_client and p_user is not null and exists (select 1 from public.commandes o where o.user_id = p_user and o.code_promo = k and o.statut <> 'annulee') then
    return jsonb_build_object('valide', false, 'message', 'Vous avez déjà utilisé ce code.');
  end if;
  if c.type = 'pourcentage' then r := round(p_sous * least(c.valeur, 100) / 100, 2);
  elsif c.type = 'montant' then r := least(c.valeur, p_sous);
  else f := 0; end if;
  return jsonb_build_object('valide', true, 'code', k, 'remise', r, 'frais', f, 'type', c.type);
end $$;

-- Aperçu du code dans le panier (le vrai calcul est refait à la commande)
create or replace function public.verifier_code_promo(p_code text, p_lignes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s numeric; fr numeric; r public.reglages;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into r from public.reglages where id = 1;
  s := public._sous_total(p_lignes);
  fr := case when r.livraison_gratuite_des is not null and s >= r.livraison_gratuite_des then 0 else r.frais_livraison end;
  return public._promo(p_code, s, fr, auth.uid(), false);
end $$;
grant execute on function public.verifier_code_promo(text, jsonb) to authenticated;
revoke execute on function public._promo(text, numeric, numeric, uuid, boolean) from public, anon, authenticated;
revoke execute on function public._sous_total(jsonb) from public, anon, authenticated;

create or replace function public.passer_commande(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.reglages;
  l jsonb; v public.variantes; pr public.produits;
  prix numeric; sous numeric := 0; frais numeric; cid uuid; num int; n int; promo jsonb; rem numeric := 0;
begin
  if auth.uid() is null then raise exception 'Connexion requise pour commander'; end if;
  select * into r from public.reglages where id = 1;
  if coalesce(trim(p->>'nom'),'') = '' or coalesce(trim(p->>'telephone'),'') = ''
     or coalesce(trim(p->>'ville'),'') = '' or coalesce(trim(p->>'adresse'),'') = '' then
    raise exception 'Informations de livraison incomplètes';
  end if;
  if (p->>'mode_paiement') not in ('livraison','virement') then raise exception 'Mode de paiement invalide'; end if;
  if jsonb_typeof(p->'lignes') <> 'array' or jsonb_array_length(p->'lignes') = 0 or jsonb_array_length(p->'lignes') > 50 then
    raise exception 'Panier vide ou trop grand';
  end if;
  if (select count(*) from public.commandes where (user_id = auth.uid() or telephone = trim(p->>'telephone')) and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Trop de commandes, réessayez plus tard';
  end if;

  insert into public.commandes (user_id, nom, telephone, email, ville, adresse, note, mode_paiement, sous_total, frais_livraison, total, langue)
  values (auth.uid(), left(trim(p->>'nom'),120), left(trim(p->>'telephone'),30), nullif(left(trim(coalesce(p->>'email','')),160),''),
          left(trim(p->>'ville'),80), left(trim(p->>'adresse'),300), nullif(left(trim(coalesce(p->>'note','')),500),''),
          p->>'mode_paiement', 0, 0, 0, coalesce(nullif(p->>'langue',''),'fr'))
  returning id, numero into cid, num;

  for l in select * from jsonb_array_elements(p->'lignes') loop
    n := (l->>'quantite')::int;
    if n is null or n < 1 or n > 99 then raise exception 'Quantité invalide'; end if;
    select * into v from public.variantes where id = (l->>'variante_id')::uuid and actif for update;
    if not found then raise exception 'Article indisponible'; end if;
    select * into pr from public.produits where id = v.produit_id and actif;
    if not found then raise exception 'Article indisponible'; end if;
    if v.stock < n then raise exception 'Stock insuffisant pour %', coalesce(pr.nom->>'fr', pr.slug); end if;
    prix := coalesce(v.prix, pr.prix);
    update public.variantes set stock = stock - n where id = v.id;
    insert into public.mouvements_stock (variante_id, delta, motif, commande_id) values (v.id, -n, 'commande', cid);
    insert into public.lignes_commande (commande_id, variante_id, nom, valeurs, prix_unitaire, quantite)
      values (cid, v.id, coalesce(pr.nom->>'fr', pr.slug), v.valeurs, prix, n);
    sous := sous + prix * n;
  end loop;

  frais := case when r.livraison_gratuite_des is not null and sous >= r.livraison_gratuite_des then 0 else r.frais_livraison end;
  promo := public._promo(p->>'code_promo', sous, frais, auth.uid(), true);
  if not (promo->>'valide')::boolean then raise exception '%', promo->>'message'; end if;
  rem := coalesce((promo->>'remise')::numeric, 0); frais := (promo->>'frais')::numeric;
  update public.commandes set sous_total = sous, frais_livraison = frais, remise = rem, code_promo = promo->>'code', total = greatest(sous - rem + frais, 0) where id = cid;
  if promo->>'code' is not null then update public.codes_promo set utilisations = utilisations + 1 where code = promo->>'code'; end if;
  return jsonb_build_object('numero', num, 'total', greatest(sous - rem + frais, 0), 'mode_paiement', p->>'mode_paiement');
end $$;
grant execute on function public.passer_commande(jsonb) to authenticated;
revoke execute on function public.passer_commande(jsonb) from anon;

create or replace function public.annuler_commande(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l record; k text;
begin
  if not public.est_equipe() then raise exception 'Accès refusé'; end if;
  if (select statut from public.commandes where id = p_id) = 'annulee' then return; end if;
  for l in select variante_id, quantite from public.lignes_commande where commande_id = p_id and variante_id is not null loop
    update public.variantes set stock = stock + l.quantite where id = l.variante_id;
    insert into public.mouvements_stock (variante_id, delta, motif, commande_id, par) values (l.variante_id, l.quantite, 'annulation', p_id, auth.uid());
  end loop;
  select code_promo into k from public.commandes where id = p_id;
  if k is not null then update public.codes_promo set utilisations = greatest(utilisations - 1, 0) where code = k; end if;
  update public.commandes set statut = 'annulee' where id = p_id;
end $$;
grant execute on function public.annuler_commande(uuid) to authenticated;

-- 3. Statistiques de visites (sans cookie, sans donnée personnelle)
create table if not exists public.visites (
  id bigserial primary key,
  jour date not null default current_date,
  visiteur text not null,
  chemin text not null,
  langue text,
  source text,
  created_at timestamptz not null default now()
);
create index if not exists visites_jour_idx on public.visites(jour);
alter table public.visites enable row level security;
drop policy if exists visites_equipe on public.visites;
create policy visites_equipe on public.visites for select using (public.est_equipe());

create or replace function public.enregistrer_visite(p_visiteur text, p_chemin text, p_langue text default null, p_source text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(length(p_visiteur), 0) not between 8 and 40 or coalesce(left(p_chemin, 1), '') <> '/' or length(p_chemin) > 200 then return; end if;
  if (select count(*) from public.visites where visiteur = p_visiteur and created_at > now() - interval '1 minute') >= 30 then return; end if;
  insert into public.visites (visiteur, chemin, langue, source)
  values (p_visiteur, p_chemin, case when p_langue in ('fr','en','ar') then p_langue end, nullif(left(coalesce(p_source, ''), 80), ''));
end $$;
grant execute on function public.enregistrer_visite(text, text, text, text) to anon, authenticated;

create or replace function public.stats_visites(p_jours int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare d date := current_date - (greatest(least(p_jours, 365), 1) - 1); res jsonb;
begin
  if not public.est_equipe() then raise exception 'Accès refusé'; end if;
  select jsonb_build_object(
    'jours', coalesce((select jsonb_agg(jsonb_build_object('jour', j, 'vues', coalesce(v.vues, 0), 'visiteurs', coalesce(v.visiteurs, 0)) order by j)
      from generate_series(d, current_date, interval '1 day') as j(j)
      left join (select jour, count(*) as vues, count(distinct visiteur) as visiteurs from public.visites where jour >= d group by jour) v on v.jour = j.j::date), '[]'),
    'total_vues', (select count(*) from public.visites where jour >= d),
    'total_visiteurs', (select count(distinct visiteur) from public.visites where jour >= d),
    'aujourdhui_vues', (select count(*) from public.visites where jour = current_date),
    'aujourdhui_visiteurs', (select count(distinct visiteur) from public.visites where jour = current_date),
    'pages', coalesce((select jsonb_agg(x) from (select chemin, count(*) as vues, count(distinct visiteur) as visiteurs from public.visites where jour >= d group by chemin order by count(*) desc limit 15) x), '[]'),
    'sources', coalesce((select jsonb_agg(x) from (select coalesce(source, 'Direct') as source, count(distinct visiteur) as visiteurs from public.visites where jour >= d group by 1 order by 2 desc limit 10) x), '[]'),
    'langues', coalesce((select jsonb_agg(x) from (select coalesce(langue, '?') as langue, count(distinct visiteur) as visiteurs from public.visites where jour >= d group by 1 order by 2 desc) x), '[]'),
    'commandes', (select count(*) from public.commandes where created_at::date >= d and statut <> 'annulee'),
    'chiffre', (select coalesce(sum(total), 0) from public.commandes where created_at::date >= d and statut <> 'annulee')
  ) into res;
  return res;
end $$;
grant execute on function public.stats_visites(int) to authenticated;

-- 4. Avis clients (modérés avant publication, achat vérifié)
create table if not exists public.avis (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references public.produits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nom_affiche text not null,
  note int not null check (note between 1 and 5),
  titre text not null default '',
  texte text not null default '',
  statut text not null default 'attente' check (statut in ('attente', 'publie', 'refuse')),
  reponse text,
  created_at timestamptz not null default now(),
  unique (produit_id, user_id)
);
create index if not exists avis_produit_idx on public.avis(produit_id, statut);
alter table public.avis enable row level security;
drop policy if exists avis_publics on public.avis;
create policy avis_publics on public.avis for select using (statut = 'publie' or user_id = auth.uid() or public.est_equipe());
drop policy if exists avis_equipe on public.avis;
create policy avis_equipe on public.avis for all using (public.est_equipe()) with check (public.est_equipe());

create or replace function public._a_recu(p_produit uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.commandes c join public.lignes_commande l on l.commande_id = c.id join public.variantes v on v.id = l.variante_id
    where c.user_id = auth.uid() and c.statut in ('expediee', 'livree') and v.produit_id = p_produit);
$$;
revoke execute on function public._a_recu(uuid) from public, anon, authenticated;

create or replace function public.peut_donner_avis(p_produit uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('connecte', auth.uid() is not null, 'a_achete', coalesce(public._a_recu(p_produit), false),
    'deja', exists (select 1 from public.avis where produit_id = p_produit and user_id = auth.uid()));
$$;
grant execute on function public.peut_donner_avis(uuid) to anon, authenticated;

create or replace function public.laisser_avis(p_produit uuid, p_note int, p_titre text, p_texte text, p_nom text) returns void
language plpgsql security definer set search_path = public as $$
declare nom text := trim(coalesce(p_nom, '')); affiche text;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if p_note not between 1 and 5 then raise exception 'Note invalide'; end if;
  if length(trim(coalesce(p_texte, ''))) < 5 or length(p_texte) > 1500 then raise exception 'Votre avis doit faire entre 5 et 1500 caractères'; end if;
  if not public._a_recu(p_produit) then raise exception 'Vous pourrez donner votre avis après la réception de votre commande'; end if;
  affiche := coalesce(nullif(split_part(nom, ' ', 1), ''), 'Client') || case when position(' ' in nom) > 0 and split_part(nom, ' ', 2) <> '' then ' ' || upper(left(split_part(nom, ' ', 2), 1)) || '.' else '' end;
  insert into public.avis (produit_id, user_id, nom_affiche, note, titre, texte)
  values (p_produit, auth.uid(), left(affiche, 40), p_note, left(trim(coalesce(p_titre, '')), 100), left(trim(p_texte), 1500))
  on conflict (produit_id, user_id) do update set note = excluded.note, titre = excluded.titre, texte = excluded.texte, nom_affiche = excluded.nom_affiche, statut = 'attente', reponse = null, created_at = now();
end $$;
grant execute on function public.laisser_avis(uuid, int, text, text, text) to authenticated;

-- 5. Newsletter : campagnes (envoi manuel ou planifié) et e-mail de bienvenue automatique
create table if not exists public.campagnes (
  id uuid primary key default gen_random_uuid(),
  sujet text not null,
  contenu text not null,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'planifiee', 'envoi', 'envoyee', 'erreur')),
  planifiee_le timestamptz,
  envoyee_le timestamptz,
  nb_envoyes int not null default 0,
  nb_erreurs int not null default 0,
  erreur text,
  created_at timestamptz not null default now()
);
alter table public.campagnes enable row level security;
drop policy if exists campagnes_equipe on public.campagnes;
create policy campagnes_equipe on public.campagnes for all using (public.est_equipe()) with check (public.est_equipe());
alter table public.abonnes_newsletter add column if not exists bienvenue_envoye boolean not null default true;
alter table public.abonnes_newsletter alter column bienvenue_envoye set default false;
