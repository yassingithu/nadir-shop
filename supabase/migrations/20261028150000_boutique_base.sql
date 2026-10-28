-- Nadir Shop : base de la boutique (produits à variantes, stock, commandes). Projet Supabase SÉPARÉ de Heavent.

create table if not exists public.equipe (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nom text not null default '',
  created_at timestamptz not null default now()
);
create or replace function public.est_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;

create table if not exists public.reglages (
  id int primary key default 1 check (id = 1),
  nom_boutique text not null default 'Nadir Shop',
  devise text not null default 'MAD',
  frais_livraison numeric(10,2) not null default 0 check (frais_livraison >= 0),
  livraison_gratuite_des numeric(10,2),
  virement_titulaire text not null default '',
  virement_banque text not null default '',
  virement_rib text not null default '',
  telephone text not null default '',
  whatsapp text not null default '',
  seuil_stock_bas int not null default 3 check (seuil_stock_bas >= 0)
);
insert into public.reglages (id) values (1) on conflict do nothing;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nom jsonb not null default '{}'::jsonb,           -- {"fr": "...", "en": "...", "ar": "..."}
  ordre int not null default 0,
  actif boolean not null default true
);

create table if not exists public.produits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  categorie_id uuid references public.categories(id) on delete set null,
  nom jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  prix numeric(10,2) not null check (prix >= 0),
  prix_barre numeric(10,2) check (prix_barre is null or prix_barre >= 0),
  photos text[] not null default '{}',
  options jsonb not null default '[]'::jsonb,        -- ex. [{"cle":"taille","nom":{"fr":"Taille","en":"Size","ar":"المقاس"}}]
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.variantes (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references public.produits(id) on delete cascade,
  sku text unique,
  valeurs jsonb not null default '{}'::jsonb,        -- ex. {"taille":"M","couleur":"Noir"}
  prix numeric(10,2) check (prix is null or prix >= 0), -- null = prix du produit
  stock int not null default 0 check (stock >= 0),
  actif boolean not null default true
);
create index if not exists variantes_produit_idx on public.variantes(produit_id);

create table if not exists public.mouvements_stock (
  id bigserial primary key,
  variante_id uuid not null references public.variantes(id) on delete cascade,
  delta int not null,
  motif text not null,                                -- commande, reception, correction, annulation
  commande_id uuid,
  par uuid,
  created_at timestamptz not null default now()
);

create sequence if not exists public.commande_numero_seq start 1001;
create table if not exists public.commandes (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique default nextval('public.commande_numero_seq'),
  nom text not null,
  telephone text not null,
  email text,
  ville text not null,
  adresse text not null,
  note text,
  mode_paiement text not null check (mode_paiement in ('livraison','virement')),
  statut text not null default 'recue' check (statut in ('recue','confirmee','expediee','livree','annulee')),
  paiement_recu boolean not null default false,
  sous_total numeric(10,2) not null,
  frais_livraison numeric(10,2) not null,
  total numeric(10,2) not null,
  langue text not null default 'fr',
  created_at timestamptz not null default now()
);
create table if not exists public.lignes_commande (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commandes(id) on delete cascade,
  variante_id uuid references public.variantes(id) on delete set null,
  nom text not null,
  valeurs jsonb not null default '{}'::jsonb,
  prix_unitaire numeric(10,2) not null,
  quantite int not null check (quantite > 0)
);

-- Droits : lecture publique du catalogue actif ; tout le reste réservé à l'équipe.
alter table public.equipe enable row level security;
alter table public.reglages enable row level security;
alter table public.categories enable row level security;
alter table public.produits enable row level security;
alter table public.variantes enable row level security;
alter table public.mouvements_stock enable row level security;
alter table public.commandes enable row level security;
alter table public.lignes_commande enable row level security;

create policy equipe_lecture on public.equipe for select using (user_id = auth.uid());
create policy reglages_lecture on public.reglages for select using (true);
create policy reglages_equipe on public.reglages for all using (public.est_equipe()) with check (public.est_equipe());
create policy categories_lecture on public.categories for select using (actif or public.est_equipe());
create policy categories_equipe on public.categories for all using (public.est_equipe()) with check (public.est_equipe());
create policy produits_lecture on public.produits for select using (actif or public.est_equipe());
create policy produits_equipe on public.produits for all using (public.est_equipe()) with check (public.est_equipe());
create policy variantes_lecture on public.variantes for select using (actif or public.est_equipe());
create policy variantes_equipe on public.variantes for all using (public.est_equipe()) with check (public.est_equipe());
create policy mouvements_equipe on public.mouvements_stock for all using (public.est_equipe()) with check (public.est_equipe());
create policy commandes_equipe on public.commandes for all using (public.est_equipe()) with check (public.est_equipe());
create policy lignes_equipe on public.lignes_commande for all using (public.est_equipe()) with check (public.est_equipe());

-- Passer une commande (visiteur sans compte) : prix et stock sont recalculés côté serveur, jamais fournis par le navigateur.
create or replace function public.passer_commande(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r public.reglages;
  l jsonb; v public.variantes; pr public.produits;
  prix numeric; sous numeric := 0; frais numeric; cid uuid; num int; n int;
begin
  select * into r from public.reglages where id = 1;
  if coalesce(trim(p->>'nom'),'') = '' or coalesce(trim(p->>'telephone'),'') = ''
     or coalesce(trim(p->>'ville'),'') = '' or coalesce(trim(p->>'adresse'),'') = '' then
    raise exception 'Informations de livraison incomplètes';
  end if;
  if (p->>'mode_paiement') not in ('livraison','virement') then raise exception 'Mode de paiement invalide'; end if;
  if jsonb_typeof(p->'lignes') <> 'array' or jsonb_array_length(p->'lignes') = 0 or jsonb_array_length(p->'lignes') > 50 then
    raise exception 'Panier vide ou trop grand';
  end if;
  if (select count(*) from public.commandes where telephone = trim(p->>'telephone') and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Trop de commandes, réessayez plus tard';
  end if;

  insert into public.commandes (nom, telephone, email, ville, adresse, note, mode_paiement, sous_total, frais_livraison, total, langue)
  values (left(trim(p->>'nom'),120), left(trim(p->>'telephone'),30), nullif(left(trim(coalesce(p->>'email','')),160),''),
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
grant execute on function public.passer_commande(jsonb) to anon, authenticated;

-- Suivi d'une commande par le client : numéro + téléphone.
create or replace function public.suivre_commande(p_numero int, p_telephone text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('numero', numero, 'statut', statut, 'paiement_recu', paiement_recu, 'total', total, 'mode_paiement', mode_paiement)
  from public.commandes where numero = p_numero and telephone = trim(p_telephone);
$$;
grant execute on function public.suivre_commande(int, text) to anon, authenticated;

-- Annulation par l'équipe : remet le stock.
create or replace function public.annuler_commande(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l record;
begin
  if not public.est_equipe() then raise exception 'Accès refusé'; end if;
  if (select statut from public.commandes where id = p_id) = 'annulee' then return; end if;
  for l in select variante_id, quantite from public.lignes_commande where commande_id = p_id and variante_id is not null loop
    update public.variantes set stock = stock + l.quantite where id = l.variante_id;
    insert into public.mouvements_stock (variante_id, delta, motif, commande_id, par) values (l.variante_id, l.quantite, 'annulation', p_id, auth.uid());
  end loop;
  update public.commandes set statut = 'annulee' where id = p_id;
end $$;
grant execute on function public.annuler_commande(uuid) to authenticated;

-- Photos des produits : lecture publique, écriture réservée à l'équipe.
insert into storage.buckets (id, name, public) values ('produits', 'produits', true) on conflict do nothing;
create policy produits_photos_lecture on storage.objects for select using (bucket_id = 'produits');
create policy produits_photos_equipe on storage.objects for all
  using (bucket_id = 'produits' and public.est_equipe()) with check (bucket_id = 'produits' and public.est_equipe());
