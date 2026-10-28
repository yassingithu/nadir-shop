import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { charger } from "./api";
import type { Categorie, Produit, Reglages } from "./types";

type D = { produits: Produit[]; categories: Categorie[]; reglages: Reglages; etat: "chargement" | "ok" | "erreur" };
const C = createContext<D>(null as unknown as D);
const VIDE: Reglages = { nom_boutique: "Nadir Shop", frais_livraison: 0, livraison_gratuite_des: null, virement_titulaire: "", virement_banque: "", virement_rib: "", whatsapp: "" };

export function DonneesProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<D>({ produits: [], categories: [], reglages: VIDE, etat: "chargement" });
  useEffect(() => { charger().then((x) => setD({ ...x, etat: "ok" })).catch(() => setD((o) => ({ ...o, etat: "erreur" }))); }, []);
  return <C.Provider value={d}>{children}</C.Provider>;
}
export const useDonnees = () => useContext(C);
