import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { Avis, avisPublies } from "../lib/api";
import { Etoiles, moyenne } from "../lib/Etoiles";
import { CarteAvis } from "../lib/AvisProduit";

export default function AvisPage() {
  const { t, tr, langue } = useLangue();
  useSeo({ titre: t("Avis des clients") + " | Sweet Family" });
  const [avis, setAvis] = useState<Avis[] | null>(null);
  useEffect(() => { avisPublies().then(setAvis).catch(() => setAvis([])); }, []);
  return (
    <div className="max-w-3xl mx-auto" data-testid="page-avis">
      <h1 className="font-bold text-3xl">{t("Avis des clients")}</h1>
      {avis && avis.length > 0 && <p className="mt-2 flex items-center gap-2 text-sm"><Etoiles note={moyenne(avis)} taille={20} /> <b>{moyenne(avis).toFixed(1)}/5</b> · {t("{n} avis", { n: avis.length })}</p>}
      <div className="mt-6">
        {avis && avis.length === 0 && <p className="opacity-60">{t("Aucun avis pour le moment.")}</p>}
        {avis?.map((a) => <CarteAvis key={a.id} a={a} langue={langue} lien={a.produits && <Link className="text-xs underline" to={`/produit/${a.produits.slug}#avis`}>{tr(a.produits.nom)}</Link>} />)}
      </div>
    </div>
  );
}
