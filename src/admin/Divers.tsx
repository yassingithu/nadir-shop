import { useEffect, useState } from "react";
import { ok, sb, slugify, type Cat, type Reg } from "./db";
import { TEXTES_SITE, type Surcharges } from "../lib/i18n";
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
      <div className="grid sm:grid-cols-2 gap-4">{champ("telephone", "Téléphone")}{champ("whatsapp", "WhatsApp", "Avec l'indicatif, ex. 212612345678")}</div>
      <button className="btn-plein" data-testid="reg-enregistrer">Enregistrer</button>
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
