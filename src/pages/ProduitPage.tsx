import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { useDonnees } from "../lib/donnees";
import { usePanier } from "../lib/panier";
import Carte, { remise } from "../lib/Carte";
import Visuel from "../lib/Visuel";
import { comparerTailles } from "../lib/tailles";

const VUES = ["face", "dos", "detail", "porte"] as const;

function Accordeon({ titre, children }: { titre: string; children: React.ReactNode }) {
  return <details className="border-t trait group"><summary className="flex items-center justify-between py-4 text-sm font-semibold cursor-pointer list-none">{titre}<ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><div className="pb-4 text-sm opacity-80 leading-relaxed">{children}</div></details>;
}

export default function ProduitPage() {
  const { slug } = useParams();
  const { t, tr, prix } = useLangue();
  const { produits, categories } = useDonnees();
  const { ajouter, setOuvert } = usePanier();
  const p = produits.find((x) => x.slug === slug);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState(0);
  const { reglages } = useDonnees();
  const photoSeo = p && (p as { photos?: string[] }).photos?.[0];
  const enStock = !!p && p.variantes.some((v) => v.stock > 0);
  useSeo({
    titre: p ? `${tr(p.nom)} – ${prix(p.prix)} | ${reglages.nom_boutique}` : reglages.nom_boutique,
    description: p ? (tr(p.description) || `${tr(p.nom)} – ${reglages.nom_boutique}`) : undefined, image: photoSeo, type: "product",
    donnees: p ? { "@context": "https://schema.org", "@type": "Product", name: tr(p.nom), description: tr(p.description) || undefined, image: photoSeo ? [photoSeo] : undefined, brand: { "@type": "Brand", name: reglages.nom_boutique },
      offers: { "@type": "Offer", price: p.prix, priceCurrency: "MAD", availability: enStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: typeof location !== "undefined" ? location.href : undefined } } : undefined,
  });
  if (!p) return <p className="opacity-60">…</p>;
  const complet = p.options.every((o) => choix[o.cle]);
  const variante = complet ? p.variantes.find((v) => p.options.every((o) => v.valeurs[o.cle] === choix[o.cle])) : undefined;
  const stock = variante?.stock ?? 0;
  const r = remise(p);
  const dispo = (cle: string, val: string) => p.variantes.some((v) => v.valeurs[cle] === val && v.stock > 0 && Object.entries(choix).every(([k, x]) => k === cle || v.valeurs[k] === x));
  const valeurs = (cle: string) => [...new Set(p.variantes.map((v) => v.valeurs[cle]))].sort(comparerTailles);
  const cat = categories.find((c) => c.slug === p.categorie);
  const similaires = produits.filter((x) => x.id !== p.id && x.categorie === p.categorie).concat(produits.filter((x) => x.id !== p.id && x.categorie !== p.categorie)).slice(0, 4);
  const ajoute = () => { if (variante) { ajouter({ variante_id: variante.id, produit_id: p.id, quantite: 1 }); setOuvert(true); } };
  const libelle = complet ? t("Ajouter au panier") : t("Choisis une option");
  return (
    <div className="pb-24 md:pb-0">
      <nav className="text-xs opacity-60 mb-5 flex gap-1.5" aria-label="Fil d'Ariane"><Link to="/" className="hover:underline">{t("Accueil")}</Link>/{cat && <><Link to={`/boutique?cat=${cat.slug}`} className="hover:underline">{tr(cat.nom)}</Link>/</>}<span className="opacity-100">{tr(p.nom)}</span></nav>
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-8 lg:gap-14">
        <div className="grid grid-cols-[64px_1fr] gap-3">
          <div className="space-y-3" role="tablist" aria-label="Photos">{VUES.map((v, i) => <button key={v} role="tab" aria-selected={photo === i} onClick={() => setPhoto(i)} data-testid={`vignette-${i}`} className={`block w-full ${photo === i ? "ring-1 ring-black" : "opacity-70 hover:opacity-100"}`}><Visuel p={p} n={i} vue={v} className="aspect-[3/4] w-full" /></button>)}</div>
          <Visuel p={p} n={photo} vue={VUES[photo]} className="aspect-[3/4] w-full" />
        </div>
        <div className="md:sticky md:top-24 h-fit">
          <h1 className="text-2xl sm:text-3xl font-bold">{tr(p.nom)}</h1>
          <p className="mt-3 text-xl flex items-center gap-3">
            <span className="font-semibold" style={r > 0 ? { color: "var(--promo)" } : undefined} data-testid="prix">{prix(variante?.prix ?? p.prix)}</span>
            {r > 0 && <><span className="line-through opacity-50 text-base">{prix(p.prix_barre!)}</span><span className="text-xs font-semibold text-white px-2 py-1" style={{ background: "var(--promo)" }}>-{r}%</span></>}
          </p>
          {p.options.map((o) => (
            <div key={o.cle} className="mt-7">
              <div className="text-sm font-semibold mb-2">{tr(o.nom)}{choix[o.cle] && <span className="font-normal opacity-60"> : {choix[o.cle]}</span>}</div>
              <div className="grid grid-cols-4 gap-2">
                {valeurs(o.cle).map((val) => {
                  const ok = dispo(o.cle, val), on = choix[o.cle] === val;
                  return <button key={val} disabled={!ok} onClick={() => setChoix({ ...choix, [o.cle]: val })} aria-pressed={on} data-testid={`option-${o.cle}-${val}`}
                    className={`h-12 border text-sm disabled:opacity-30 disabled:line-through ${on ? "text-white bg-[var(--marque)] border-black" : "trait hover:border-black"}`}>{val}</button>;
                })}
              </div>
            </div>
          ))}
          {variante && <p className="mt-4 text-sm" style={{ color: stock <= 3 ? "var(--promo)" : "var(--stock)" }}>{stock <= 3 ? t("Plus que {n} en stock", { n: stock }) : t("En stock")}</p>}
          <button className="btn-plein w-full mt-6 hidden md:flex" disabled={!variante || stock < 1} onClick={ajoute} data-testid="ajouter">{libelle}</button>
          <div className="mt-8">
            <Accordeon titre={t("Description")}>{tr(p.description)}</Accordeon>
            <Accordeon titre={t("Livraison et retours")}>{t("Livraison partout au Maroc. Frais indiqués au moment de la commande.")}</Accordeon>
            <Accordeon titre={t("Paiement")}>{t("En espèces à la livraison, ou par virement bancaire.")}</Accordeon>
            <div className="border-t trait" />
          </div>
        </div>
      </div>
      <section className="mt-16"><h2 className="text-xl font-bold mb-5">{t("Vous aimerez aussi")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-8">{similaires.map((x) => <Carte key={x.id} p={x} />)}</div></section>
      <div className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t trait p-3 flex items-center gap-3">
        <span className="font-semibold whitespace-nowrap">{prix(variante?.prix ?? p.prix)}</span>
        <button className="btn-plein flex-1" disabled={!variante || stock < 1} onClick={ajoute} data-testid="ajouter-mobile">{libelle}</button>
      </div>
    </div>
  );
}
