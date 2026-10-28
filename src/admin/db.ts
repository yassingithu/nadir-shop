import { supabase } from "../lib/api";
import type { Tr } from "../lib/i18n";

export type Cat = { id: string; slug: string; nom: Tr; ordre: number; actif: boolean };
export type Var = { id: string; produit_id: string; sku: string | null; valeurs: Record<string, string>; prix: number | null; stock: number; actif: boolean };
export type Prod = { id: string; slug: string; categorie_id: string | null; nom: Tr; description: Tr; prix: number; prix_barre: number | null; photos: string[]; options: { cle: string; nom: Tr }[]; actif: boolean };
export type Cmd = { id: string; numero: number; nom: string; telephone: string; email: string | null; ville: string; adresse: string; note: string | null; mode_paiement: string; statut: string; paiement_recu: boolean; sous_total: number; frais_livraison: number; total: number; code_promo?: string | null; remise?: number; created_at: string };
export type LigneCmd = { id: string; commande_id: string; variante_id: string | null; nom: string; valeurs: Record<string, string>; prix_unitaire: number; quantite: number };
export type Reg = { nom_boutique: string; devise: string; frais_livraison: number; livraison_gratuite_des: number | null; virement_titulaire: string; virement_banque: string; virement_rib: string; telephone: string; whatsapp: string; seuil_stock_bas: number; email_contact?: string; instagram?: string; facebook?: string; tiktok?: string; adresse?: string; horaires?: string; newsletter_expediteur?: string; bienvenue_actif?: boolean; bienvenue_sujet?: string; bienvenue_texte?: string };

export const sb = () => { if (!supabase) throw new Error("Supabase non configuré (fichier .env manquant)"); return supabase; };
/** Lève une erreur lisible si Supabase répond par une erreur. */
export async function ok<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p; if (error) throw new Error(error.message); return data as T;
}
export const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "produit";
