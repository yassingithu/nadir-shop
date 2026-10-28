import { useEffect, useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { LangueProvider, useLangue, type Langue } from "./lib/i18n";
import { PanierProvider, usePanier } from "./lib/panier";
import { DonneesProvider, useDonnees } from "./lib/donnees";
import { modeDemo } from "./lib/api";
import Tiroir from "./lib/Tiroir";
import Accueil from "./pages/Accueil";
import Boutique from "./pages/Boutique";
import ProduitPage from "./pages/ProduitPage";
import PanierPage from "./pages/PanierPage";
import CommandePage from "./pages/CommandePage";
import SuiviPage from "./pages/SuiviPage";
import AdminApp from "./admin/AdminApp";

const EMAIL_CONTACT = "contact@swtfamily.com";
const LANGUES: [Langue, string][] = [["fr", "FR"], ["en", "EN"], ["ar", "عربي"]];

/** Dans l'application de bureau : barre pour revenir à l'administration quand on regarde la boutique. */
const dansAppli = typeof navigator !== "undefined" && /Electron\//.test(navigator.userAgent);
function BarreRetour() {
  if (!dansAppli) return null;
  return (
    <div className="flex items-center gap-4 px-4 h-10 text-sm border-b trait bg-[#fff8e1] no-print" data-testid="barre-retour">
      <Link to="/admin" className="font-semibold underline">← Retour à l'administration</Link>
      <span className="opacity-60 hidden sm:inline">Vous regardez la boutique comme vos clients.</span>
    </div>
  );
}

function Annonce() {
  const { t, prix } = useLangue();
  const { reglages } = useDonnees();
  const s = reglages.livraison_gratuite_des;
  return (<>
    <BarreRetour />
    <div className="text-white text-xs text-center py-2 px-4" style={{ background: "var(--marque)" }}>
      {modeDemo ? t("Mode démonstration : les produits et commandes ne sont pas enregistrés.") : s != null ? t("Livraison offerte dès {n}", { n: prix(s) }) + " · " + t("Paiement à la livraison ou par virement") : t("Paiement à la livraison ou par virement")}
    </div></>
  );
}

function Entete() {
  const { langue, setLangue, t, tr } = useLangue();
  const { nombre, setOuvert } = usePanier();
  const { reglages, categories } = useDonnees();
  const [menu, setMenu] = useState(false);
  const [rech, setRech] = useState(false);
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { setMenu(false); setRech(false); }, [loc.pathname, loc.search]);
  const lien = "px-1 py-5 text-sm font-medium border-b-2 border-transparent hover:border-black";
  const chercher = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) nav(`/boutique?q=${encodeURIComponent(q.trim())}`); };
  return (
    <header className="sticky top-0 z-30 bg-white border-b trait">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <button className="lg:hidden" onClick={() => setMenu(true)} aria-label={t("Menu")} data-testid="menu-ouvrir"><Menu className="h-6 w-6" /></button>
        <Link to="/" className="flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-lg font-bold tracking-[0.06em] sm:tracking-[0.16em] uppercase whitespace-nowrap" style={{ color: "var(--marque)" }} data-testid="logo"><img src="/logo.png" alt="" className="h-7 sm:h-10 w-auto" />{reglages.nom_boutique}</Link>
        <nav className="hidden lg:flex items-center gap-7 ms-8" aria-label="Catégories">
          <NavLink to="/boutique?nouveautes=1" className={lien}>{t("Nouveautés")}</NavLink>
          {categories.map((c) => <NavLink key={c.slug} to={`/boutique?cat=${c.slug}`} className={lien} data-testid={`nav-${c.slug}`}>{tr(c.nom)}</NavLink>)}
          <NavLink to="/boutique?promo=1" className={`${lien} text-[var(--promo)]`}>{t("Promotions")}</NavLink>
        </nav>
        <div className="ms-auto flex items-center gap-1 sm:gap-3">
          <form onSubmit={chercher} className="hidden md:flex items-center border-b border-black/60 focus-within:border-black">
            <Search className="h-4 w-4 opacity-60" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher un produit")} aria-label={t("Rechercher un produit")} className="w-44 h-9 ps-2 text-sm bg-transparent focus:outline-none" data-testid="recherche" />
          </form>
          <button className="md:hidden h-10 w-10 grid place-items-center" onClick={() => setRech(!rech)} aria-label={t("Rechercher un produit")}><Search className="h-5 w-5" /></button>
          <div className="flex text-xs" role="group" aria-label="Langue">
            {LANGUES.map(([l, n]) => <button key={l} onClick={() => setLangue(l)} aria-pressed={langue === l} data-testid={`langue-${l}`} className={`px-2 h-9 ${langue === l ? "font-bold underline underline-offset-4" : "opacity-60"}`}>{n}</button>)}
          </div>
          <button onClick={() => setOuvert(true)} className="relative grid place-items-center h-10 w-10" aria-label={t("Panier")} data-testid="panier-lien">
            <ShoppingBag className="h-5 w-5" />
            {nombre > 0 && <span className="absolute top-0.5 end-0 h-4 min-w-4 px-1 rounded-full text-[10px] text-white grid place-items-center bg-[var(--marque)]" data-testid="panier-nombre">{nombre}</span>}
          </button>
        </div>
      </div>
      {rech && <form onSubmit={chercher} className="md:hidden border-t trait px-4 py-3"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher un produit")} className="champ" /></form>}
      {menu && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto" data-testid="menu-mobile">
          <div className="flex items-center justify-between px-4 h-16 border-b trait"><span className="font-bold tracking-[0.18em] uppercase">{reglages.nom_boutique}</span><button onClick={() => setMenu(false)} aria-label={t("Fermer")}><X className="h-6 w-6" /></button></div>
          <ul className="px-4 divide-y trait text-lg">
            <li><Link className="block py-4" to="/boutique?nouveautes=1">{t("Nouveautés")}</Link></li>
            {categories.map((c) => <li key={c.slug}><Link className="block py-4" to={`/boutique?cat=${c.slug}`}>{tr(c.nom)}</Link></li>)}
            <li><Link className="block py-4" style={{ color: "var(--promo)" }} to="/boutique?promo=1">{t("Promotions")}</Link></li>
            <li><Link className="block py-4 text-base" to="/suivi">{t("Suivre ma commande")}</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
}

function Pied() {
  const { t, tr } = useLangue();
  const { reglages, categories } = useDonnees();
  const col = "space-y-2.5 text-sm";
  return (
    <footer className="mt-24 bg-[var(--gris)]">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1"><p className="flex items-center gap-3 text-lg font-bold tracking-[0.18em] uppercase"><img src="/logo.png" alt="" className="h-10 w-auto" />{reglages.nom_boutique}</p><p className="mt-3 text-sm opacity-70 max-w-xs">{t("Commande sécurisée : vous ne payez qu'à la livraison ou après votre virement.")}</p></div>
        <ul className={col}><li className="font-semibold">{t("Boutique")}</li>{categories.map((c) => <li key={c.slug}><Link className="hover:underline" to={`/boutique?cat=${c.slug}`}>{tr(c.nom)}</Link></li>)}<li><Link className="hover:underline" to="/boutique?promo=1">{t("Promotions")}</Link></li></ul>
        <ul className={col}><li className="font-semibold">{t("Aide")}</li><li><Link className="hover:underline" to="/suivi">{t("Suivre ma commande")}</Link></li>
          <li><a className="hover:underline" href={`mailto:${EMAIL_CONTACT}`} data-testid="email-contact" dir="ltr">{EMAIL_CONTACT}</a></li>
          {reglages.whatsapp && <li><a className="hover:underline" href={`https://wa.me/${reglages.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a></li>}</ul>
        <ul className={col}><li className="font-semibold">{t("Modes de paiement")}</li><li>{t("Paiement à la livraison")}</li><li>{t("Virement bancaire")}</li></ul>
      </div>
      <div className="border-t trait py-5 text-center text-xs opacity-60">© {new Date().getFullYear()} {reglages.nom_boutique}<Link to="/admin" rel="nofollow" className="ms-4 opacity-50 hover:opacity-100 hover:underline" data-testid="lien-admin">Admin</Link></div>
    </footer>
  );
}

export default function App() {
  return (
    <LangueProvider><DonneesProvider><PanierProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Boutique_ />} />
        </Routes>
      </BrowserRouter>
    </PanierProvider></DonneesProvider></LangueProvider>
  );
}

function Boutique_() {
  return (
      <>
        <Annonce />
        <Entete />
        <Tiroir />
        <main className="max-w-7xl mx-auto px-4 pt-6 sm:pt-8">
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/boutique" element={<Boutique />} />
            <Route path="/produit/:slug" element={<ProduitPage />} />
            <Route path="/panier" element={<PanierPage />} />
            <Route path="/commande" element={<CommandePage />} />
            <Route path="/suivi" element={<SuiviPage />} />
          </Routes>
        </main>
        <Pied />
      </>
  );
}
