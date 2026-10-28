import { createClient } from "@supabase/supabase-js";
import { CATEGORIES_DEMO, PRODUITS_DEMO, REGLAGES_DEMO } from "./demo";
import type { Categorie, Infos, Ligne, Produit, Reglages } from "./types";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CLE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined; // clé publique uniquement
export const supabase = URL && CLE ? createClient(URL, CLE) : null;
export const modeDemo = !supabase;
export const WHATSAPP_PAR_DEFAUT = "212677859227", EMAIL_PAR_DEFAUT = "contact@swtfamily.com";

const COLS_REGLAGES = "nom_boutique, frais_livraison, livraison_gratuite_des, virement_titulaire, virement_banque, virement_rib, whatsapp";
/** Lit les réglages ; si la base n'a pas encore toutes les colonnes récentes, retombe sur les colonnes de base. */
async function lireReglages() {
  const essais = [COLS_REGLAGES + ", email_contact, instagram, facebook, tiktok, adresse, horaires, textes", COLS_REGLAGES + ", textes", COLS_REGLAGES];
  let derniere;
  for (const cols of essais) { const r = await supabase!.from("reglages").select(cols).eq("id", 1).single(); if (!r.error) return r; derniere = r; }
  return derniere!;
}

export async function charger(): Promise<{ produits: Produit[]; categories: Categorie[]; reglages: Reglages }> {
  if (!supabase) return { produits: PRODUITS_DEMO, categories: CATEGORIES_DEMO, reglages: REGLAGES_DEMO };
  const [p, c, r] = await Promise.all([
    supabase.from("produits").select("id, slug, nom, description, prix, prix_barre, photos, options, categorie:categories(slug), variantes(id, valeurs, prix, stock, actif)").eq("actif", true).order("created_at", { ascending: false }),
    supabase.from("categories").select("slug, nom").eq("actif", true).order("ordre"),
    lireReglages(),
  ]);
  if (p.error || c.error || r.error) throw new Error("chargement");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const produits = (p.data as any[]).map((x) => ({ ...x, categorie: x.categorie?.slug ?? null, couleur: "#d9c7a3", variantes: (x.variantes as { actif: boolean }[]).filter((v) => v.actif) })) as Produit[];
  const reglages = r.data as unknown as Reglages;
  // Ancien nom provisoire : affiche le nom définitif même si la base n'a pas encore été modifiée.
  if (!reglages.nom_boutique || /^nadir shop$/i.test(reglages.nom_boutique.trim())) reglages.nom_boutique = "Sweet Family";
  if (!reglages.whatsapp) reglages.whatsapp = WHATSAPP_PAR_DEFAUT;
  if (!reglages.email_contact) reglages.email_contact = EMAIL_PAR_DEFAUT;
  return { produits, categories: c.data as Categorie[], reglages };
}

export async function passerCommande(infos: Infos, mode: "livraison" | "virement", lignes: Ligne[], langue: string, codePromo = ""): Promise<{ numero: number; total: number }> {
  if (!supabase) return { numero: 1001, total: 0 };
  const { data, error } = await supabase.rpc("passer_commande", { p: { ...infos, mode_paiement: mode, langue, code_promo: codePromo || null, lignes: lignes.map((l) => ({ variante_id: l.variante_id, quantite: l.quantite })) } });
  if (error) throw error;
  return data as { numero: number; total: number };
}

export async function suivre(numero: number, telephone: string) {
  if (!supabase) return { numero, statut: "confirmee", paiement_recu: false, total: 0, mode_paiement: "livraison" };
  const { data, error } = await supabase.rpc("suivre_commande", { p_numero: numero, p_telephone: telephone });
  if (error) throw error;
  return data as { numero: number; statut: string; paiement_recu: boolean; total: number; mode_paiement: string } | null;
}

export type CommandeClient = { numero: number; statut: string; total: number; mode_paiement: string; paiement_recu: boolean; created_at: string; lignes_commande: { nom: string; valeurs: Record<string, string>; quantite: number }[] };
export async function mesCommandes(): Promise<CommandeClient[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("commandes").select("numero, statut, total, mode_paiement, paiement_recu, created_at, lignes_commande(nom, valeurs, quantite)").order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as CommandeClient[];
}

export async function abonnerNewsletter(email: string, langue: string, source = "site"): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("abonner_newsletter", { p_email: email, p_langue: langue, p_source: source });
  if (error) throw error;
}
export async function desabonnerNewsletter(token: string): Promise<boolean> {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc("desabonner_newsletter", { p_token: token });
  if (error) throw error;
  return !!data;
}

export type ResultatPromo = { valide: boolean; message?: string; code?: string | null; remise?: number; frais?: number; type?: string };
const PROMOS_DEMO: Record<string, { type: "pourcentage" | "livraison"; valeur: number }> = { BIENVENUE10: { type: "pourcentage", valeur: 10 }, LIVRAISON: { type: "livraison", valeur: 0 } };
export async function verifierCode(code: string, lignes: Ligne[], sousTotal: number, fraisActuels: number): Promise<ResultatPromo> {
  const k = code.trim().toUpperCase();
  if (!supabase) {
    const c = PROMOS_DEMO[k]; if (!c) return { valide: false, message: "Code promo invalide." };
    return c.type === "livraison" ? { valide: true, code: k, remise: 0, frais: 0 } : { valide: true, code: k, remise: Math.round(sousTotal * c.valeur) / 100, frais: fraisActuels };
  }
  const { data, error } = await supabase.rpc("verifier_code_promo", { p_code: k, p_lignes: lignes.map((l) => ({ variante_id: l.variante_id, quantite: l.quantite })) });
  if (error) throw error;
  return data as ResultatPromo;
}

export type Avis = { id: string; produit_id: string; nom_affiche: string; note: number; titre: string; texte: string; reponse: string | null; created_at: string; produits?: { nom: { fr: string; en?: string; ar?: string }; slug: string } | null };
const AVIS_DEMO: Avis[] = [
  { id: "d1", produit_id: "p1", nom_affiche: "Salma I.", note: 5, titre: "Très beau", texte: "Coton épais et coupe parfaite, livré rapidement. (avis d'exemple)", reponse: null, created_at: "2026-10-01T10:00:00Z" },
  { id: "d2", produit_id: "p1", nom_affiche: "Youssef B.", note: 4, titre: "Bon rapport qualité-prix", texte: "Conforme aux photos, je recommande. (avis d'exemple)", reponse: "Merci Youssef !", created_at: "2026-10-05T10:00:00Z" },
];
export async function avisPublies(produitId?: string): Promise<Avis[]> {
  if (!supabase) return produitId ? AVIS_DEMO.filter((a) => a.produit_id === produitId) : AVIS_DEMO;
  let q = supabase.from("avis").select("id, produit_id, nom_affiche, note, titre, texte, reponse, created_at, produits(nom, slug)").eq("statut", "publie").order("created_at", { ascending: false }).limit(100);
  if (produitId) q = q.eq("produit_id", produitId);
  const { data, error } = await q; if (error) throw error;
  return data as unknown as Avis[];
}
export async function peutDonnerAvis(produitId: string): Promise<{ connecte: boolean; a_achete: boolean; deja: boolean }> {
  if (!supabase) return { connecte: true, a_achete: true, deja: false };
  const { data, error } = await supabase.rpc("peut_donner_avis", { p_produit: produitId }); if (error) throw error;
  return data as { connecte: boolean; a_achete: boolean; deja: boolean };
}
export async function laisserAvis(produitId: string, note: number, titre: string, texte: string, nom: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc("laisser_avis", { p_produit: produitId, p_note: note, p_titre: titre, p_texte: texte, p_nom: nom }); if (error) throw error;
}

/** Comptage des visites : sans cookie ; l'identifiant anonyme change chaque jour. */
export async function enregistrerVisite(chemin: string, langue: string): Promise<void> {
  if (!supabase || typeof navigator === "undefined" || /bot|crawl|spider|slurp|preview|facebookexternalhit/i.test(navigator.userAgent) || /Electron\//.test(navigator.userAgent)) return;
  try {
    const jour = new Date().toISOString().slice(0, 10); let id = "";
    try { const v = JSON.parse(localStorage.getItem("vid") || "null"); if (v?.jour === jour) id = v.id; } catch { /* ignoré */ }
    if (!id) { id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now()).replace(/-/g, "").slice(0, 32); try { localStorage.setItem("vid", JSON.stringify({ jour, id })); } catch { /* ignoré */ } }
    let source: string | null = null;
    try { if (!sessionStorage.getItem("vsrc")) { sessionStorage.setItem("vsrc", "1"); const h = document.referrer ? new globalThis.URL(document.referrer).hostname.replace(/^www\./, "") : ""; source = h && h !== location.hostname.replace(/^www\./, "") ? h : null; } } catch { /* ignoré */ }
    await supabase.rpc("enregistrer_visite", { p_visiteur: id, p_chemin: chemin, p_langue: langue, p_source: source });
  } catch { /* le comptage ne doit jamais gêner le site */ }
}
