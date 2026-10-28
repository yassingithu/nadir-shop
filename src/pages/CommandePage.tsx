import { useState } from "react";
import { Link } from "react-router-dom";
import { useCompte } from "../lib/compte";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { useDonnees } from "../lib/donnees";
import { usePanier } from "../lib/panier";
import { passerCommande, verifierCode } from "../lib/api";
import { detail } from "../lib/calcul";
import type { Infos } from "../lib/types";

export default function CommandePage() {
  const { t, prix, langue } = useLangue();
  useSeo({ titre: t("Vos informations") + " | Sweet Family", noindex: true });
  const { produits, reglages } = useDonnees();
  const { lignes, vider } = usePanier();
  const { user, pret } = useCompte();
  const d = detail(lignes, produits, reglages);
  const [f, setF] = useState<Infos>({ nom: "", telephone: "", email: "", ville: "", adresse: "", note: "" });
  const [mode, setMode] = useState<"livraison" | "virement">("livraison");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "erreur">("saisie");
  const [fait, setFait] = useState<{ numero: number; mode: string } | null>(null);
  const [prerempli, setPrerempli] = useState(false);
  if (user && !prerempli) { setPrerempli(true); setF((o) => ({ ...o, ...user.profil, email: user.email, note: o.note })); }
  const [codeSaisi, setCodeSaisi] = useState("");
  const [promo, setPromo] = useState<{ code: string; remise: number; frais: number } | null>(null);
  const [erreurCode, setErreurCode] = useState("");
  const appliquer = async () => {
    setErreurCode("");
    try {
      const r = await verifierCode(codeSaisi, lignes, d.sous, d.frais);
      if (r.valide && r.code) setPromo({ code: r.code, remise: r.remise ?? 0, frais: r.frais ?? d.frais });
      else setErreurCode(r.message || t("Code promo invalide."));
    } catch { setErreurCode(t("Code promo invalide.")); }
  };
  const remiseAff = promo?.remise ?? 0, fraisAff = promo ? promo.frais : d.frais;
  const totalAff = Math.max(d.sous - remiseAff, 0) + fraisAff;
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
      <p className="mt-3 text-sm opacity-70">{t("Retrouvez cette commande dans votre compte, rubrique « Mes commandes ».")}</p>
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
  if (!pret) return <p className="opacity-60 text-center py-16">…</p>;
  if (d.items.length && !user) return (
    <div className="max-w-md mx-auto text-center py-12 space-y-5" data-testid="porte-compte">
      <h1 className="font-bold text-3xl">{t("Connectez-vous pour commander")}</h1>
      <p className="opacity-70">{t("Un compte est nécessaire pour passer commande. Votre panier est conservé.")}</p>
      <div className="flex flex-col gap-3"><Link to="/compte?retour=/commande" className="btn-plein" data-testid="porte-connexion">{t("Se connecter")}</Link><Link to="/compte?retour=/commande&inscription=1" className="btn-ligne" data-testid="porte-inscription">{t("Créer mon compte")}</Link></div>
    </div>
  );
  if (!d.items.length) return <div className="text-center py-16"><Link to="/" className="btn-plein">{t("Continuer mes achats")}</Link></div>;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault(); if (!valide || etat === "envoi") return;
    setEtat("envoi");
    try { const r = await passerCommande(f, mode, lignes, langue, promo?.code ?? ""); vider(); setFait({ numero: r.numero, mode }); }
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
      <aside className="rounded-2xl bg-[var(--gris)] p-6 h-fit space-y-3 text-sm">
        <div className="flex justify-between"><span>{t("Sous-total")}</span><span>{prix(d.sous)}</span></div>
        {promo ? (
          <div className="flex items-center justify-between gap-2" data-testid="promo-appliquee"><span>{t("Code appliqué")} : <b dir="ltr">{promo.code}</b></span>
            <button type="button" className="underline text-xs" onClick={() => { setPromo(null); setCodeSaisi(""); }}>{t("Retirer")}</button></div>
        ) : (
          <div><div className="flex gap-2"><input className="champ !h-10" dir="ltr" placeholder={t("Code promo")} aria-label={t("Code promo")} value={codeSaisi} onChange={(e) => setCodeSaisi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (codeSaisi.trim()) void appliquer(); } }} data-testid="champ-promo" />
            <button type="button" className="btn-ligne px-4 !h-10" disabled={!codeSaisi.trim()} onClick={appliquer} data-testid="appliquer-promo">{t("Appliquer")}</button></div>
            {erreurCode && <p className="text-red-700 mt-1" role="alert" data-testid="erreur-promo">{erreurCode}</p>}</div>
        )}
        {remiseAff > 0 && <div className="flex justify-between" style={{ color: "var(--stock)" }}><span>{t("Réduction")}</span><span data-testid="remise">- {prix(remiseAff)}</span></div>}
        <div className="flex justify-between"><span>{t("Livraison")}</span><span>{fraisAff === 0 ? t("Gratuite") : prix(fraisAff)}</span></div>
        <div className="flex justify-between font-semibold text-lg border-t pt-3 trait"><span>{t("Total")}</span><span data-testid="total">{prix(totalAff)}</span></div>
        <button className="btn-plein w-full" disabled={!valide || etat === "envoi"} data-testid="confirmer">{etat === "envoi" ? t("Envoi…") : t("Confirmer la commande")}</button>
        {etat === "erreur" && <p className="text-red-700" role="alert">{t("Une erreur est survenue. Réessayez.")}</p>}
      </aside>
    </form>
  );
}
