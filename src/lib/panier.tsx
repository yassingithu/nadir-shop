import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Ligne } from "./types";

type Ctx = { lignes: Ligne[]; ajouter: (l: Ligne) => void; changer: (id: string, q: number) => void; retirer: (id: string) => void; vider: () => void; nombre: number };
const C = createContext<Ctx>(null as unknown as Ctx);
const lire = (): Ligne[] => { try { return JSON.parse(localStorage.getItem("panier") || "[]"); } catch { return []; } };

export function PanierProvider({ children }: { children: ReactNode }) {
  const [lignes, setLignes] = useState<Ligne[]>(lire);
  useEffect(() => { try { localStorage.setItem("panier", JSON.stringify(lignes)); } catch { /* ignoré */ } }, [lignes]);
  const ajouter = (l: Ligne) => setLignes((a) => a.some((x) => x.variante_id === l.variante_id) ? a.map((x) => x.variante_id === l.variante_id ? { ...x, quantite: x.quantite + l.quantite } : x) : [...a, l]);
  const changer = (id: string, q: number) => setLignes((a) => a.map((x) => x.variante_id === id ? { ...x, quantite: Math.max(1, Math.min(99, q)) } : x));
  const retirer = (id: string) => setLignes((a) => a.filter((x) => x.variante_id !== id));
  return <C.Provider value={{ lignes, ajouter, changer, retirer, vider: () => setLignes([]), nombre: lignes.reduce((s, l) => s + l.quantite, 0) }}>{children}</C.Provider>;
}
export const usePanier = () => useContext(C);
