import { useState } from "react";
import { Link } from "react-router-dom";
import { useLangue } from "../lib/i18n";
import { useDonnees } from "../lib/donnees";
import Visuel from "../lib/Visuel";

export default function Boutique() {
  const { t, tr, prix } = useLangue();
  const { produits, categories, etat } = useDonnees();
  const [cat, setCat] = useState<string | null>(null);
  const liste = produits.filter((p) => !cat || p.categorie === cat);
  const chip = (actif: boolean) => `px-4 h-10 rounded-full border text-sm ${actif ? "text-white" : ""}`;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8" role="group">
        <button className={chip(!cat)} style={!cat ? { background: "var(--encre)" } : { borderColor: "var(--trait)" }} onClick={() => setCat(null)} data-testid="cat-tout">{t("Tout")}</button>
        {categories.map((c) => <button key={c.slug} className={chip(cat === c.slug)} style={cat === c.slug ? { background: "var(--encre)" } : { borderColor: "var(--trait)" }} onClick={() => setCat(c.slug)} data-testid={`cat-${c.slug}`}>{tr(c.nom)}</button>)}
      </div>
      {etat === "ok" && liste.length === 0 && <p className="opacity-60">{t("Aucun produit pour le moment.")}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {liste.map((p) => {
          const stock = p.variantes.reduce((s, v) => s + v.stock, 0);
          return (
            <Link key={p.id} to={`/produit/${p.slug}`} className="group" data-testid="carte-produit">
              <div className="relative overflow-hidden rounded-2xl aspect-[4/5]"><Visuel p={p} className="h-full w-full transition group-hover:scale-[1.03]" />
                {stock === 0 && <span className="absolute top-3 start-3 rounded-full bg-white/90 text-xs px-3 py-1">{t("Épuisé")}</span>}</div>
              <h3 className="mt-3 font-medium">{tr(p.nom)}</h3>
              <p className="text-sm"><span className="font-medium">{prix(p.prix)}</span>{p.prix_barre && <span className="ms-2 line-through opacity-50">{prix(p.prix_barre)}</span>}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
