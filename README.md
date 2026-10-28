# Nadir Shop (nom provisoire)

Boutique en ligne (FR / EN / AR) pour un vendeur, avec paiement à la livraison ou par virement. Projet **séparé** de Heavent.

- `src/` : la boutique (React, Vite, Tailwind). Sans variables d'environnement, elle tourne en **mode démonstration**.
- `supabase/migrations/` : la base (produits à variantes, stock, commandes). À appliquer sur le Supabase **de la boutique** uniquement.
- Clés : copier `.env.example` en `.env` et y mettre l'URL du projet et la clé **publique** (anon). Jamais la clé service_role.
- `npm run dev` pour essayer, `npm run build` pour construire.
