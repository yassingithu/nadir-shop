import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { LangueProvider, useLangue, type Langue } from "./lib/i18n";
import { PanierProvider, usePanier } from "./lib/panier";
import { DonneesProvider, useDonnees } from "./lib/donnees";
import { modeDemo } from "./lib/api";
import Boutique from "./pages/Boutique";
import ProduitPage from "./pages/ProduitPage";
import PanierPage from "./pages/PanierPage";
import CommandePage from "./pages/CommandePage";
import SuiviPage from "./pages/SuiviPage";

const LANGUES: [Langue, string][] = [["fr", "FR"], ["en", "EN"], ["ar", "ع"]];

function Entete() {
  const { langue, setLangue, t } = useLangue();
  const { nombre } = usePanier();
  const { reglages } = useDonnees();
  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur bg-[#f6f1e9]/90" style={{ borderColor: "var(--trait)" }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="titre text-2xl" data-testid="logo">{reglages.nom_boutique}</Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link to="/suivi" className="hidden sm:inline px-3 py-2 opacity-70 hover:opacity-100">{t("Suivre ma commande")}</Link>
          <div className="flex rounded-full border overflow-hidden" style={{ borderColor: "var(--trait)" }} role="group" aria-label="Langue">
            {LANGUES.map(([l, n]) => <button key={l} onClick={() => setLangue(l)} aria-pressed={langue === l} data-testid={`langue-${l}`} className={`px-3 h-9 text-xs font-medium ${langue === l ? "text-white" : ""}`} style={langue === l ? { background: "var(--encre)" } : undefined}>{n}</button>)}
          </div>
          <Link to="/panier" className="relative grid place-items-center h-10 w-10 rounded-full" aria-label={t("Panier")} data-testid="panier-lien">
            <ShoppingBag className="h-5 w-5" />
            {nombre > 0 && <span className="absolute -top-0.5 -end-0.5 h-5 min-w-5 px-1 rounded-full text-[11px] text-white grid place-items-center" style={{ background: "var(--accent)" }} data-testid="panier-nombre">{nombre}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Pied() {
  const { t } = useLangue();
  const { reglages } = useDonnees();
  return (
    <footer className="mt-20 border-t py-8 text-sm text-center opacity-70" style={{ borderColor: "var(--trait)" }}>
      {reglages.whatsapp && <a className="underline" href={`https://wa.me/${reglages.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{t("Une question ? Écrivez-nous sur WhatsApp")}</a>}
      <p className="mt-2">© {new Date().getFullYear()} {reglages.nom_boutique}</p>
    </footer>
  );
}

export default function App() {
  return (
    <LangueProvider><DonneesProvider><PanierProvider>
      <BrowserRouter>
        <Entete />
        <LangueBandeau />
        <main className="max-w-6xl mx-auto px-4 pt-8">
          <Routes>
            <Route path="/" element={<Boutique />} />
            <Route path="/produit/:slug" element={<ProduitPage />} />
            <Route path="/panier" element={<PanierPage />} />
            <Route path="/commande" element={<CommandePage />} />
            <Route path="/suivi" element={<SuiviPage />} />
          </Routes>
        </main>
        <Pied />
      </BrowserRouter>
    </PanierProvider></DonneesProvider></LangueProvider>
  );
}

function LangueBandeau() {
  const { t } = useLangue();
  return modeDemo ? <div className="text-center text-xs py-1.5 text-white" style={{ background: "var(--encre)" }}>{t("Mode démonstration : les produits et commandes ne sont pas enregistrés.")}</div> : null;
}
