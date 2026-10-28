import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { useDonnees } from "../lib/donnees";
import { usePanier } from "../lib/panier";
import { detail } from "../lib/calcul";
import Visuel from "../lib/Visuel";

export default function PanierPage() {
  const { t, tr, prix } = useLangue();
  useSeo({ titre: t("Panier") + " | Sweet Family", noindex: true });
  const { produits, reglages } = useDonnees();
  const { lignes, changer, retirer } = usePanier();
  const d = detail(lignes, produits, reglages);
  if (!d.items.length) return (
    <div className="text-center py-16"><p className="font-bold text-2xl">{t("Votre panier est vide")}</p><Link to="/" className="btn-plein mt-6">{t("Continuer mes achats")}</Link></div>
  );
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-10">
      <ul className="divide-y trait">
        {d.items.map(({ l, p, v, prix: pu }) => (
          <li key={l.variante_id} className="flex gap-4 py-5" data-testid="ligne-panier">
            <Visuel p={p} className="h-24 w-20 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{tr(p.nom)}</div>
              <div className="text-sm opacity-60">{Object.values(v.valeurs).join(" · ")}</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center border trait" aria-label={t("Quantité")}>
                  <button className="h-9 w-9 grid place-items-center" onClick={() => changer(l.variante_id, l.quantite - 1)} aria-label="−"><Minus className="h-4 w-4" /></button>
                  <span className="w-8 text-center text-sm" data-testid="quantite">{l.quantite}</span>
                  <button className="h-9 w-9 grid place-items-center disabled:opacity-30" disabled={l.quantite >= v.stock} onClick={() => changer(l.variante_id, l.quantite + 1)} aria-label="+"><Plus className="h-4 w-4" /></button>
                </div>
                <button className="opacity-50 hover:opacity-100" onClick={() => retirer(l.variante_id)} aria-label={t("Retirer")}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="font-medium whitespace-nowrap">{prix(pu * l.quantite)}</div>
          </li>
        ))}
      </ul>
      <aside className="rounded-2xl bg-[#f4f4f4] p-6 h-fit space-y-3">
        <Ligne a={t("Sous-total")} b={prix(d.sous)} />
        <Ligne a={t("Livraison")} b={d.frais === 0 ? t("Gratuite") : prix(d.frais)} />
        <div className="border-t pt-3 trait"><Ligne a={t("Total")} b={prix(d.total)} fort /></div>
        <Link to="/commande" className="btn-plein w-full mt-2" data-testid="commander">{t("Commander")}</Link>
      </aside>
    </div>
  );
}
const Ligne = ({ a, b, fort }: { a: string; b: string; fort?: boolean }) => <div className={`flex justify-between ${fort ? "font-semibold text-lg" : "text-sm"}`}><span>{a}</span><span data-testid={fort ? "total" : undefined}>{b}</span></div>;
