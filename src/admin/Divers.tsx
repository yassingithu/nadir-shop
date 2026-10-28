import { useEffect, useState } from "react";
import { ok, sb, slugify, type Cat, type Reg } from "./db";

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
  const maj = (id: string, f: (c: Cat) => Cat) => setCats((l) => l!.map((c) => (c.id === id ? f(c) : c)));
  const supprimer = async (c: Cat) => { if (!window.confirm(`Supprimer la catégorie « ${c.nom.fr} » ? Ses produits restent, sans catégorie.`)) return; try { await ok(sb().from("categories").delete().eq("id", c.id)); await charger(); } catch (er) { setErr((er as Error).message); } };
  if (!cats) return <p className="opacity-60">Chargement…</p>;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Catégories</h1>
      {err && <p role="alert" className="mb-3 text-sm" style={{ color: "var(--promo)" }}>{err}</p>}{msg && <p className="mb-3 text-sm" style={{ color: "var(--stock)" }}>{msg}</p>}
      <ul className="space-y-2 mb-8">{cats.map((c) => (
        <li key={c.id} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_70px_auto_auto_auto] gap-2 items-center border trait p-3" data-testid="categorie">
          <input className="champ h-10" value={c.nom.fr ?? ""} onChange={(e) => maj(c.id, (x) => ({ ...x, nom: { ...x.nom, fr: e.target.value } }))} aria-label="Français" />
          <input className="champ h-10" value={c.nom.en ?? ""} onChange={(e) => maj(c.id, (x) => ({ ...x, nom: { ...x.nom, en: e.target.value } }))} aria-label="Anglais" />
          <input className="champ h-10" dir="rtl" value={c.nom.ar ?? ""} onChange={(e) => maj(c.id, (x) => ({ ...x, nom: { ...x.nom, ar: e.target.value } }))} aria-label="Arabe" />
          <input className="champ h-10" type="number" value={c.ordre} onChange={(e) => maj(c.id, (x) => ({ ...x, ordre: Number(e.target.value) }))} aria-label="Ordre" />
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={c.actif} onChange={(e) => maj(c.id, (x) => ({ ...x, actif: e.target.checked }))} />Visible</label>
          <button className="btn-ligne h-10" onClick={() => void sauver(c)}>Enregistrer</button>
          <button className="text-sm underline" style={{ color: "var(--promo)" }} onClick={() => void supprimer(c)}>Supprimer</button>
        </li>))}</ul>
      <form onSubmit={ajouter} className="border trait p-4 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <input className="champ h-10" placeholder="Nouvelle catégorie (français) *" value={nv.fr} onChange={(e) => setNv({ ...nv, fr: e.target.value })} data-testid="cat-fr" />
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
    try { const { id: _i, ...reste } = r as Reg & { id?: number }; void _i; await ok(sb().from("reglages").update(reste).eq("id", 1)); setMsg("Réglages enregistrés."); } catch (er) { setErr((er as Error).message); }
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
