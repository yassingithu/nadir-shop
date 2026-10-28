import { createClient } from "@supabase/supabase-js";
import { CATEGORIES_DEMO, PRODUITS_DEMO, REGLAGES_DEMO } from "./demo";
import type { Categorie, Infos, Ligne, Produit, Reglages } from "./types";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CLE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined; // clé publique uniquement
export const supabase = URL && CLE ? createClient(URL, CLE) : null;
export const modeDemo = !supabase;

const COLS_REGLAGES = "nom_boutique, frais_livraison, livraison_gratuite_des, virement_titulaire, virement_banque, virement_rib, whatsapp";

export async function charger(): Promise<{ produits: Produit[]; categories: Categorie[]; reglages: Reglages }> {
  if (!supabase) return { produits: PRODUITS_DEMO, categories: CATEGORIES_DEMO, reglages: REGLAGES_DEMO };
  const [p, c, r] = await Promise.all([
    supabase.from("produits").select("id, slug, nom, description, prix, prix_barre, photos, options, categorie:categories(slug), variantes(id, valeurs, prix, stock, actif)").eq("actif", true).order("created_at", { ascending: false }),
    supabase.from("categories").select("slug, nom").eq("actif", true).order("ordre"),
    supabase.from("reglages").select(COLS_REGLAGES + ", textes").eq("id", 1).single().then(async (x) => (x.error ? await supabase!.from("reglages").select(COLS_REGLAGES).eq("id", 1).single() : x)),
  ]);
  if (p.error || c.error || r.error) throw new Error("chargement");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const produits = (p.data as any[]).map((x) => ({ ...x, categorie: x.categorie?.slug ?? null, couleur: "#d9c7a3", variantes: (x.variantes as { actif: boolean }[]).filter((v) => v.actif) })) as Produit[];
  const reglages = r.data as unknown as Reglages;
  // Ancien nom provisoire : affiche le nom définitif même si la base n'a pas encore été modifiée.
  if (!reglages.nom_boutique || /^nadir shop$/i.test(reglages.nom_boutique.trim())) reglages.nom_boutique = "Sweet Family";
  return { produits, categories: c.data as Categorie[], reglages };
}

export async function passerCommande(infos: Infos, mode: "livraison" | "virement", lignes: Ligne[], langue: string): Promise<{ numero: number; total: number }> {
  if (!supabase) return { numero: 1001, total: 0 };
  const { data, error } = await supabase.rpc("passer_commande", { p: { ...infos, mode_paiement: mode, langue, lignes: lignes.map((l) => ({ variante_id: l.variante_id, quantite: l.quantite })) } });
  if (error) throw error;
  return data as { numero: number; total: number };
}

export async function suivre(numero: number, telephone: string) {
  if (!supabase) return { numero, statut: "confirmee", paiement_recu: false, total: 0, mode_paiement: "livraison" };
  const { data, error } = await supabase.rpc("suivre_commande", { p_numero: numero, p_telephone: telephone });
  if (error) throw error;
  return data as { numero: number; statut: string; paiement_recu: boolean; total: number; mode_paiement: string } | null;
}
