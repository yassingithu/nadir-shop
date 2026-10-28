import { Link } from "react-router-dom";
import { useLangue } from "./i18n";
import { usePanier } from "./panier";
import Visuel from "./Visuel";
import type { Produit } from "./types";

export const remise = (p: Produit) => (p.prix_barre && p.prix_barre > p.prix ? Math.round((1 - p.prix / p.prix_barre) * 100) : 0);
export const stockTotal = (p: Produit) => p.variantes.reduce((s, v) => s + v.stock, 0);

/** Carte produit : au survol (ordinateur), les tailles disponibles permettent l'ajout rapide. */
export default function Carte({ p }: { p: Produit }) {
  const { t, tr, prix } = useLangue();
  const { ajouter, setOuvert } = usePanier();
  const r = remise(p), epuise = stockTotal(p) === 0;
  const cle = p.options[0]?.cle;
  const rapide = p.options.length === 1 && cle;
  return (
    <article className="group" data-testid="carte-produit">
      <Link to={`/produit/${p.slug}`} className="block">
        <div className="relative overflow-hidden aspect-[3/4]">
          <Visuel p={p} className="h-full w-full" />
          <div className="absolute top-2 start-2 flex flex-col gap-1">
            {r > 0 && <span className="text-xs font-semibold text-white px-2 py-1" style={{ background: "var(--promo)" }}>-{r}%</span>}
            {epuise && <span className="text-xs bg-white px-2 py-1">{t("Épuisé")}</span>}
          </div>
        </div>
      </Link>
      {rapide && !epuise && (
        <div className="hidden md:block -mt-12 relative h-12 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 transition bg-white/95 border-t trait">
          <div className="flex h-full items-center justify-center gap-1.5 px-2" role="group" aria-label={t("Ajout rapide")}>
            {p.variantes.map((v) => (
              <button key={v.id} disabled={v.stock < 1} className="h-8 min-w-9 px-2 text-xs border trait hover:border-black disabled:opacity-30 disabled:line-through"
                onClick={() => { ajouter({ variante_id: v.id, produit_id: p.id, quantite: 1 }); setOuvert(true); }} data-testid={`rapide-${v.valeurs[cle]}`}>{v.valeurs[cle]}</button>
            ))}
          </div>
        </div>
      )}
      <Link to={`/produit/${p.slug}`} className="block mt-3">
        <h3 className="text-sm">{tr(p.nom)}</h3>
        <p className="text-sm mt-0.5">
          <span className={r > 0 ? "font-semibold" : ""} style={r > 0 ? { color: "var(--promo)" } : undefined}>{prix(p.prix)}</span>
          {r > 0 && <span className="ms-2 line-through opacity-50">{prix(p.prix_barre!)}</span>}
        </p>
      </Link>
    </article>
  );
}
