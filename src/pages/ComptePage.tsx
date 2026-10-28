import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useLangue } from "../lib/i18n";
import { useSeo } from "../lib/Seo";
import { abonnerNewsletter, mesCommandes, type CommandeClient } from "../lib/api";
import { messageErreur, useCompte, type Profil } from "../lib/compte";

const STATUTS: Record<string, string> = { recue: "Reçue", confirmee: "Confirmée", expediee: "Expédiée", livree: "Livrée", annulee: "Annulée" };

export default function ComptePage() {
  const { t, prix, langue } = useLangue();
  useSeo({ titre: t("Mon compte") + " | Sweet Family", noindex: true });
  const { user, pret, recuperation, inscrire, connecter, deconnecter, oubli, nouveauMdp, majProfil } = useCompte();
  const [sp] = useSearchParams(), nav = useNavigate();
  const retour = sp.get("retour");
  const [mode, setMode] = useState<"connexion" | "inscription" | "oubli">(sp.get("inscription") ? "inscription" : "connexion");
  const [f, setF] = useState({ email: "", mdp: "", nom: "", telephone: "", news: true });
  const [err, setErr] = useState(""), [info, setInfo] = useState(""), [occupe, setOccupe] = useState(false);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [cmds, setCmds] = useState<CommandeClient[] | null>(null);
  const [mdp2, setMdp2] = useState("");

  useEffect(() => { if (user) setProfil(user.profil); }, [user]);
  useEffect(() => { if (user && retour && retour.startsWith("/")) nav(retour, { replace: true }); }, [user, retour, nav]);
  useEffect(() => { if (user) mesCommandes().then(setCmds).catch(() => setCmds([])); }, [user]);

  const lancer = async (fn: () => Promise<void>) => { setErr(""); setInfo(""); setOccupe(true); try { await fn(); } catch (e) { setErr(t(messageErreur(e))); } setOccupe(false); };
  const champ = (cle: "email" | "mdp" | "nom" | "telephone", label: string, extra: Record<string, string> = {}) => (
    <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>
      <input className="champ" value={f[cle]} onChange={(e) => setF({ ...f, [cle]: e.target.value })} data-testid={`compte-${cle}`} {...extra} /></label>
  );

  if (!pret) return <p className="opacity-60 text-center py-16">…</p>;

  if (recuperation) return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="font-bold text-3xl">{t("Nouveau mot de passe")}</h1>
      <form onSubmit={(e) => { e.preventDefault(); void lancer(async () => { if (mdp2.length < 8) throw new Error("at least"); await nouveauMdp(mdp2); setInfo(t("Mot de passe modifié.")); }); }} className="space-y-4">
        <input className="champ" type="password" autoComplete="new-password" placeholder={t("Nouveau mot de passe (8 caractères minimum)")} value={mdp2} onChange={(e) => setMdp2(e.target.value)} />
        <button className="btn-plein w-full" disabled={occupe}>{t("Enregistrer")}</button>
      </form>
      {err && <p className="text-red-700" role="alert">{err}</p>}{info && <p style={{ color: "var(--stock)" }}>{info}</p>}
    </div>
  );

  if (!user) return (
    <div className="max-w-md mx-auto">
      <h1 className="font-bold text-3xl mb-2">{mode === "inscription" ? t("Créer mon compte") : mode === "oubli" ? t("Mot de passe oublié") : t("Connexion")}</h1>
      {retour && <p className="text-sm opacity-70 mb-4">{t("Un compte est nécessaire pour passer commande. Votre panier est conservé.")}</p>}
      <div className="flex border-b trait mb-6 text-sm font-semibold">
        <button type="button" onClick={() => { setMode("connexion"); setErr(""); }} className={`flex-1 py-3 ${mode !== "inscription" ? "border-b-2" : "opacity-60"}`} style={{ borderColor: "var(--marque)" }} data-testid="onglet-connexion">{t("Connexion")}</button>
        <button type="button" onClick={() => { setMode("inscription"); setErr(""); }} className={`flex-1 py-3 ${mode === "inscription" ? "border-b-2" : "opacity-60"}`} style={{ borderColor: "var(--marque)" }} data-testid="onglet-inscription">{t("Créer mon compte")}</button>
      </div>
      <form className="space-y-4" onSubmit={(e) => {
        e.preventDefault();
        void lancer(async () => {
          if (mode === "connexion") await connecter(f.email, f.mdp);
          else if (mode === "oubli") { await oubli(f.email); setInfo(t("Si cette adresse existe, un lien de réinitialisation vient d'être envoyé.")); }
          else {
            if (!f.nom.trim() || f.telephone.replace(/\D/g, "").length < 9) throw new Error("incomplet");
            if (f.mdp.length < 8) throw new Error("at least");
            const r = await inscrire({ email: f.email, mdp: f.mdp, nom: f.nom.trim(), telephone: f.telephone.trim() });
            if (f.news) { try { await abonnerNewsletter(f.email, langue, "inscription"); } catch { /* sans gravité */ } }
            if (r === "verifier") setInfo(t("Compte créé. Cliquez sur le lien reçu par e-mail pour l'activer, puis connectez-vous."));
          }
        });
      }}>
        {mode === "inscription" && <>{champ("nom", t("Nom complet"), { autoComplete: "name" })}{champ("telephone", t("Téléphone"), { type: "tel", autoComplete: "tel" })}</>}
        {champ("email", t("E-mail"), { type: "email", autoComplete: "email", dir: "ltr" })}
        {mode !== "oubli" && champ("mdp", mode === "inscription" ? t("Mot de passe (8 caractères minimum)") : t("Mot de passe"), { type: "password", autoComplete: mode === "inscription" ? "new-password" : "current-password" })}
        {mode === "inscription" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={f.news} onChange={(e) => setF({ ...f, news: e.target.checked })} />{t("Je souhaite recevoir les nouveautés et offres par e-mail.")}</label>}
        <button className="btn-plein w-full" disabled={occupe || !f.email || (mode !== "oubli" && !f.mdp)} data-testid="compte-valider">
          {mode === "inscription" ? t("Créer mon compte") : mode === "oubli" ? t("Envoyer le lien") : t("Se connecter")}</button>
        {mode === "connexion" && <button type="button" className="text-sm underline" onClick={() => { setMode("oubli"); setErr(""); }} data-testid="lien-oubli">{t("Mot de passe oublié ?")}</button>}
        {mode === "oubli" && <button type="button" className="text-sm underline" onClick={() => setMode("connexion")}>{t("Retour à la connexion")}</button>}
      </form>
      {err && <p className="mt-4 text-red-700" role="alert" data-testid="compte-erreur">{err}</p>}
      {info && <p className="mt-4" style={{ color: "var(--stock)" }} data-testid="compte-info">{info}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div><h1 className="font-bold text-3xl">{t("Mon compte")}</h1><p className="text-sm opacity-70" dir="ltr">{user.email}</p></div>
        <button className="btn-ligne" onClick={() => void deconnecter()} data-testid="deconnexion-client">{t("Se déconnecter")}</button>
      </div>
      <section>
        <h2 className="font-bold text-xl mb-3">{t("Mes informations de livraison")}</h2>
        {profil && <form className="grid sm:grid-cols-2 gap-4" onSubmit={(e) => { e.preventDefault(); void lancer(async () => { await majProfil(profil); setInfo(t("Informations enregistrées.")); }); }}>
          {([["nom", "Nom complet"], ["telephone", "Téléphone"], ["ville", "Ville"], ["adresse", "Adresse de livraison"]] as const).map(([k, l]) => (
            <label key={k} className="block text-sm"><span className="mb-1 block font-medium">{t(l)}</span><input className="champ" value={profil[k]} onChange={(e) => setProfil({ ...profil, [k]: e.target.value })} data-testid={`profil-${k}`} /></label>))}
          <div className="sm:col-span-2 flex items-center gap-4"><button className="btn-plein" disabled={occupe}>{t("Enregistrer")}</button>{info && <span style={{ color: "var(--stock)" }}>{info}</span>}{err && <span className="text-red-700">{err}</span>}</div>
        </form>}
      </section>
      <section>
        <h2 className="font-bold text-xl mb-3">{t("Mes commandes")}</h2>
        {cmds === null ? <p className="opacity-60">…</p> : cmds.length === 0 ? <p className="opacity-70">{t("Aucune commande pour le moment.")} <Link className="underline" to="/boutique">{t("Continuer mes achats")}</Link></p> :
          <ul className="space-y-3" data-testid="mes-commandes">{cmds.map((c) => (
            <li key={c.numero} className="border trait p-4">
              <div className="flex justify-between gap-3 flex-wrap"><b>{t("Numéro de commande ")}{c.numero}</b><span>{t(STATUTS[c.statut] ?? c.statut)}</span></div>
              <p className="text-sm opacity-70 mt-1">{new Date(c.created_at).toLocaleDateString(langue === "ar" ? "ar-MA-u-nu-latn" : langue)} · {prix(c.total)} · {c.mode_paiement === "virement" ? t("Virement bancaire") : t("Paiement à la livraison")}</p>
              <p className="text-sm mt-2">{(c.lignes_commande ?? []).map((l) => `${l.quantite} × ${l.nom}${l.valeurs?.taille ? " (" + l.valeurs.taille + ")" : ""}`).join(", ")}</p>
            </li>))}</ul>}
      </section>
    </div>
  );
}
