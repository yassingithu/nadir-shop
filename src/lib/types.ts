import type { Tr } from "./i18n";
export type Option = { cle: string; nom: Tr };
export type Variante = { id: string; valeurs: Record<string, string>; prix: number | null; stock: number };
export type Produit = {
  id: string; slug: string; categorie: string | null; nom: Tr; description: Tr; prix: number; prix_barre: number | null;
  couleur: string; options: Option[]; variantes: Variante[];
};
export type Categorie = { slug: string; nom: Tr };
export type Reglages = { nom_boutique: string; frais_livraison: number; livraison_gratuite_des: number | null; virement_titulaire: string; virement_banque: string; virement_rib: string; whatsapp: string; telephone?: string; email_contact?: string; instagram?: string; facebook?: string; tiktok?: string; adresse?: string; horaires?: string; textes?: Record<string, { fr?: string; en?: string; ar?: string }> };
export type Ligne = { variante_id: string; produit_id: string; quantite: number };
export type Infos = { nom: string; telephone: string; email: string; ville: string; adresse: string; note: string };
