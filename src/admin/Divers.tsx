import { useEffect, useState } from "react";
import { ok, sb, slugify, type Cat, type Reg } from "./db";
import { TEXTES_SITE, type Surcharges } from "../lib/i18n";
import { Campagnes } from "./Marketing";
import { completer, traduire, MESSAGE_ECHEC } from "./traduire";

export function Categories() {
  const [cats, setCats] = useState<Cat[] | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [nv, setNv] = useState({ fr: "", en: "", ar: "" });
  const charger = async () => { try { setCats(await ok<Cat[]>(sb().from("categories").select("*").order("ordre"))); } catch (e) { setErr((e as Error).message); } };
  useEffect(() => { void charger(); }, []);
  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); if (!nv.fr.trim()) return setErr("Le nom en français est obligatoire.");
    try { await ok(sb().from("categories").insert({ slug: slugify(nv.fr), nom: nv, ordre: (cats?.length ?? 0) + 1 })); setNv({ fr: "", en: "", ar: "" }); await charger(); } catch (er) { setErr((er as Error).message); }
  };
  const sauver = async (c: Cat) => { setErr(""); setMsg(""); try { await ok(sb().from("categories").update({ nom: c.nom, ordre: c.ordre, actif: c.actif }).eq("id", c.id)); setMsg("Catégorie enregistrée."); } catch (er) { setErr((er as Error).message); } };
  const auto = async (fr: string, actuel: { en?: string; ar?: string }, remplir: (t: { en?: string; ar?: string }) => void) => {
    try { remplir(await completer(fr, actuel)); } catch { setErr(MESSAGE_ECHEC); }
  };
  const maj = (id: string, f: (c: Cat) => Cat) => setCats((l) => l!.map((c) => (c.id === id ? f(c) : c)));
  const supprimer = async (c: Cat) => { if (!window.confirm(`Supprimer la catégorie « ${c.nom.fr} » ? Ses produits restent, sans catégorie.`)) return; try { await ok(sb().from("categories").delete().eq("id", c.id)); await charger(); } catch (er) { setErr((er as Error).message); } };
  if (!cats) return <p className="opacity-60">Chargement…</p>;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Catégories</h1>
      {err && <p role="alert" className="mb-3 text-sm" style={{ color: "var(--promo)" }}>{err}</p>}{msg && <p className="mb-3 text-sm" style={{ color: "var(--stock)" }}>{msg}</p>}
      <ul className="space-y-2 mb-8">{cats.map((c) => (
        <li key={c.id} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_70px_auto_auto_auto] gap-2 items-center border trait p-3" data-testid="categorie">
          <input className="champ h-10" value={c.nom.fr ?? ""} onChange={(e) => maj(c.id, (x) => ({ ...x, nom: { ...x.nom, fr: e.target.value } }))} onBlur={() => void auto(c.nom.fr ?? "", c.nom, (t) => maj(c.id, (x) => ({ ...x, nom: { ...x.nom, ...t } })))} aria-label="Français" />
          <input className="champ h-10" value={c.nom.en ?? ""} onChange={(e) => maj(c.id, (x) => ({ ...x, nom: { ...x.nom, en: e.target.value } }))} aria-label="Anglais" />
          <input className="champ h-10" dir="rtl" value={c.nom.ar ?? ""} onChange={(e) => maj(c.id, (x) => ({ ...x, nom: { ...x.nom, ar: e.target.value } }))} aria-label="Arabe" />
          <input className="champ h-10" type="number" value={c.ordre} onChange={(e) => maj(c.id, (x) => ({ ...x, ordre: Number(e.target.value) }))} aria-label="Ordre" />
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={c.actif} onChange={(e) => maj(c.id, (x) => ({ ...x, actif: e.target.checked }))} />Visible</label>
          <button className="btn-ligne h-10" onClick={() => void sauver(c)}>Enregistrer</button>
          <button className="text-sm underline" style={{ color: "var(--promo)" }} onClick={() => void supprimer(c)}>Supprimer</button>
        </li>))}</ul>
      <form onSubmit={ajouter} className="border trait p-4 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <input className="champ h-10" placeholder="Nouvelle catégorie (français) *" value={nv.fr} onChange={(e) => setNv({ ...nv, fr: e.target.value })} onBlur={() => void auto(nv.fr, nv, (t) => setNv((o) => ({ ...o, ...t })))} data-testid="cat-fr" />
        <input className="champ h-10" placeholder="Anglais" value={nv.en} onChange={(e) => setNv({ ...nv, en: e.target.value })} />
        <input className="champ h-10" dir="rtl" placeholder="Arabe" value={nv.ar} onChange={(e) => setNv({ ...nv, ar: e.target.value })} />
        <button className="btn-plein h-10" data-testid="cat-ajouter">Ajouter</button>
      </form>
    </div>
  );
}

const TABLES_SAUVEGARDE = ["reglages", "categories", "produits", "variantes", "commandes", "lignes_commande", "mouvements_stock", "codes_promo", "avis", "abonnes_newsletter", "campagnes", "equipe"];
/** Télécharge un fichier JSON contenant toutes les données de la boutique (produits, commandes, clients abonnés…). */
function BoutonSauvegarde() {
  const [etat, setEtat] = useState(""), [occupe, setOccupe] = useState(false);
  const lancer = async () => {
    setOccupe(true); setEtat("");
    const sauv: Record<string, unknown> = { sauvegarde_le: new Date().toISOString() }; const manque: string[] = [];
    for (const t of TABLES_SAUVEGARDE) {
      const { data, error } = await sb().from(t).select("*").limit(100000);
      if (error) manque.push(t); else sauv[t] = data;
    }
    const u = URL.createObjectURL(new Blob([JSON.stringify(sauv, null, 2)], { type: "application/json" }));
    const el = document.createElement("a"); el.href = u; el.download = `sauvegarde-sweet-family-${new Date().toISOString().slice(0, 10)}.json`; el.click(); URL.revokeObjectURL(u);
    setEtat(manque.length ? `Sauvegarde téléchargée, sauf : ${manque.join(", ")}.` : "Sauvegarde téléchargée. Gardez-la dans un endroit sûr (elle contient les coordonnées de vos clients)."); setOccupe(false);
  };
  return (
    <div className="border-t trait pt-5 mt-2">
      <h2 className="font-bold">Sauvegarde</h2>
      <p className="text-sm opacity-70 mb-3">Télécharge un fichier avec tous vos produits, commandes, codes promo, avis et abonnés. Faites-le régulièrement (par exemple chaque semaine). Les photos restent hébergées en ligne et ne sont pas dans le fichier.</p>
      <button type="button" className="btn-ligne" onClick={() => void lancer()} disabled={occupe} data-testid="sauvegarde">Télécharger une sauvegarde</button>
      {etat && <p className="text-sm mt-2" style={{ color: "var(--stock)" }} data-testid="sauvegarde-etat">{etat}</p>}
    </div>
  );
}

export function Reglages() {
  const [r, setR] = useState<Reg | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  useEffect(() => { (async () => { try { setR(await ok<Reg>(sb().from("reglages").select("*").eq("id", 1).single())); } catch (e) { setErr((e as Error).message); } })(); }, []);
  if (!r) return err ? <p role="alert" style={{ color: "var(--promo)" }}>{err}</p> : <p className="opacity-60">Chargement…</p>;
  const champ = (k: keyof Reg, label: string, aide?: string, type = "text") => (
    <label className="block text-sm"><span className="font-medium">{label}</span>
      <input className="champ mt-1" type={type} value={String(r[k] ?? "")} onChange={(e) => setR({ ...r, [k]: type === "number" ? (e.target.value === "" ? (k === "livraison_gratuite_des" ? null : 0) : Number(e.target.value)) : e.target.value } as Reg)} data-testid={`reg-${k}`} />
      {aide && <span className="text-xs opacity-60">{aide}</span>}</label>
  );
  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (r.frais_livraison < 0 || (r.livraison_gratuite_des ?? 0) < 0 || r.seuil_stock_bas < 0) return setErr("Les montants ne peuvent pas être négatifs.");
    try { const { id: _i, textes: _t, ...reste } = r as Reg & { id?: number; textes?: unknown }; void _i; void _t; await ok(sb().from("reglages").update(reste).eq("id", 1)); setMsg("Réglages enregistrés."); } catch (er) { setErr((er as Error).message); }
  };
  return (
    <form onSubmit={enregistrer} className="space-y-5 max-w-xl">
      <h1 className="text-2xl font-bold">Réglages</h1>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--promo)" }}>{err}</p>}{msg && <p className="text-sm" style={{ color: "var(--stock)" }} data-testid="reg-message">{msg}</p>}
      {champ("nom_boutique", "Nom de la boutique")}
      <div className="grid sm:grid-cols-2 gap-4">{champ("frais_livraison", "Frais de livraison (MAD)", undefined, "number")}{champ("livraison_gratuite_des", "Livraison offerte dès (MAD)", "Laisser vide pour ne jamais l'offrir", "number")}</div>
      {champ("seuil_stock_bas", "Alerte de stock bas à partir de", "Nombre de pièces restantes", "number")}
      <h2 className="font-bold pt-2">Virement bancaire (affiché au client)</h2>
      {champ("virement_titulaire", "Titulaire du compte")}{champ("virement_banque", "Banque")}{champ("virement_rib", "RIB")}
      <h2 className="font-bold pt-2">Contact</h2>
      <p className="text-xs opacity-60 -mt-2">Ces informations s'affichent en bas du site, et le bouton WhatsApp ouvre une discussion avec ce numéro.</p>
      <div className="grid sm:grid-cols-2 gap-4">{champ("telephone", "Téléphone")}{champ("whatsapp", "WhatsApp", "Avec l'indicatif, sans + ni espaces : 212677859227")}</div>
      {champ("email_contact", "E-mail de contact")}
      {champ("adresse", "Adresse (facultatif)")}{champ("horaires", "Horaires (facultatif)", "Ex. Lun–Sam 10h–19h")}
      <h2 className="font-bold pt-2">Réseaux sociaux</h2>
      <p className="text-xs opacity-60 -mt-2">Collez l'adresse complète de la page (https://…). Laissez vide pour ne pas l'afficher.</p>
      {champ("instagram", "Instagram")}{champ("facebook", "Facebook")}{champ("tiktok", "TikTok")}
      <h2 className="font-bold pt-2">Newsletter</h2>
      {champ("newsletter_expediteur", "Expéditeur des e-mails", "Ex. Sweet Family <contact@swtfamily.com> (l'adresse doit être sur votre domaine vérifié)")}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!r.bienvenue_actif} onChange={(e) => setR({ ...r, bienvenue_actif: e.target.checked })} data-testid="reg-bienvenue_actif" />Envoyer automatiquement un e-mail de bienvenue aux nouveaux abonnés</label>
      {r.bienvenue_actif && <>{champ("bienvenue_sujet", "Sujet de l'e-mail de bienvenue")}<label className="block text-sm"><span className="font-medium">Message de bienvenue</span><textarea className="champ mt-1 !h-32 py-3" value={r.bienvenue_texte ?? ""} onChange={(e) => setR({ ...r, bienvenue_texte: e.target.value })} /></label></>}
      <button className="btn-plein" data-testid="reg-enregistrer">Enregistrer</button>
      <BoutonSauvegarde />
    </form>
  );
}

/** Modifier n'importe quel texte de la boutique (français, anglais, arabe). Seuls les textes changés sont enregistrés. */
export function TextesSite() {
  const [sur, setSur] = useState<Surcharges | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState(""), [q, setQ] = useState("");
  useEffect(() => { (async () => { try { const r = await ok<{ textes?: Surcharges }>(sb().from("reglages").select("*").eq("id", 1).single()); setSur(r.textes ?? {}); } catch (e) { setErr((e as Error).message); } })(); }, []);
  if (!sur) return err ? <p role="alert" style={{ color: "var(--promo)" }}>{err}</p> : <p className="opacity-60">Chargement…</p>;
  const lignes = TEXTES_SITE.filter((x) => !q.trim() || (x.fr + x.en + x.ar + JSON.stringify(sur[x.fr] ?? {})).toLowerCase().includes(q.trim().toLowerCase()));
  const val = (fr: string, l: "fr" | "en" | "ar", defaut: string) => sur[fr]?.[l] ?? defaut;
  const modif = (fr: string, l: "fr" | "en" | "ar", v: string, defaut: string) => {
    const cur = { ...(sur[fr] ?? {}), [l]: v };
    const nettoye = Object.fromEntries(Object.entries(cur).filter(([k, x]) => x !== "" && x !== (k === "fr" ? fr : (TEXTES_SITE.find((t) => t.fr === fr) as Record<string, string>)[k]))) as Surcharges[string];
    void defaut; const n = { ...sur }; if (Object.keys(nettoye).length) n[fr] = nettoye; else delete n[fr]; setSur(n);
  };
  const enregistrer = async () => {
    setErr(""); setMsg("");
    try { await ok(sb().from("reglages").update({ textes: sur }).eq("id", 1)); setMsg("Textes enregistrés : ils sont visibles tout de suite sur la boutique."); }
    catch (e) { const m = (e as Error).message; setErr(/textes/.test(m) ? "La base n'est pas à jour : exécutez le fichier SQL « nadir-shop-textes.sql » dans Supabase (SQL Editor), puis réessayez." : m); }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Textes du site</h1>
      <p className="text-sm opacity-70 max-w-2xl">Modifiez ici les phrases de la boutique dans les trois langues. Laissez un champ tel quel pour garder le texte d'origine. Ne touchez pas aux mots entre accolades, par exemple {"{n}"} : ils sont remplacés automatiquement (montant, nombre…).</p>
      <div className="flex gap-3 items-center flex-wrap"><input className="champ max-w-sm" placeholder="Rechercher un texte (ex. virement)" value={q} onChange={(e) => setQ(e.target.value)} data-testid="textes-recherche" /><button className="btn-plein" onClick={() => void enregistrer()} data-testid="textes-enregistrer">Enregistrer</button></div>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--promo)" }}>{err}</p>}{msg && <p className="text-sm" style={{ color: "var(--stock)" }} data-testid="textes-message">{msg}</p>}
      <div className="space-y-3">{lignes.map((x) => (
        <div key={x.fr} className="grid md:grid-cols-3 gap-2 border-b trait pb-3" data-testid="texte-ligne">
          {(["fr", "en", "ar"] as const).map((l) => <label key={l} className="text-xs block"><span className="opacity-60 uppercase">{l === "fr" ? "Français" : l === "en" ? "English" : "العربية"}</span>
            <textarea rows={2} dir={l === "ar" ? "rtl" : "ltr"} className="champ mt-1 text-sm" value={val(x.fr, l, l === "fr" ? x.fr : x[l])} onChange={(e) => modif(x.fr, l, e.target.value, "")} data-testid={`texte-${l}`} /></label>)}
          <button type="button" className="text-xs underline justify-self-start md:col-span-3" data-testid="texte-traduire" onClick={async () => { try { const fr = sur[x.fr]?.fr ?? x.fr; const [en, ar] = await Promise.all([traduire(fr, "en"), traduire(fr, "ar")]); setSur((o) => ({ ...o!, [x.fr]: { ...(o![x.fr] ?? {}), en, ar } })); } catch { setErr(MESSAGE_ECHEC); } }}>Traduire en anglais et arabe depuis le français</button>
        </div>))}{lignes.length === 0 && <p className="opacity-60">Aucun texte ne correspond.</p>}</div>
    </div>
  );
}

type Abonne = { id: string; email: string; langue: string; actif: boolean; token: string; source: string; created_at: string };
/** Liste des abonnés à la newsletter : copier, exporter, retirer. */
export function Newsletter() {
  const [l, setL] = useState<Abonne[] | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState(""), [q, setQ] = useState("");
  const charger = async () => { try { setL(await ok<Abonne[]>(sb().from("abonnes_newsletter").select("*").order("created_at", { ascending: false }))); } catch (e) { const m = (e as Error).message; setErr(/abonnes_newsletter/.test(m) ? "La base n'est pas à jour : exécutez le fichier SQL « sweet-family-comptes-clients.sql » dans Supabase (SQL Editor), puis rouvrez cette page." : m); } };
  useEffect(() => { void charger(); }, []);
  if (!l) return err ? <p role="alert" style={{ color: "var(--promo)" }}>{err}</p> : <p className="opacity-60">Chargement…</p>;
  const actifs = l.filter((a) => a.actif);
  const vue = l.filter((a) => !q.trim() || a.email.includes(q.trim().toLowerCase()));
  const lien = (a: Abonne) => `${location.origin}/newsletter/desabonnement?t=${a.token}`;
  const copier = async () => { try { await navigator.clipboard.writeText(actifs.map((a) => a.email).join(", ")); setMsg(`${actifs.length} adresses copiées : collez-les dans le champ « Cci » de votre messagerie.`); } catch { setErr("Copie impossible : sélectionnez les adresses à la main."); } };
  const exporter = () => {
    const csv = "﻿email;langue;inscrit_le;lien_desinscription\r\n" + actifs.map((a) => [a.email, a.langue, a.created_at.slice(0, 10), lien(a)].join(";")).join("\r\n");
    const u = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const el = document.createElement("a"); el.href = u; el.download = "newsletter-abonnes.csv"; el.click(); URL.revokeObjectURL(u);
  };
  const changer = async (a: Abonne, actif: boolean) => { try { await ok(sb().from("abonnes_newsletter").update({ actif }).eq("id", a.id)); await charger(); } catch (e) { setErr((e as Error).message); } };
  const retirer = async (a: Abonne) => { if (!window.confirm(`Supprimer définitivement ${a.email} ?`)) return; try { await ok(sb().from("abonnes_newsletter").delete().eq("id", a.id)); await charger(); } catch (e) { setErr((e as Error).message); } };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Newsletter</h1>
      <p className="text-sm opacity-70 max-w-2xl">Les visiteurs s'inscrivent depuis le bas du site ou en créant leur compte. <b>{actifs.length}</b> abonné(s) actif(s) sur {l.length}. Pour envoyer un message : copiez les adresses puis collez-les dans le champ « Cci » (copie cachée) de votre messagerie. Le fichier Excel contient aussi le lien de désinscription personnel de chaque abonné.</p>
      <div className="flex flex-wrap gap-3 items-center">
        <button className="btn-plein" onClick={() => void copier()} disabled={!actifs.length} data-testid="news-copier">Copier les adresses</button>
        <button className="btn-ligne" onClick={exporter} disabled={!actifs.length} data-testid="news-export">Exporter (Excel)</button>
        <input className="champ max-w-xs" placeholder="Rechercher une adresse" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--promo)" }}>{err}</p>}{msg && <p className="text-sm" style={{ color: "var(--stock)" }}>{msg}</p>}
      <table className="w-full text-sm border trait"><thead className="bg-[var(--gris)]"><tr><th className="text-start p-2">Adresse</th><th className="text-start p-2">Langue</th><th className="text-start p-2">Inscrit le</th><th className="text-start p-2">Statut</th><th /></tr></thead>
        <tbody>{vue.map((a) => <tr key={a.id} className="border-t trait" data-testid="abonne"><td className="p-2" dir="ltr">{a.email}</td><td className="p-2 uppercase">{a.langue}</td><td className="p-2">{a.created_at.slice(0, 10)}</td><td className="p-2">{a.actif ? "Abonné" : "Désinscrit"}</td>
          <td className="p-2 text-end whitespace-nowrap"><button className="underline me-3" onClick={() => void changer(a, !a.actif)}>{a.actif ? "Désinscrire" : "Réactiver"}</button><button className="underline" style={{ color: "var(--promo)" }} onClick={() => void retirer(a)}>Supprimer</button></td></tr>)}
          {vue.length === 0 && <tr><td className="p-4 opacity-60" colSpan={5}>Aucun abonné pour le moment.</td></tr>}</tbody></table>
      <Campagnes />
    </div>
  );
}
