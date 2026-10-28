import { Link } from "react-router-dom";
import { useLangue } from "../lib/i18n";
import { useDonnees } from "../lib/donnees";
import Carte from "../lib/Carte";
import Visuel from "../lib/Visuel";
import { useSeo } from "../lib/Seo";

export default function Accueil() {
  const { t, tr } = useLangue();
  const { produits, categories, reglages } = useDonnees();
  useSeo({
    titre: `${reglages.nom_boutique} – ${t("Nouvelle collection")}`, description: t("Livraison à Tanger et partout au Maroc. Paiement à la livraison ou par virement."),
    donnees: { "@context": "https://schema.org", "@type": "Store", name: reglages.nom_boutique, areaServed: [{ "@type": "City", name: "Tanger" }, { "@type": "Country", name: "Maroc" }], paymentAccepted: "Cash on delivery, bank transfer", currenciesAccepted: "MAD" },
  });
  return (
    <div className="space-y-14 sm:space-y-20 -mt-6 sm:-mt-8">
      <section className="w-screen ms-[calc(50%-50vw)] text-white" style={{ background: "var(--encre)" }}>
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20 grid md:grid-cols-[1.3fr_1fr] gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight" data-testid="hero-titre">{t("Nouvelle collection")}</h1>
            <p className="mt-5 text-lg opacity-80 max-w-lg">{t("Des pièces simples, bien coupées, livrées chez vous.")}</p>
            <Link to="/boutique?nouveautes=1" className="mt-8 inline-flex items-center justify-center h-12 px-8 bg-white text-black text-sm font-semibold hover:bg-[#e8e8e8]" data-testid="hero-cta">{t("Découvrir la collection")}</Link>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-3">{produits.slice(0, 2).map((p) => <Visuel key={p.id} p={p} className="aspect-[3/4] w-full" />)}</div>
        </div>
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="text-xl sm:text-2xl font-bold mb-5">{t("Acheter par catégorie")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {categories.map((c) => {
            const p = produits.find((x) => x.categorie === c.slug);
            return (
              <Link key={c.slug} to={`/boutique?cat=${c.slug}`} className="group relative block overflow-hidden aspect-[4/3] sm:aspect-[3/4]" data-testid={`tuile-${c.slug}`}>
                {p && <Visuel p={p} className="h-full w-full transition duration-500 group-hover:scale-[1.03]" />}
                <span className="absolute bottom-0 inset-x-0 p-4 text-lg font-semibold text-white bg-gradient-to-t from-black/60 to-transparent">{tr(c.nom)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="nouv">
        <div className="flex items-end justify-between mb-5"><h2 id="nouv" className="text-xl sm:text-2xl font-bold">{t("Nouveautés")}</h2><Link to="/boutique?nouveautes=1" className="text-sm underline">{t("Voir tout")}</Link></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-8">{produits.slice(0, 4).map((p) => <Carte key={p.id} p={p} />)}</div>
      </section>

      <section className="grid sm:grid-cols-3 gap-6 border-y trait py-8 text-sm text-center">
        <p>{reglages.livraison_gratuite_des != null ? t("Livraison offerte dès {n}", { n: new Intl.NumberFormat().format(reglages.livraison_gratuite_des) + " MAD" }) : t("Livraison")}</p>
        <p>{t("Paiement à la livraison ou par virement")}</p>
        <p>{t("Suivre ma commande")}</p>
      </section>
    </div>
  );
}
