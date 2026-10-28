import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { supabase, modeDemo } from "../lib/api";
import { LayoutDashboard, Package, ShoppingCart, Tags, Settings, LogOut, Type } from "lucide-react";
import Tableau from "./Tableau";
import Produits from "./Produits";
import ProduitEdit from "./ProduitEdit";
import Commandes from "./Commandes";
import { Categories, Reglages, TextesSite } from "./Divers";

type Etat = "chargement" | "deconnecte" | "refuse" | "ok";

function Connexion({ erreur }: { erreur?: string }) {
  const [email, setEmail] = useState(""), [mdp, setMdp] = useState(""), [msg, setMsg] = useState(erreur ?? ""), [envoi, setEnvoi] = useState(false);
  const valider = async (e: React.FormEvent) => {
    e.preventDefault(); setEnvoi(true); setMsg("");
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password: mdp });
    if (error) setMsg("E-mail ou mot de passe incorrect."); setEnvoi(false);
  };
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-[#f4f4f4]">
      <form onSubmit={valider} className="w-full max-w-sm bg-white p-8 space-y-4 border trait" data-testid="connexion">
        <h1 className="text-2xl font-bold">Administration</h1>
        <label className="block text-sm"><span className="font-medium">E-mail</span><input className="champ mt-1" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email" /></label>
        <label className="block text-sm"><span className="font-medium">Mot de passe</span><input className="champ mt-1" type="password" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} data-testid="admin-mdp" /></label>
        {msg && <p className="text-sm" style={{ color: "var(--promo)" }} role="alert">{msg}</p>}
        <button className="btn-plein w-full" disabled={!email || !mdp || envoi} data-testid="admin-connecter">Se connecter</button>
      </form>
    </div>
  );
}

export default function AdminApp() {
  const [etat, setEtat] = useState<Etat>("chargement");
  // Rend l'administration « installable » sur téléphone et ordinateur (icône sur l'écran d'accueil), sans toucher à la boutique.
  useEffect(() => {
    const liens = [["manifest", "/gestion.webmanifest"], ["apple-touch-icon", "/icone-180.png"]].map(([rel, href]) => { const l = document.createElement("link"); l.rel = rel; l.href = href; document.head.appendChild(l); return l; });
    const m = document.createElement("meta"); m.name = "theme-color"; m.content = "#1f6b7a"; document.head.appendChild(m);
    const ro = document.createElement("meta"); ro.name = "robots"; ro.content = "noindex, nofollow"; document.head.appendChild(ro);
    const titre = document.title; document.title = "Sweet Family Gestion";
    return () => { [...liens, m, ro].forEach((x) => x.remove()); document.title = titre; };
  }, []);
  useEffect(() => {
    if (!supabase) return;
    const verifier = async () => {
      const { data } = await supabase!.auth.getSession();
      if (!data.session) return setEtat("deconnecte");
      const { data: l } = await supabase!.from("equipe").select("user_id").eq("user_id", data.session.user.id).maybeSingle();
      setEtat(l ? "ok" : "refuse");
    };
    void verifier();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void verifier(); });
    return () => sub.subscription.unsubscribe();
  }, []);
  if (modeDemo) return <div className="min-h-screen grid place-items-center p-6 text-center"><p>L'administration demande la connexion à la base : le fichier <code>.env</code> n'est pas configuré.</p></div>;
  if (etat === "chargement") return <div className="min-h-screen grid place-items-center opacity-60">…</div>;
  if (etat === "deconnecte") return <Connexion />;
  if (etat === "refuse") return <div className="min-h-screen grid place-items-center p-6 text-center"><div><p className="font-semibold">Ce compte n'a pas accès à l'administration.</p><button className="btn-ligne mt-4" onClick={() => supabase!.auth.signOut()}>Changer de compte</button></div></div>;
  return <Coque />;
}

function Coque() {
  const lien = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 px-4 h-11 text-sm ${isActive ? "bg-black text-white font-semibold" : "hover:bg-[#ececec]"}`;
  const item = (to: string, icone: ReactNode, nom: string, end = false) => <NavLink to={to} end={end} className={lien}>{icone}{nom}</NavLink>;
  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_1fr]">
      <aside className="bg-[#f4f4f4] border-e trait md:min-h-screen no-print">
        <div className="px-4 h-16 flex items-center gap-3 font-bold tracking-[0.12em] uppercase text-sm"><img src="/logo.png" alt="" className="h-9 w-auto" />Sweet Family</div>
        <nav className="flex md:block overflow-x-auto" aria-label="Administration">
          {item("/admin", <LayoutDashboard className="h-4 w-4" />, "Tableau de bord", true)}
          {item("/admin/produits", <Package className="h-4 w-4" />, "Produits")}
          {item("/admin/commandes", <ShoppingCart className="h-4 w-4" />, "Commandes")}
          {item("/admin/categories", <Tags className="h-4 w-4" />, "Catégories")}
          {item("/admin/reglages", <Settings className="h-4 w-4" />, "Réglages")}
          {item("/admin/textes", <Type className="h-4 w-4" />, "Textes du site")}
        </nav>
        <div className="p-4 text-sm space-y-2 hidden md:block">
          <Link to="/" target="_blank" className="underline block">Voir la boutique</Link>
          <button className="flex items-center gap-2 opacity-70 hover:opacity-100" onClick={() => supabase!.auth.signOut()} data-testid="deconnexion"><LogOut className="h-4 w-4" />Se déconnecter</button>
        </div>
      </aside>
      <main className="p-4 sm:p-8 max-w-6xl w-full">
        <Routes>
          <Route index element={<Tableau />} />
          <Route path="produits" element={<Produits />} />
          <Route path="produits/:id" element={<ProduitEdit />} />
          <Route path="commandes" element={<Commandes />} />
          <Route path="categories" element={<Categories />} />
          <Route path="reglages" element={<Reglages />} />
          <Route path="textes" element={<TextesSite />} />
        </Routes>
      </main>
    </div>
  );
}
