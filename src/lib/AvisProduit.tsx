import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLangue } from "./i18n";
import { useCompte } from "./compte";
import { Avis, avisPublies, laisserAvis, peutDonnerAvis } from "./api";
import { Etoiles, moyenne } from "./Etoiles";

export const dateCourte = (iso: string, langue: string) => new Date(iso).toLocaleDateString(langue === "ar" ? "ar-MA-u-nu-latn" : langue === "en" ? "en-GB" : "fr-FR");

export function CarteAvis({ a, langue, lien }: { a: Avis; langue: string; lien?: React.ReactNode }) {
  const { t } = useLangue();
  return (
    <article className="border-t trait py-5" data-testid="avis">
      <div className="flex items-center gap-3 flex-wrap"><Etoiles note={a.note} /><b className="text-sm">{a.nom_affiche}</b><span className="text-xs opacity-55">{dateCourte(a.created_at, langue)}</span>{lien}</div>
      {a.titre && <p className="font-semibold mt-2">{a.titre}</p>}
      {a.texte && <p className="text-sm mt-1 opacity-85 whitespace-pre-line">{a.texte}</p>}
      {a.reponse && <p className="text-sm mt-3 ps-3 border-s-2 opacity-80" style={{ borderColor: "var(--marque)" }}><b>{t("Réponse de la boutique")} :</b> {a.reponse}</p>}
    </article>
  );
}

/** Section « Avis » d'une fiche produit : liste, moyenne et formulaire réservé aux clients ayant reçu le produit. */
export default function AvisProduit({ produitId, onChargé }: { produitId: string; onChargé?: (a: Avis[]) => void }) {
  const { t, langue } = useLangue();
  const { user } = useCompte();
  const [avis, setAvis] = useState<Avis[]>([]);
  const [droit, setDroit] = useState<{ connecte: boolean; a_achete: boolean; deja: boolean } | null>(null);
  const [note, setNote] = useState(5), [titre, setTitre] = useState(""), [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "ok" | "erreur">("saisie");
  useEffect(() => { avisPublies(produitId).then((a) => { setAvis(a); onChargé?.(a); }).catch(() => {}); }, [produitId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) peutDonnerAvis(produitId).then(setDroit).catch(() => setDroit(null)); else setDroit(null); }, [produitId, user]);
  const nom = user ? (user.profil.nom || "").trim() : "";
  const affiche = nom ? nom.split(/\s+/).map((m, i, tab) => (i === 0 ? m : i === tab.length - 1 ? m[0].toUpperCase() + "." : "")).filter(Boolean).join(" ") : "Client";
  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault(); setEtat("envoi");
    try { await laisserAvis(produitId, note, titre.trim(), texte.trim(), affiche); setEtat("ok"); } catch { setEtat("erreur"); }
  };
  return (
    <section className="mt-16" id="avis" data-testid="section-avis">
      <div className="flex items-center gap-3 mb-2"><h2 className="text-xl font-bold">{t("Avis des clients")}</h2>
        {avis.length > 0 && <span className="flex items-center gap-2 text-sm"><Etoiles note={moyenne(avis)} /> {moyenne(avis).toFixed(1)} · {t("{n} avis", { n: avis.length })}</span>}</div>
      {avis.length === 0 && <p className="text-sm opacity-60 py-3">{t("Aucun avis pour le moment.")}</p>}
      {avis.map((a) => <CarteAvis key={a.id} a={a} langue={langue} />)}
      <div className="border-t trait pt-5">
        {!user ? <p className="text-sm"><Link to="/compte" className="underline">{t("Connectez-vous pour donner votre avis.")}</Link></p>
          : !droit ? null
          : droit.deja ? <p className="text-sm opacity-70">{t("Vous avez déjà donné votre avis sur ce produit.")}</p>
          : !droit.a_achete ? <p className="text-sm opacity-70">{t("Seuls les clients ayant reçu ce produit peuvent donner leur avis.")}</p>
          : etat === "ok" ? <p className="text-sm" role="status" data-testid="avis-merci">{t("Merci ! Votre avis sera publié après vérification.")}</p>
          : (
            <form onSubmit={envoyer} className="space-y-3 max-w-lg" data-testid="form-avis">
              <h3 className="font-semibold">{t("Donner mon avis")}</h3>
              <div role="radiogroup" aria-label={t("Votre note")} className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} onClick={() => setNote(n)} aria-label={`${n}`} aria-pressed={note === n} data-testid={`note-${n}`} className="p-0.5"><Etoiles note={n <= note ? 1 : 0} taille={26} /></button>)}</div>
              <input className="champ" placeholder={t("Titre (facultatif)")} value={titre} maxLength={80} onChange={(e) => setTitre(e.target.value)} data-testid="avis-titre" />
              <textarea className="champ !h-28 py-3" placeholder={t("Votre avis")} value={texte} maxLength={1000} onChange={(e) => setTexte(e.target.value)} data-testid="avis-texte" />
              <button className="btn-plein" disabled={etat === "envoi"} data-testid="avis-envoyer">{t("Envoyer mon avis")}</button>
              {etat === "erreur" && <p className="text-red-700 text-sm" role="alert">{t("Une erreur est survenue. Réessayez.")}</p>}
            </form>
          )}
      </div>
    </section>
  );
}
