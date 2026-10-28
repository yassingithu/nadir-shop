import { Link } from "react-router-dom";
import { Minus, Plus, X } from "lucide-react";
import { useLangue } from "./i18n";
import { useDonnees } from "./donnees";
import { usePanier } from "./panier";
import { detail } from "./calcul";
import Visuel from "./Visuel";

/** Mini-panier qui s'ouvre sur le côté, avec la barre de progression vers la livraison offerte. */
export default function Tiroir() {
  const { t, tr, prix } = useLangue();
  const { produits, reglages } = useDonnees();
  const { lignes, changer, retirer, ouvert, setOuvert } = usePanier();
  const d = detail(lignes, produits, reglages);
  const seuil = reglages.livraison_gratuite_des;
  const reste = seuil != null ? Math.max(0, seuil - d.sous) : 0;
  return (
    <div className={`fixed inset-0 z-50 ${ouvert ? "" : "pointer-events-none"}`} aria-hidden={!ouvert}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${ouvert ? "opacity-100" : "opacity-0"}`} onClick={() => setOuvert(false)} />
      <aside className={`tiroir absolute inset-y-0 end-0 w-full max-w-md bg-white flex flex-col ${ouvert ? "ouvert" : ""}`} role="dialog" aria-label={t("Panier")} data-testid="tiroir">
        <div className="flex items-center justify-between px-5 h-16 border-b trait"><h2 className="font-semibold">{t("Panier")} ({d.items.reduce((s, i) => s + i.l.quantite, 0)})</h2>
          <button onClick={() => setOuvert(false)} aria-label={t("Fermer")}><X className="h-5 w-5" /></button></div>
        {d.items.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center px-6"><div><p className="font-semibold">{t("Votre panier est vide")}</p><button className="btn-plein mt-5" onClick={() => setOuvert(false)}>{t("Continuer mes achats")}</button></div></div>
        ) : (<>
          {seuil != null && (
            <div className="px-5 py-4 border-b trait text-sm">
              <p>{reste > 0 ? t("Il vous manque {montant} pour la livraison offerte", { montant: prix(reste) }) : t("Livraison offerte !")}</p>
              <div className="mt-2 h-1 bg-[#e3e3e3]"><div className="h-full transition-all" style={{ width: `${Math.min(100, (d.sous / seuil) * 100)}%`, background: reste > 0 ? "var(--encre)" : "var(--stock)" }} /></div>
            </div>)}
          <ul className="flex-1 overflow-y-auto px-5 divide-y trait">
            {d.items.map(({ l, p, v, prix: pu }) => (
              <li key={l.variante_id} className="flex gap-4 py-4">
                <Visuel p={p} className="h-28 w-20 shrink-0" />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="font-medium">{tr(p.nom)}</div><div className="opacity-60">{Object.values(v.valeurs).join(" · ")}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center border trait">
                      <button className="h-8 w-8 grid place-items-center" onClick={() => changer(l.variante_id, l.quantite - 1)} aria-label="−"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-7 text-center">{l.quantite}</span>
                      <button className="h-8 w-8 grid place-items-center disabled:opacity-30" disabled={l.quantite >= v.stock} onClick={() => changer(l.variante_id, l.quantite + 1)} aria-label="+"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button className="underline opacity-60 hover:opacity-100" onClick={() => retirer(l.variante_id)}>{t("Retirer")}</button>
                  </div>
                </div>
                <div className="text-sm font-medium whitespace-nowrap">{prix(pu * l.quantite)}</div>
              </li>))}
          </ul>
          <div className="border-t trait p-5 space-y-3">
            <div className="flex justify-between font-semibold"><span>{t("Sous-total")}</span><span>{prix(d.sous)}</span></div>
            <Link to="/commande" onClick={() => setOuvert(false)} className="btn-plein w-full" data-testid="tiroir-commander">{t("Commander")}</Link>
            <Link to="/panier" onClick={() => setOuvert(false)} className="btn-ligne w-full">{t("Voir le panier")}</Link>
          </div>
        </>)}
      </aside>
    </div>
  );
}
