import { useEffect, useState } from "react";
import { ok, sb } from "./db";
import { Etoiles } from "../lib/Etoiles";

const mad = (n: number) => `${Math.round(n * 100) / 100} MAD`;
const erreurBase = (m: string, fichier: string) => (/does not exist|schema cache|Could not find/i.test(m) ? `La base n'est pas à jour : exécutez le fichier SQL « ${fichier} » dans Supabase (SQL Editor), puis rouvrez cette page.` : m);
const FICHIER = "sweet-family-promos-avis-visites.sql";

/* ───────────── Codes promo ───────────── */
type Code = { id: string; code: string; type: "pourcentage" | "montant" | "livraison"; valeur: number; minimum: number; debut: string | null; fin: string | null; max_utilisations: number | null; utilisations: number; une_par_client: boolean; actif: boolean };
const VIDE = { code: "", type: "pourcentage" as Code["type"], valeur: 10, minimum: 0, debut: "", fin: "", max_utilisations: "", une_par_client: true };
const libType = (c: Code) => (c.type === "pourcentage" ? `-${c.valeur} %` : c.type === "montant" ? `-${mad(c.valeur)}` : "Livraison offerte");

export function CodesPromo() {
  const [liste, setListe] = useState<Code[] | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [f, setF] = useState(VIDE);
  const charger = async () => { try { setListe(await ok<Code[]>(sb().from("codes_promo").select("*").order("created_at", { ascending: false }))); } catch (e) { setErr(erreurBase((e as Error).message, FICHIER)); } };
  useEffect(() => { void charger(); }, []);
  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    const code = f.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return setErr("Saisissez un code (ex. BIENVENUE10).");
    if (f.type === "pourcentage" && (f.valeur <= 0 || f.valeur > 100)) return setErr("Le pourcentage doit être entre 1 et 100.");
    if (f.type === "montant" && f.valeur <= 0) return setErr("Le montant doit être supérieur à 0.");
    if (f.debut && f.fin && f.fin < f.debut) return setErr("La date de fin est avant la date de début.");
    try {
      await ok(sb().from("codes_promo").insert({ code, type: f.type, valeur: f.type === "livraison" ? 0 : f.valeur, minimum: f.minimum || 0, debut: f.debut || null, fin: f.fin || null, max_utilisations: f.max_utilisations === "" ? null : Number(f.max_utilisations), une_par_client: f.une_par_client }));
      setF(VIDE); setMsg(`Code ${code} créé.`); await charger();
    } catch (er) { const m = (er as Error).message; setErr(/duplicate|unique/i.test(m) ? "Ce code existe déjà." : erreurBase(m, FICHIER)); }
  };
  const basculer = async (c: Code) => { try { await ok(sb().from("codes_promo").update({ actif: !c.actif }).eq("id", c.id)); await charger(); } catch (e) { setErr((e as Error).message); } };
  const supprimer = async (c: Code) => { if (!window.confirm(`Supprimer le code ${c.code} ?`)) return; try { await ok(sb().from("codes_promo").delete().eq("id", c.id)); await charger(); } catch (e) { setErr((e as Error).message); } };
  const champ = "block text-sm";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Codes promo</h1>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--promo)" }}>{err}</p>}{msg && <p className="text-sm" style={{ color: "var(--stock)" }} data-testid="promo-message">{msg}</p>}
      <form onSubmit={ajouter} className="border trait p-4 grid sm:grid-cols-3 gap-3" data-testid="form-promo">
        <label className={champ}><span className="font-medium">Code</span><input className="champ mt-1 uppercase" dir="ltr" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="BIENVENUE10" data-testid="promo-code" /></label>
        <label className={champ}><span className="font-medium">Type de réduction</span><select className="champ mt-1" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Code["type"] })} data-testid="promo-type"><option value="pourcentage">Pourcentage (%)</option><option value="montant">Montant fixe (MAD)</option><option value="livraison">Livraison offerte</option></select></label>
        {f.type !== "livraison" && <label className={champ}><span className="font-medium">{f.type === "pourcentage" ? "Pourcentage" : "Montant (MAD)"}</span><input className="champ mt-1" type="number" min="0" value={f.valeur} onChange={(e) => setF({ ...f, valeur: Number(e.target.value) })} data-testid="promo-valeur" /></label>}
        <label className={champ}><span className="font-medium">Achat minimum (MAD)</span><input className="champ mt-1" type="number" min="0" value={f.minimum} onChange={(e) => setF({ ...f, minimum: Number(e.target.value) })} /></label>
        <label className={champ}><span className="font-medium">Valable à partir du</span><input className="champ mt-1" type="date" value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} /></label>
        <label className={champ}><span className="font-medium">Jusqu'au (inclus)</span><input className="champ mt-1" type="date" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} /></label>
        <label className={champ}><span className="font-medium">Nombre d'utilisations maximum</span><input className="champ mt-1" type="number" min="1" placeholder="Illimité" value={f.max_utilisations} onChange={(e) => setF({ ...f, max_utilisations: e.target.value })} /></label>
        <label className="text-sm flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={f.une_par_client} onChange={(e) => setF({ ...f, une_par_client: e.target.checked })} />Une seule utilisation par client</label>
        <button className="btn-plein sm:col-span-3 sm:w-fit" data-testid="promo-creer">Créer le code</button>
      </form>
      {!liste ? (err ? null : <p className="opacity-60">Chargement…</p>) : (
        <table className="w-full text-sm border trait"><thead className="bg-[var(--gris)]"><tr>{["Code", "Réduction", "Conditions", "Utilisé", "Statut", ""].map((h) => <th key={h} className="text-start p-2">{h}</th>)}</tr></thead>
          <tbody>{liste.map((c) => (
            <tr key={c.id} className="border-t trait" data-testid="ligne-promo">
              <td className="p-2 font-semibold" dir="ltr">{c.code}</td><td className="p-2">{libType(c)}</td>
              <td className="p-2 text-xs opacity-75">{[c.minimum > 0 && `dès ${mad(c.minimum)}`, c.debut && `du ${c.debut}`, c.fin && `au ${c.fin}`, c.une_par_client && "1 fois/client"].filter(Boolean).join(" · ") || "—"}</td>
              <td className="p-2">{c.utilisations}{c.max_utilisations ? ` / ${c.max_utilisations}` : ""}</td>
              <td className="p-2">{c.actif ? "Actif" : "Désactivé"}</td>
              <td className="p-2 text-end whitespace-nowrap"><button className="underline me-3" onClick={() => void basculer(c)}>{c.actif ? "Désactiver" : "Activer"}</button><button className="underline" style={{ color: "var(--promo)" }} onClick={() => void supprimer(c)}>Supprimer</button></td>
            </tr>))}
            {liste.length === 0 && <tr><td className="p-4 opacity-60" colSpan={6}>Aucun code pour le moment.</td></tr>}</tbody></table>
      )}
    </div>
  );
}

/* ───────────── Avis ───────────── */
type AvisA = { id: string; nom_affiche: string; note: number; titre: string; texte: string; statut: "attente" | "publie" | "refuse"; reponse: string | null; created_at: string; produits: { nom: { fr: string } } | null };
const LIB: Record<string, string> = { attente: "En attente", publie: "Publié", refuse: "Refusé" };

export function AvisAdmin() {
  const [l, setL] = useState<AvisA[] | null>(null), [err, setErr] = useState(""), [filtre, setFiltre] = useState("attente");
  const [rep, setRep] = useState<Record<string, string>>({});
  const charger = async () => { try { setL(await ok<AvisA[]>(sb().from("avis").select("*, produits(nom)").order("created_at", { ascending: false }))); } catch (e) { setErr(erreurBase((e as Error).message, FICHIER)); } };
  useEffect(() => { void charger(); }, []);
  if (!l) return err ? <p role="alert" style={{ color: "var(--promo)" }}>{err}</p> : <p className="opacity-60">Chargement…</p>;
  const maj = async (a: AvisA, champs: Partial<AvisA>) => { setErr(""); try { await ok(sb().from("avis").update(champs).eq("id", a.id)); await charger(); } catch (e) { setErr((e as Error).message); } };
  const supprimer = async (a: AvisA) => { if (!window.confirm("Supprimer définitivement cet avis ?")) return; try { await ok(sb().from("avis").delete().eq("id", a.id)); await charger(); } catch (e) { setErr((e as Error).message); } };
  const nb = (s: string) => l.filter((a) => a.statut === s).length;
  const vue = l.filter((a) => !filtre || a.statut === filtre);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Avis des clients</h1>
      <p className="text-sm opacity-70 max-w-2xl">Seuls les clients dont la commande a été expédiée ou livrée peuvent laisser un avis. Chaque avis doit être publié par vous avant d'apparaître sur le site.</p>
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtre">{(["attente", "publie", "refuse", ""] as const).map((s) => <button key={s} onClick={() => setFiltre(s)} aria-pressed={filtre === s} data-testid={`avis-filtre-${s || "tous"}`} className={`px-3 h-9 text-sm border trait ${filtre === s ? "bg-[var(--marque)] text-white" : ""}`}>{s ? `${LIB[s]} (${nb(s)})` : `Tous (${l.length})`}</button>)}</div>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--promo)" }}>{err}</p>}
      {vue.length === 0 && <p className="opacity-60">Aucun avis dans cette catégorie.</p>}
      <ul className="space-y-3">{vue.map((a) => (
        <li key={a.id} className="border trait p-4 space-y-2 text-sm" data-testid="avis-admin">
          <div className="flex flex-wrap items-center gap-3"><Etoiles note={a.note} /><b>{a.nom_affiche}</b><span className="opacity-60">{a.produits?.nom.fr ?? "Produit supprimé"}</span><span className="opacity-50">{a.created_at.slice(0, 10)}</span><span className="px-2 py-0.5 text-xs border trait">{LIB[a.statut]}</span></div>
          {a.titre && <p className="font-semibold">{a.titre}</p>}{a.texte && <p className="whitespace-pre-line">{a.texte}</p>}
          <div className="flex gap-2 items-start flex-wrap"><textarea className="champ !h-16 py-2 flex-1 min-w-[200px]" placeholder="Votre réponse publique (facultatif)" value={rep[a.id] ?? a.reponse ?? ""} onChange={(e) => setRep({ ...rep, [a.id]: e.target.value })} />
            <button className="btn-ligne !h-10" onClick={() => void maj(a, { reponse: (rep[a.id] ?? a.reponse ?? "").trim() || null })}>Enregistrer la réponse</button></div>
          <div className="flex gap-4">
            {a.statut !== "publie" && <button className="underline font-semibold" onClick={() => void maj(a, { statut: "publie" })} data-testid="avis-publier">Publier</button>}
            {a.statut !== "refuse" && <button className="underline" onClick={() => void maj(a, { statut: "refuse" })} data-testid="avis-refuser">Refuser</button>}
            <button className="underline" style={{ color: "var(--promo)" }} onClick={() => void supprimer(a)}>Supprimer</button>
          </div>
        </li>))}</ul>
    </div>
  );
}

/* ───────────── Statistiques ───────────── */
type Stats = { jours: { jour: string; vues: number; visiteurs: number }[]; total_vues: number; total_visiteurs: number; aujourdhui_vues: number; aujourdhui_visiteurs: number; pages: { chemin: string; vues: number; visiteurs: number }[]; sources: { source: string; visiteurs: number }[]; langues: { langue: string; visiteurs: number }[]; commandes: number; chiffre: number };

export function Statistiques() {
  const [jours, setJours] = useState(30), [s, setS] = useState<Stats | null>(null), [err, setErr] = useState("");
  useEffect(() => { setS(null); (async () => { try { const { data, error } = await sb().rpc("stats_visites", { p_jours: jours }); if (error) throw new Error(error.message); setS(data as Stats); } catch (e) { setErr(erreurBase((e as Error).message, FICHIER)); } })(); }, [jours]);
  if (!s) return err ? <p role="alert" style={{ color: "var(--promo)" }}>{err}</p> : <p className="opacity-60">Chargement…</p>;
  const max = Math.max(1, ...s.jours.map((j) => j.visiteurs));
  const tuile = (titre: string, val: string, tid: string) => <div className="border trait p-4"><p className="text-xs opacity-60">{titre}</p><p className="text-2xl font-bold mt-1" data-testid={tid}>{val}</p></div>;
  const conv = s.total_visiteurs ? ((s.commandes / s.total_visiteurs) * 100).toFixed(1) : "0";
  const LANG: Record<string, string> = { fr: "Français", en: "Anglais", ar: "Arabe" };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap"><h1 className="text-2xl font-bold">Statistiques</h1>
        <select className="champ max-w-[180px]" value={jours} onChange={(e) => setJours(Number(e.target.value))} aria-label="Période" data-testid="stats-periode"><option value={7}>7 derniers jours</option><option value={30}>30 derniers jours</option><option value={90}>90 derniers jours</option></select></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tuile("Visiteurs aujourd'hui", String(s.aujourdhui_visiteurs), "st-auj")}{tuile(`Visiteurs (${jours} j)`, String(s.total_visiteurs), "st-vis")}
        {tuile(`Pages vues (${jours} j)`, String(s.total_vues), "st-vues")}{tuile(`Commandes (${jours} j)`, `${s.commandes} · ${mad(s.chiffre)}`, "st-cmd")}
      </div>
      <p className="text-xs opacity-60">Taux de commande : {conv} % des visiteurs. Le comptage ne dépose aucun cookie et ne garde aucune donnée personnelle ; un même visiteur est recompté chaque jour.</p>
      <section><h2 className="font-bold mb-2">Visiteurs par jour</h2>
        <div className="flex items-end gap-px h-36 border-b trait" role="img" aria-label="Graphique des visiteurs par jour">{s.jours.map((j) => <div key={j.jour} title={`${j.jour} : ${j.visiteurs} visiteur(s), ${j.vues} page(s)`} className="flex-1 min-w-[2px]" style={{ height: `${(j.visiteurs / max) * 100}%`, minHeight: j.visiteurs ? 2 : 0, background: "var(--marque)" }} />)}</div>
        <p className="text-xs opacity-50 mt-1 flex justify-between" dir="ltr"><span>{s.jours[0]?.jour}</span><span>{s.jours[s.jours.length - 1]?.jour}</span></p></section>
      <div className="grid md:grid-cols-3 gap-6 text-sm">
        <section><h2 className="font-bold mb-2">Pages les plus vues</h2>{s.pages.length === 0 && <p className="opacity-60">Aucune visite pour le moment.</p>}<ul className="space-y-1">{s.pages.map((p) => <li key={p.chemin} className="flex justify-between gap-3"><span dir="ltr" className="truncate">{p.chemin}</span><span>{p.vues}</span></li>)}</ul></section>
        <section><h2 className="font-bold mb-2">D'où viennent les visiteurs</h2><ul className="space-y-1">{s.sources.map((p) => <li key={p.source} className="flex justify-between gap-3"><span dir="ltr" className="truncate">{p.source}</span><span>{p.visiteurs}</span></li>)}</ul></section>
        <section><h2 className="font-bold mb-2">Langues</h2><ul className="space-y-1">{s.langues.map((p) => <li key={p.langue} className="flex justify-between"><span>{LANG[p.langue] ?? p.langue}</span><span>{p.visiteurs}</span></li>)}</ul></section>
      </div>
    </div>
  );
}

/* ───────────── Campagnes newsletter ───────────── */
type Camp = { id: string; sujet: string; contenu: string; statut: string; planifiee_le: string | null; envoyee_le: string | null; nb_envoyes: number; nb_erreurs: number; erreur: string | null; created_at: string };
const LIBC: Record<string, string> = { brouillon: "Brouillon", planifiee: "Planifiée", envoi: "Envoi en cours", envoyee: "Envoyée", erreur: "Erreur" };
const aLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function Campagnes() {
  const [l, setL] = useState<Camp[] | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [id, setId] = useState<string | null>(null), [sujet, setSujet] = useState(""), [contenu, setContenu] = useState(""), [quand, setQuand] = useState(""), [test, setTest] = useState("");
  const charger = async () => { try { setL(await ok<Camp[]>(sb().from("campagnes").select("*").order("created_at", { ascending: false }))); } catch (e) { setErr(erreurBase((e as Error).message, FICHIER)); } };
  useEffect(() => { void charger(); }, []);
  const vider = () => { setId(null); setSujet(""); setContenu(""); setQuand(""); };
  const appeler = async (corps: Record<string, unknown>) => {
    const { data, error } = await sb().functions.invoke("newsletter", { body: corps });
    if (error) { const m = (error as { message?: string }).message ?? ""; throw new Error(/Failed to send|not found|404|FunctionsFetchError|Relay/i.test(m) ? "L'envoi automatique n'est pas encore activé : suivez les étapes « Envoi automatique » (fonction « newsletter » à déployer dans Supabase)." : m); }
    if ((data as { erreur?: string })?.erreur) throw new Error((data as { erreur: string }).erreur);
    return data as Record<string, unknown>;
  };
  const sauver = async (statut: "brouillon" | "planifiee"): Promise<string | null> => {
    setErr(""); setMsg("");
    if (!sujet.trim() || !contenu.trim()) { setErr("Le sujet et le message sont obligatoires."); return null; }
    if (statut === "planifiee" && (!quand || new Date(quand).getTime() < Date.now() - 60000)) { setErr("Choisissez une date et une heure dans le futur."); return null; }
    const champs = { sujet: sujet.trim(), contenu: contenu.trim(), statut, planifiee_le: statut === "planifiee" ? new Date(quand).toISOString() : null };
    try {
      let cid = id;
      if (cid) await ok(sb().from("campagnes").update(champs).eq("id", cid));
      else { const r = await ok<{ id: string }>(sb().from("campagnes").insert(champs).select("id").single()); cid = r.id; setId(cid); }
      await charger(); return cid;
    } catch (e) { setErr(erreurBase((e as Error).message, FICHIER)); return null; }
  };
  const envoyerTest = async () => {
    setErr(""); setMsg(""); if (!sujet.trim() || !contenu.trim() || !test.includes("@")) return setErr("Saisissez un sujet, un message et votre adresse e-mail pour le test.");
    try { await appeler({ action: "test", sujet, contenu, a: test.trim() }); setMsg(`E-mail de test envoyé à ${test.trim()}.`); } catch (e) { setErr((e as Error).message); }
  };
  const envoyerMaintenant = async () => {
    const cid = await sauver("brouillon"); if (!cid) return;
    if (!window.confirm("Envoyer cette campagne MAINTENANT à tous les abonnés actifs ? Cette action est définitive.")) return;
    try { const r = await appeler({ action: "envoyer", id: cid }); setMsg(`Campagne envoyée : ${r.envoyes ?? 0} message(s), ${r.erreurs ?? 0} erreur(s).`); vider(); await charger(); } catch (e) { setErr((e as Error).message); await charger(); }
  };
  const planifier = async () => { const cid = await sauver("planifiee"); if (cid) { setMsg("Campagne planifiée : elle partira automatiquement à l'heure choisie."); vider(); } };
  const brouillon = async () => { if (await sauver("brouillon")) setMsg("Brouillon enregistré."); };
  const ouvrir = (c: Camp) => { setId(c.id); setSujet(c.sujet); setContenu(c.contenu); setQuand(aLocal(c.planifiee_le)); setMsg(""); setErr(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const supprimer = async (c: Camp) => { if (!window.confirm("Supprimer cette campagne ?")) return; try { await ok(sb().from("campagnes").delete().eq("id", c.id)); if (id === c.id) vider(); await charger(); } catch (e) { setErr((e as Error).message); } };
  const modifiable = !id || ["brouillon", "planifiee", "erreur"].includes(l?.find((c) => c.id === id)?.statut ?? "brouillon");
  return (
    <section className="space-y-4 pt-6 border-t trait mt-8" data-testid="campagnes">
      <h2 className="text-xl font-bold">Campagnes (envoi automatique)</h2>
      <p className="text-sm opacity-70 max-w-2xl">Rédigez un message, envoyez-le tout de suite ou programmez-le : il part tout seul à l'heure choisie vers tous les abonnés actifs, avec un lien de désinscription ajouté automatiquement. Écrivez en texte simple ; les lignes vides séparent les paragraphes, et les adresses web deviennent des liens.</p>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--promo)" }} data-testid="camp-erreur">{err}</p>}{msg && <p className="text-sm" style={{ color: "var(--stock)" }} data-testid="camp-message">{msg}</p>}
      <div className="border trait p-4 space-y-3 max-w-2xl">
        <p className="font-semibold text-sm">{id ? "Modifier la campagne" : "Nouvelle campagne"}</p>
        <input className="champ" placeholder="Sujet de l'e-mail" value={sujet} maxLength={150} onChange={(e) => setSujet(e.target.value)} disabled={!modifiable} data-testid="camp-sujet" />
        <textarea className="champ !h-48 py-3" placeholder="Votre message…" value={contenu} onChange={(e) => setContenu(e.target.value)} disabled={!modifiable} data-testid="camp-contenu" />
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-sm"><span className="block font-medium">Programmer pour le</span><input className="champ !h-10" type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} disabled={!modifiable} data-testid="camp-quand" /></label>
          <button className="btn-ligne !h-10" onClick={() => void planifier()} disabled={!modifiable} data-testid="camp-planifier">Programmer l'envoi</button>
          <button className="btn-plein !h-10" onClick={() => void envoyerMaintenant()} disabled={!modifiable} data-testid="camp-envoyer">Envoyer maintenant</button>
          <button className="underline text-sm h-10" onClick={() => void brouillon()} disabled={!modifiable} data-testid="camp-brouillon">Enregistrer le brouillon</button>
          {id && <button className="underline text-sm h-10" onClick={vider}>Nouvelle campagne</button>}
        </div>
        <div className="flex flex-wrap gap-2 items-center text-sm"><input className="champ !h-10 max-w-xs" type="email" dir="ltr" placeholder="Votre adresse pour un test" value={test} onChange={(e) => setTest(e.target.value)} data-testid="camp-test-mail" /><button className="btn-ligne !h-10" onClick={() => void envoyerTest()} data-testid="camp-test">Envoyer un test</button></div>
      </div>
      {l && l.length > 0 && <table className="w-full text-sm border trait"><thead className="bg-[var(--gris)]"><tr>{["Sujet", "Statut", "Date", "Résultat", ""].map((h) => <th key={h} className="text-start p-2">{h}</th>)}</tr></thead>
        <tbody>{l.map((c) => <tr key={c.id} className="border-t trait" data-testid="campagne"><td className="p-2">{c.sujet}</td><td className="p-2">{LIBC[c.statut] ?? c.statut}</td>
          <td className="p-2">{(c.envoyee_le ?? c.planifiee_le ?? c.created_at).slice(0, 16).replace("T", " ")}</td><td className="p-2">{c.statut === "envoyee" || c.nb_envoyes ? `${c.nb_envoyes} envoyé(s)${c.nb_erreurs ? `, ${c.nb_erreurs} erreur(s)` : ""}` : c.erreur ?? "—"}</td>
          <td className="p-2 text-end whitespace-nowrap"><button className="underline me-3" onClick={() => ouvrir(c)}>{["envoyee", "envoi"].includes(c.statut) ? "Voir" : "Modifier"}</button><button className="underline" style={{ color: "var(--promo)" }} onClick={() => void supprimer(c)}>Supprimer</button></td></tr>)}</tbody></table>}
    </section>
  );
}
