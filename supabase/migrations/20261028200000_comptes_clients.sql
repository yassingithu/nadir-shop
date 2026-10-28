-- Comptes clients : il faut un compte pour commander. À exécuter une fois dans Supabase (SQL Editor).
-- Ensuite, dans Supabase : Authentication → Sign In / Providers → Email : décocher « Confirm email » (voir les explications).

alter table public.commandes add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists commandes_user_idx on public.commandes(user_id);

-- Un client connecté voit ses propres commandes (et uniquement les siennes).
drop policy if exists commandes_client_lecture on public.commandes;
create policy commandes_client_lecture on public.commandes for select using (user_id = auth.uid());
drop policy if exists lignes_client_lecture on public.lignes_commande;
create policy lignes_client_lecture on public.lignes_commande for select
  using (exists (select 1 from public.commandes c where c.id = commande_id and c.user_id = auth.uid()));

create or replace function public.passer_commande(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.reglages;
  l jsonb; v public.variantes; pr public.produits;
  prix numeric; sous numeric := 0; frais numeric; cid uuid; num int; n int;
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
  update public.commandes set sous_total = sous, frais_livraison = frais, total = sous + frais where id = cid;
  return jsonb_build_object('numero', num, 'total', sous + frais, 'mode_paiement', p->>'mode_paiement');
end $$;
grant execute on function public.passer_commande(jsonb) to authenticated;
revoke execute on function public.passer_commande(jsonb) from anon;

-- Suivi : numéro + téléphone (comme avant), ou simplement le numéro pour le propriétaire connecté de la commande.
create or replace function public.suivre_commande(p_numero int, p_telephone text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('numero', numero, 'statut', statut, 'paiement_recu', paiement_recu, 'total', total, 'mode_paiement', mode_paiement)
  from public.commandes where numero = p_numero and (telephone = trim(p_telephone) or (user_id is not null and user_id = auth.uid()));
$$;
grant execute on function public.suivre_commande(int, text) to anon, authenticated;

-- Newsletter : inscription depuis le site, désinscription par lien personnel, liste réservée à l'équipe.
create table if not exists public.abonnes_newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  langue text not null default 'fr',
  actif boolean not null default true,
  token uuid not null default gen_random_uuid(),
  source text not null default 'site',
  created_at timestamptz not null default now()
);
alter table public.abonnes_newsletter enable row level security;
drop policy if exists abonnes_equipe on public.abonnes_newsletter;
create policy abonnes_equipe on public.abonnes_newsletter for all using (public.est_equipe()) with check (public.est_equipe());

create or replace function public.abonner_newsletter(p_email text, p_langue text default 'fr', p_source text default 'site') returns void
language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email,'')));
begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 160 then raise exception 'E-mail invalide'; end if;
  if (select count(*) from public.abonnes_newsletter where created_at > now() - interval '1 minute') >= 100 then raise exception 'Trop de demandes, réessayez plus tard'; end if;
  insert into public.abonnes_newsletter (email, langue, source)
  values (e, case when p_langue in ('fr','en','ar') then p_langue else 'fr' end, left(coalesce(p_source,'site'), 30))
  on conflict (email) do update set actif = true, langue = excluded.langue;
end $$;
grant execute on function public.abonner_newsletter(text, text, text) to anon, authenticated;

create or replace function public.desabonner_newsletter(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.abonnes_newsletter set actif = false where token = p_token;
  return found;
end $$;
grant execute on function public.desabonner_newsletter(uuid) to anon, authenticated;
