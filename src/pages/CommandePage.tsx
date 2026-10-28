import { useState } from "react";
import { Link } from "react-router-dom";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { useDonnees } from "../lib/donnees";
import { usePanier } from "../lib/panier";
import { passerCommande } from "../lib/api";
import { detail } from "../lib/calcul";
import type { Infos } from "../lib/types";

export default function CommandePage() {
  const { t, prix, langue } = useLangue();
  useSeo({ titre: t("Vos informations") + " | Sweet Family", noindex: true });
  const { produits, reglages } = useDonnees();
  const { lignes, vider } = usePanier();
  const d = detail(lignes, produits, reglages);
  const [f, setF] = useState<Infos>({ nom: "", telephone: "", email: "", ville: "", adresse: "", note: "" });
  const [mode, setMode] = useState<"livraison" | "virement">("livraison");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "erreur">("saisie");
  const [fait, setFait] = useState<{ numero: number; mode: string } | null>(null);
  const valide = f.nom.trim() && f.telephone.replace(/\D/g, "").length >= 9 && f.ville.trim() && f.adresse.trim();
  const champ = (cle: keyof Infos, label: string, extra: Record<string, string> = {}) => (
    <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>
      <input className="champ" value={f[cle]} onChange={(e) => setF({ ...f, [cle]: e.target.value })} data-testid={`champ-${cle}`} {...extra} /></label>
  );

  if (fait) return (
    <div className="max-w-xl mx-auto text-center py-10" data-testid="merci">
      <h1 className="font-bold text-3xl">{t("Merci, votre commande est enregistrée")}</h1>
      <p className="mt-6 text-sm opacity-70">{t("Numéro de commande")}</p>
      <p className="font-bold text-5xl mt-1" data-testid="numero">{fait.numero}</p>
      <p className="mt-3 text-sm opacity-70">{t("Gardez ce numéro et votre téléphone pour suivre la commande.")}</p>
      {fait.mode === "virement" && (
        <div className="mt-8 bg-white p-6 text-start space-y-1.5 text-sm">
          <p className="font-medium">{t("Pour régler par virement :")}</p>
          <p>{t("Titulaire")} : {reglages.virement_titulaire}</p><p>{t("Banque")} : {reglages.virement_banque}</p><p>{t("RIB")} : <span dir="ltr">{reglages.virement_rib}</span></p>
          <p className="opacity-70 pt-2">{t("Indiquez le numéro de commande dans le motif du virement.")}</p>
        </div>
      )}
      <Link to="/" className="btn-plein mt-8">{t("Retour à la boutique")}</Link>
    </div>
  );
  if (!d.items.length) return <div className="text-center py-16"><Link to="/" className="btn-plein">{t("Continuer mes achats")}</Link></div>;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault(); if (!valide || etat === "envoi") return;
    setEtat("envoi");
    try { const r = await passerCommande(f, mode, lignes, langue); vider(); setFait({ numero: r.numero, mode }); }
    catch { setEtat("erreur"); }
  };
  const radio = (id: "livraison" | "virement", titre: string, desc: string) => (
    <label className={`block border p-4 cursor-pointer ${mode === id ? "bg-white" : ""}`} style={{ borderColor: mode === id ? "var(--encre)" : "var(--trait)" }}>
      <input type="radio" name="paiement" className="me-3" checked={mode === id} onChange={() => setMode(id)} data-testid={`paiement-${id}`} />
      <span className="font-medium">{titre}</span><span className="block text-sm opacity-65 ms-7">{desc}</span></label>
  );
  return (
    <form onSubmit={envoyer} className="grid lg:grid-cols-[1fr_340px] gap-10">
      <div className="space-y-4">
        <h1 className="font-bold text-3xl">{t("Vos informations")}</h1>
        {champ("nom", t("Nom complet"), { autoComplete: "name" })}
        <div className="grid sm:grid-cols-2 gap-4">{champ("telephone", t("Téléphone"), { type: "tel", autoComplete: "tel" })}{champ("email", t("E-mail (facultatif)"), { type: "email" })}</div>
        <div className="grid sm:grid-cols-2 gap-4">{champ("ville", t("Ville"))}{champ("adresse", t("Adresse de livraison"))}</div>
        {champ("note", t("Remarque (facultatif)"))}
        <h2 className="font-bold text-2xl pt-4">{t("Mode de paiement")}</h2>
        <div className="space-y-3">
          {radio("livraison", t("Paiement à la livraison"), t("Vous payez en espèces quand vous recevez la commande."))}
          {radio("virement", t("Virement bancaire"), t("La commande est préparée dès réception du virement."))}
        </div>
      </div>
      <aside className="rounded-2xl bg-[#f4f4f4] p-6 h-fit space-y-3 text-sm">
        <div className="flex justify-between"><span>{t("Sous-total")}</span><span>{prix(d.sous)}</span></div>
        <div className="flex justify-between"><span>{t("Livraison")}</span><span>{d.frais === 0 ? t("Gratuite") : prix(d.frais)}</span></div>
        <div className="flex justify-between font-semibold text-lg border-t pt-3 trait"><span>{t("Total")}</span><span>{prix(d.total)}</span></div>
        <button className="btn-plein w-full" disabled={!valide || etat === "envoi"} data-testid="confirmer">{etat === "envoi" ? t("Envoi…") : t("Confirmer la commande")}</button>
        {etat === "erreur" && <p className="text-red-700" role="alert">{t("Une erreur est survenue. Réessayez.")}</p>}
      </aside>
    </form>
  );
}
