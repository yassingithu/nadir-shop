import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./api";

export type Profil = { nom: string; telephone: string; ville: string; adresse: string };
export type Utilisateur = { id: string; email: string; profil: Profil };
type Ctx = {
  user: Utilisateur | null; pret: boolean; recuperation: boolean;
  inscrire: (d: { email: string; mdp: string; nom: string; telephone: string }) => Promise<"connecte" | "verifier">;
  connecter: (email: string, mdp: string) => Promise<void>;
  deconnecter: () => Promise<void>;
  oubli: (email: string) => Promise<void>;
  nouveauMdp: (mdp: string) => Promise<void>;
  majProfil: (p: Profil) => Promise<void>;
};
const C = createContext<Ctx>(null as unknown as Ctx);
const VIDE: Profil = { nom: "", telephone: "", ville: "", adresse: "" };
const CLE_DEMO = "demo_compte";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function depuisSupabase(u: any): Utilisateur | null {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  return { id: u.id, email: u.email ?? "", profil: { nom: m.nom ?? "", telephone: m.telephone ?? "", ville: m.ville ?? "", adresse: m.adresse ?? "" } };
}
function lireDemo(): Utilisateur | null { try { return JSON.parse(localStorage.getItem(CLE_DEMO) || "null"); } catch { return null; } }
function ecrireDemo(u: Utilisateur | null) { try { if (u) localStorage.setItem(CLE_DEMO, JSON.stringify(u)); else localStorage.removeItem(CLE_DEMO); } catch { /* ignoré */ } }

export function ComptesProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(supabase ? null : lireDemo());
  const [pret, setPret] = useState(!supabase);
  const [recuperation, setRecuperation] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setUser(depuisSupabase(data.session?.user)); setPret(true); });
    const { data } = supabase.auth.onAuthStateChange((evt, s) => { if (evt === "PASSWORD_RECOVERY") setRecuperation(true); setUser(depuisSupabase(s?.user)); setPret(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const valeur: Ctx = {
    user, pret, recuperation,
    inscrire: async ({ email, mdp, nom, telephone }) => {
      if (!supabase) { const u = { id: "demo", email, profil: { ...VIDE, nom, telephone } }; ecrireDemo(u); setUser(u); return "connecte"; }
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: mdp, options: { data: { nom, telephone }, emailRedirectTo: location.origin + "/compte" } });
      if (error) throw error;
      // Adresse déjà inscrite : Supabase renvoie un utilisateur sans identité, sans erreur
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error("User already registered");
      return data.session ? "connecte" : "verifier";
    },
    connecter: async (email, mdp) => {
      if (!supabase) { const u = lireDemo() ?? { id: "demo", email, profil: VIDE }; ecrireDemo(u); setUser(u); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp }); if (error) throw error;
    },
    deconnecter: async () => { if (!supabase) { ecrireDemo(null); setUser(null); return; } await supabase.auth.signOut(); },
    oubli: async (email) => { if (!supabase) return; const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin + "/compte" }); if (error) throw error; },
    nouveauMdp: async (mdp) => { if (!supabase) return; const { error } = await supabase.auth.updateUser({ password: mdp }); if (error) throw error; setRecuperation(false); },
    majProfil: async (p) => {
      if (!supabase) { const u = { ...(user as Utilisateur), profil: p }; ecrireDemo(u); setUser(u); return; }
      const { data, error } = await supabase.auth.updateUser({ data: p }); if (error) throw error; setUser(depuisSupabase(data.user));
    },
  };
  return <C.Provider value={valeur}>{children}</C.Provider>;
}
export const useCompte = () => useContext(C);

/** Traduit les erreurs techniques en phrases claires (clés du dictionnaire de la boutique). */
export function messageErreur(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  if (/Invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/already registered|already been registered/i.test(m)) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
  if (/at least|weak/i.test(m)) return "Mot de passe trop court : 8 caractères minimum.";
  if (/rate limit|too many|seconds/i.test(m)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (/not confirmed/i.test(m)) return "Confirmez d'abord votre e-mail (lien reçu par e-mail).";
  return "Une erreur est survenue. Réessayez.";
}
