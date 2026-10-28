import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { desabonnerNewsletter } from "../lib/api";

export default function DesabonnementPage() {
  const { t } = useLangue();
  useSeo({ titre: t("Désinscription") + " | Sweet Family", noindex: true });
  const [sp] = useSearchParams();
  const [etat, setEtat] = useState<"attente" | "ok" | "echec">("attente");
  useEffect(() => { const k = sp.get("t"); if (!k) { setEtat("echec"); return; } desabonnerNewsletter(k).then((r) => setEtat(r ? "ok" : "echec")).catch(() => setEtat("echec")); }, [sp]);
  return (
    <div className="max-w-md mx-auto text-center py-12" data-testid="desabonnement">
      <h1 className="font-bold text-3xl">{t("Désinscription")}</h1>
      <p className="mt-4">{etat === "attente" ? "…" : etat === "ok" ? t("Vous êtes désinscrit(e) de la newsletter.") : t("Lien invalide ou déjà utilisé.")}</p>
      <Link to="/" className="btn-plein mt-8">{t("Retour à la boutique")}</Link>
    </div>
  );
}
