import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useLangue } from "../lib/i18n";
import { useDonnees } from "../lib/donnees";
import { usePanier } from "../lib/panier";
import Visuel from "../lib/Visuel";

export default function ProduitPage() {
  const { slug } = useParams();
  const { t, tr, prix } = useLangue();
  const { produits } = useDonnees();
  const { ajouter } = usePanier();
  const nav = useNavigate();
  const p = produits.find((x) => x.slug === slug);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [ok, setOk] = useState(false);
  if (!p) return <p className="opacity-60">…</p>;
  const complet = p.options.every((o) => choix[o.cle]);
  const variante = complet ? p.variantes.find((v) => p.options.every((o) => v.valeurs[o.cle] === choix[o.cle])) : undefined;
  const stock = variante?.stock ?? 0;
  const dispo = (cle: string, val: string) => p.variantes.some((v) => v.valeurs[cle] === val && v.stock > 0 && Object.entries(choix).every(([k, x]) => k === cle || v.valeurs[k] === x));
  const valeurs = (cle: string) => [...new Set(p.variantes.map((v) => v.valeurs[cle]))];
  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
      <Link to="/" className="md:hidden text-sm opacity-60">←</Link>
      <Visuel p={p} className="rounded-3xl aspect-[4/5] w-full" />
      <div>
        <h1 className="titre text-3xl sm:text-4xl">{tr(p.nom)}</h1>
        <p className="mt-3 text-xl"><span className="font-medium">{prix(variante?.prix ?? p.prix)}</span>{p.prix_barre && <span className="ms-3 line-through opacity-50 text-base">{prix(p.prix_barre)}</span>}</p>
        <p className="mt-5 leading-relaxed opacity-80">{tr(p.description)}</p>
        {p.options.map((o) => (
          <div key={o.cle} className="mt-6">
            <div className="text-sm font-medium mb-2">{tr(o.nom)}</div>
            <div className="flex flex-wrap gap-2">
              {valeurs(o.cle).map((val) => {
                const ok2 = dispo(o.cle, val), on = choix[o.cle] === val;
                return <button key={val} disabled={!ok2} onClick={() => setChoix({ ...choix, [o.cle]: val })} data-testid={`option-${o.cle}-${val}`}
                  className={`min-w-12 h-11 px-4 rounded-xl border text-sm disabled:opacity-35 disabled:line-through ${on ? "text-white" : ""}`} style={on ? { background: "var(--encre)" } : { borderColor: "var(--trait)" }}>{val}</button>;
              })}
            </div>
          </div>
        ))}
        {variante && <p className="mt-4 text-sm" style={{ color: stock <= 3 ? "#a0522d" : "var(--accent)" }}>{stock <= 3 ? t("Plus que {n} en stock", { n: stock }) : t("En stock")}</p>}
        <button className="btn-plein w-full mt-6" disabled={!variante || stock < 1} data-testid="ajouter"
          onClick={() => { if (variante) { ajouter({ variante_id: variante.id, produit_id: p.id, quantite: 1 }); setOk(true); setTimeout(() => setOk(false), 1800); } }}>
          {ok ? <><Check className="h-5 w-5" />{t("Ajouté au panier")}</> : complet ? t("Ajouter au panier") : t("Choisis une option")}
        </button>
        {ok && <button className="btn-ligne w-full mt-3" onClick={() => nav("/panier")}>{t("Panier")}</button>}
      </div>
    </div>
  );
}
