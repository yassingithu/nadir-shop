import { useState } from "react";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { suivre } from "../lib/api";

const STATUTS: Record<string, string> = { recue: "Reçue", confirmee: "Confirmée", expediee: "Expédiée", livree: "Livrée", annulee: "Annulée" };
export default function SuiviPage() {
  const { t, prix } = useLangue();
  useSeo({ titre: t("Suivre ma commande") + " | Sweet Family", noindex: true });
  const [num, setNum] = useState(""); const [tel, setTel] = useState("");
  const [res, setRes] = useState<Awaited<ReturnType<typeof suivre>> | "aucune" | null>(null);
  const chercher = async (e: React.FormEvent) => {
    e.preventDefault();
    try { const r = await suivre(Number(num), tel); setRes(r ?? "aucune"); } catch { setRes("aucune"); }
  };
  return (
    <div className="max-w-md mx-auto">
      <h1 className="font-bold text-3xl mb-6">{t("Suivre ma commande")}</h1>
      <form onSubmit={chercher} className="space-y-4">
        <input className="champ" inputMode="numeric" placeholder={t("Numéro de commande")} value={num} onChange={(e) => setNum(e.target.value)} data-testid="suivi-numero" />
        <input className="champ" type="tel" placeholder={t("Téléphone")} value={tel} onChange={(e) => setTel(e.target.value)} data-testid="suivi-tel" />
        <button className="btn-plein w-full" disabled={!num || !tel}>{t("Rechercher")}</button>
      </form>
      {res === "aucune" && <p className="mt-6 text-red-700">{t("Commande introuvable. Vérifiez le numéro et le téléphone.")}</p>}
      {res && res !== "aucune" && (
        <div className="mt-6 bg-white p-6 space-y-2" data-testid="suivi-resultat">
          <p className="font-bold text-xl">{t("Numéro de commande ")}{res.numero}</p>
          <p>{t("Statut")} : <b>{t(STATUTS[res.statut] ?? res.statut)}</b></p>
          {res.mode_paiement === "virement" && <p className="text-sm opacity-70">{res.paiement_recu ? t("Paiement reçu") : t("En attente de paiement")}</p>}
          {res.total > 0 && <p>{t("Total")} : {prix(res.total)}</p>}
        </div>
      )}
    </div>
  );
}
