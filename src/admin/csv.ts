/** Import / export Excel (fichier CSV à séparateur « ; », ouvert directement par Excel). Une ligne par taille. */
export const COLONNES = ["slug", "nom_fr", "nom_en", "nom_ar", "categorie", "prix", "prix_barre", "taille", "stock", "actif"] as const;
export type LigneCsv = Record<(typeof COLONNES)[number], string>;

/** Une cellule qui commence par = + - @ serait exécutée comme une formule par Excel : on la neutralise par une apostrophe. */
const neutraliser = (v: string) => (/^[=+\-@\t\r]/.test(v) && !/^-?\d+([.,]\d+)?$/.test(v) ? "'" + v : v);
export const echapper = (brut: string) => { const v = neutraliser(brut); return /[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
export const versCsv = (lignes: LigneCsv[]) => "﻿" + [COLONNES.join(";"), ...lignes.map((l) => COLONNES.map((c) => echapper(l[c] ?? "")).join(";"))].join("\r\n");

/** Découpe un texte CSV (guillemets, séparateur « ; » ou « , » détecté sur la première ligne). */
export function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, "");
  const premiere = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (premiere.match(/;/g)?.length ?? 0) >= (premiere.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = []; let ligne: string[] = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === sep) { ligne.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; ligne.push(cur); rows.push(ligne); ligne = []; cur = ""; }
    else cur += c;
  }
  if (cur !== "" || ligne.length) { ligne.push(cur); rows.push(ligne); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export type ProduitImport = { slug: string; nom: { fr: string; en: string; ar: string }; categorie: string; prix: number; prix_barre: number | null; actif: boolean; variantes: { taille: string; stock: number }[] };

/** Transforme le CSV en produits ; renvoie aussi les erreurs lisibles (numéro de ligne Excel). */
export function lireProduits(texte: string): { produits: ProduitImport[]; erreurs: string[] } {
  const rows = lireCsv(texte), erreurs: string[] = [];
  if (!rows.length) return { produits: [], erreurs: ["Le fichier est vide."] };
  const entete = rows[0].map((x) => x.trim().toLowerCase());
  const idx = (c: string) => entete.indexOf(c);
  for (const c of ["slug", "nom_fr", "prix"]) if (idx(c) < 0) erreurs.push(`Colonne manquante : ${c}`);
  if (erreurs.length) return { produits: [], erreurs };
  const g = (r: string[], c: string) => (idx(c) >= 0 ? (r[idx(c)] ?? "").trim() : "");
  const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
  const map = new Map<string, ProduitImport>();
  rows.slice(1).forEach((r, i) => {
    const n = i + 2, slug = g(r, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) return void erreurs.push(`Ligne ${n} : « slug » vide.`);
    const prix = nombre(g(r, "prix")), pb = g(r, "prix_barre");
    if (!Number.isFinite(prix) || prix < 0) return void erreurs.push(`Ligne ${n} : prix invalide.`);
    if (pb && !(nombre(pb) >= 0)) return void erreurs.push(`Ligne ${n} : prix barré invalide.`);
    const stock = g(r, "stock") === "" ? 0 : nombre(g(r, "stock"));
    if (!Number.isInteger(stock) || stock < 0) return void erreurs.push(`Ligne ${n} : stock invalide.`);
    const existant = map.get(slug) ?? { slug, nom: { fr: g(r, "nom_fr"), en: g(r, "nom_en"), ar: g(r, "nom_ar") }, categorie: g(r, "categorie"), prix, prix_barre: pb ? nombre(pb) : null, actif: !/^(non|0|false)$/i.test(g(r, "actif")), variantes: [] };
    if (!existant.nom.fr) return void erreurs.push(`Ligne ${n} : nom_fr vide.`);
    existant.variantes.push({ taille: g(r, "taille") || "Unique", stock });
    map.set(slug, existant);
  });
  return { produits: [...map.values()], erreurs };
}
