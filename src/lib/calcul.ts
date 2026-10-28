import type { Ligne, Produit, Reglages } from "./types";
/** Aperçu des totaux dans le navigateur (le vrai calcul est refait côté serveur à la commande). */
export function detail(lignes: Ligne[], produits: Produit[], r: Reglages) {
  const items = lignes.flatMap((l) => {
    const p = produits.find((x) => x.id === l.produit_id);
    const v = p?.variantes.find((x) => x.id === l.variante_id);
    return p && v ? [{ l, p, v, prix: v.prix ?? p.prix }] : [];
  });
  const sous = items.reduce((s, i) => s + i.prix * i.l.quantite, 0);
  const frais = r.livraison_gratuite_des != null && sous >= r.livraison_gratuite_des ? 0 : r.frais_livraison;
  return { items, sous, frais, total: sous + (items.length ? frais : 0) };
}
