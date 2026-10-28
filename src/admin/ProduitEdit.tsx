import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { ok, sb, slugify, type Cat, type Prod, type Var } from "./db";
import { comparerTailles, TAILLES_BEBE, TAILLES_ENFANT } from "../lib/tailles";
import { completer, MESSAGE_ECHEC } from "./traduire";
import Exemple, { type Vue } from "../lib/exemples";

const GUIDE: { vue: Vue; titre: string; conseil: string }[] = [
  { vue: "face", titre: "1. De face", conseil: "Article à plat ou sur cintre, bien droit, fond uni clair. C'est la photo de la liste." },
  { vue: "dos", titre: "2. De dos", conseil: "Même cadrage et même lumière que la face." },
  { vue: "detail", titre: "3. Détail", conseil: "Gros plan sur la matière, la couture ou la finition." },
  { vue: "etiquette", titre: "4. Étiquette", conseil: "Taille, composition, marque : le client veut la voir." },
  { vue: "porte", titre: "5. Porté", conseil: "Sur une personne ou un mannequin, pour montrer la coupe." },
  { vue: "plat", titre: "6. Plusieurs coloris", conseil: "Les couleurs disponibles côte à côte." },
  { vue: "ensemble", titre: "Autre article : de face", conseil: "Matériel, accessoire, appareil : tout l'objet visible, fond uni." },
  { vue: "gros-plan", titre: "Autre article : détail", conseil: "Bouton, prise, finition : ce qui prouve la qualité." },
  { vue: "echelle", titre: "Autre article : taille", conseil: "Objet tenu en main ou à côté d'une règle, pour comprendre sa taille." },
  { vue: "emballage", titre: "Autre article : emballage", conseil: "Le carton ou la boîte tel que le client le recevra." },
];

type Ligne = { id?: string; taille: string; stock: number; prix: string; actif: boolean; ancien?: number };
const vide: Prod = { id: "", slug: "", categorie_id: null, nom: { fr: "", en: "", ar: "" }, description: { fr: "", en: "", ar: "" }, prix: 0, prix_barre: null, photos: [], options: [], actif: true };

export default function ProduitEdit() {
  const { id } = useParams(), nouveau = id === "nouveau", nav = useNavigate();
  const [p, setP] = useState<Prod>({ ...vide, id: crypto.randomUUID() });
  const [lignes, setLignes] = useState<Ligne[]>([]), [cats, setCats] = useState<Cat[]>([]);
  const [avance, setAvance] = useState(false), [tailles, setTailles] = useState(""), [msg, setMsg] = useState(""), [err, setErr] = useState(""), [envoi, setEnvoi] = useState(false), [prixTxt, setPrixTxt] = useState(""), [barreTxt, setBarreTxt] = useState("");
  useEffect(() => {
    (async () => {
      try {
        setCats(await ok<Cat[]>(sb().from("categories").select("*").order("ordre")));
        if (!nouveau) {
          const prod = await ok<Prod>(sb().from("produits").select("*").eq("id", id!).single());
          const vs = await ok<Var[]>(sb().from("variantes").select("*").eq("produit_id", id!));
          setP(prod); setPrixTxt(String(prod.prix)); setBarreTxt(prod.prix_barre == null ? "" : String(prod.prix_barre));
          setLignes([...(vs ?? [])].sort((a, b) => comparerTailles(a.valeurs.taille ?? "", b.valeurs.taille ?? "")).map((v) => ({ id: v.id, taille: v.valeurs.taille ?? "Unique", stock: v.stock, prix: v.prix == null ? "" : String(v.prix), actif: v.actif, ancien: v.stock })));
        }
      } catch (e) { setErr((e as Error).message); }
    })();
  }, [id, nouveau]);

  const [trad, setTrad] = useState("");
  /** Traduit automatiquement le nom et la description (anglais + arabe) à partir du français. Sans écraser ce qui est déjà écrit, sauf demande. */
  const traduireTout = async (ecraser = false) => {
    if (!p.nom.fr.trim() && !p.description.fr?.trim()) return;
    setTrad("Traduction en cours…"); setErr("");
    try {
      const n = await completer(p.nom.fr, p.nom, ecraser), d = await completer(p.description.fr ?? "", p.description, ecraser);
      const fusion = (cur: Prod["nom"], t: { en?: string; ar?: string }) => ({ ...cur, ...(t.en && (ecraser || !cur.en?.trim()) ? { en: t.en } : {}), ...(t.ar && (ecraser || !cur.ar?.trim()) ? { ar: t.ar } : {}) });
      setP((x) => ({ ...x, nom: fusion(x.nom, n), description: fusion(x.description, d) }));
      setTrad(Object.keys(n).length + Object.keys(d).length ? "Traduit automatiquement : relisez l'anglais et l'arabe avant d'enregistrer." : "");
    } catch { setTrad(""); setErr(MESSAGE_ECHEC); }
  };
  const maj = <K extends keyof Prod>(k: K, v: Prod[K]) => setP((x) => ({ ...x, [k]: v }));
  const ajouterTailles = () => {
    const nv = tailles.split(/[,;\n]/).map((t) => t.trim()).filter((t) => t && !lignes.some((l) => l.taille.toLowerCase() === t.toLowerCase()));
    setLignes([...lignes, ...nv.map((t) => ({ taille: t, stock: 0, prix: "", actif: true }))]); setTailles("");
  };
  const num = (s: string) => Number(s.replace(",", "."));

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    const prix = num(prixTxt), barre = barreTxt.trim() === "" ? null : num(barreTxt);
    if (!p.nom.fr.trim()) return setErr("Le nom en français est obligatoire.");
    if (!Number.isFinite(prix) || prix < 0) return setErr("Le prix est invalide.");
    if (barre != null && (!Number.isFinite(barre) || barre < 0)) return setErr("Le prix barré est invalide.");
    if (lignes.length === 0) return setErr("Ajoutez au moins une taille (ou « Unique ») avec son stock.");
    if (lignes.some((l) => !Number.isInteger(l.stock) || l.stock < 0)) return setErr("Un stock est invalide (nombre entier, 0 ou plus).");
    setEnvoi(true);
    try {
      const avecTaille = lignes.some((l) => l.taille !== "Unique");
      const donnees = { categorie_id: p.categorie_id, nom: p.nom, description: p.description, prix, prix_barre: barre, photos: p.photos, actif: p.actif, options: avecTaille ? [{ cle: "taille", nom: { fr: "Taille", en: "Size", ar: "المقاس" } }] : [] };
      if (nouveau) await ok(sb().from("produits").insert({ id: p.id, slug: slugify(p.nom.fr) + "-" + p.id.slice(0, 4), ...donnees }));
      else await ok(sb().from("produits").update(donnees).eq("id", p.id));
      for (const l of lignes) {
        const valeurs = l.taille === "Unique" ? {} : { taille: l.taille }, prixV = l.prix.trim() === "" ? null : num(l.prix);
        if (l.id) {
          await ok(sb().from("variantes").update({ valeurs, prix: prixV, stock: l.stock, actif: l.actif }).eq("id", l.id));
          if (l.ancien != null && l.ancien !== l.stock) await ok(sb().from("mouvements_stock").insert({ variante_id: l.id, delta: l.stock - l.ancien, motif: "correction" }));
        } else {
          const nid = crypto.randomUUID();
          await ok(sb().from("variantes").insert({ id: nid, produit_id: p.id, valeurs, prix: prixV, stock: l.stock, actif: l.actif }));
          if (l.stock > 0) await ok(sb().from("mouvements_stock").insert({ variante_id: nid, delta: l.stock, motif: "reception" }));
        }
      }
      setMsg("Produit enregistré."); if (nouveau) nav(`/admin/produits/${p.id}`, { replace: true });
      else setLignes((ls) => ls.map((l) => ({ ...l, ancien: l.stock })));
    } catch (er) { setErr((er as Error).message); }
    setEnvoi(false);
  };
  const retirer = async (i: number) => {
    const l = lignes[i];
    if (l.id) { try { await ok(sb().from("variantes").delete().eq("id", l.id)); } catch (er) { return setErr((er as Error).message); } }
    setLignes(lignes.filter((_, j) => j !== i));
  };
  const televerser = async (files: FileList | null) => {
    if (!files?.length) return; setErr("");
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (f.size > 5 * 1024 * 1024) { setErr("Une photo dépasse 5 Mo."); continue; }
        const chemin = `${p.id}/${Date.now()}-${slugify(f.name.replace(/\.[^.]+$/, ""))}.${(f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        const { error } = await sb().storage.from("produits").upload(chemin, f, { contentType: f.type });
        if (error) throw new Error(error.message);
        urls.push(sb().storage.from("produits").getPublicUrl(chemin).data.publicUrl);
      }
      maj("photos", [...p.photos, ...urls]);
    } catch (er) { setErr((er as Error).message); }
  };
  const supprimer = async () => {
    if (!window.confirm("Supprimer définitivement ce produit ? Les commandes déjà passées sont conservées.")) return;
    try { await ok(sb().from("produits").delete().eq("id", p.id)); nav("/admin/produits"); } catch (er) { setErr((er as Error).message); }
  };
  const nom = (k: "fr" | "en" | "ar", label: string, dir?: "rtl") => <label className="block text-sm"><span className="font-medium">{label}</span><input className="champ mt-1" dir={dir} value={p.nom[k] ?? ""} onChange={(e) => { const v = e.target.value; setP((x) => ({ ...x, nom: { ...x.nom, [k]: v } })); }} onBlur={k === "fr" ? () => void traduireTout() : undefined} data-testid={`nom-${k}`} /></label>;
  const desc = (k: "fr" | "en" | "ar", label: string, dir?: "rtl") => <label className="block text-sm"><span className="font-medium">{label}</span><textarea className="champ mt-1 h-24 py-3" dir={dir} value={p.description[k] ?? ""} onChange={(e) => { const v = e.target.value; setP((x) => ({ ...x, description: { ...x.description, [k]: v } })); }} onBlur={k === "fr" ? () => void traduireTout() : undefined} data-testid={`desc-${k}`} /></label>;
  return (
    <form onSubmit={enregistrer} className="space-y-8">
      <div className="flex items-center justify-between gap-3"><div><Link to="/admin/produits" className="text-sm underline">← Produits</Link><h1 className="text-2xl font-bold mt-1">{nouveau ? "Nouveau produit" : p.nom.fr || "Produit"}</h1></div>
        <button className="btn-plein" disabled={envoi} data-testid="enregistrer">{envoi ? "Enregistrement…" : "Enregistrer"}</button></div>
      {err && <p role="alert" className="text-sm" style={{ color: "var(--promo)" }} data-testid="erreur">{err}</p>}
      {msg && <p className="text-sm" style={{ color: "var(--stock)" }} data-testid="message">{msg}</p>}
      <p className="text-sm opacity-70 -mb-4">Écrivez en français : l'anglais et l'arabe se remplissent tout seuls quand vous quittez le champ. <button type="button" className="underline" onClick={() => void traduireTout(true)} data-testid="retraduire">Retraduire tout</button> <span data-testid="trad-etat" style={{ color: "var(--stock)" }}>{trad}</span></p>
      <section className="grid md:grid-cols-3 gap-4">{nom("fr", "Nom (français) *")}{nom("en", "Nom (anglais)")}{nom("ar", "Nom (arabe)", "rtl")}</section>
      <section className="grid md:grid-cols-3 gap-4">{desc("fr", "Description (français)")}{desc("en", "Description (anglais)")}{desc("ar", "Description (arabe)", "rtl")}</section>
      <section className="grid sm:grid-cols-4 gap-4">
        <label className="block text-sm"><span className="font-medium">Prix (MAD) *</span><input className="champ mt-1" inputMode="decimal" value={prixTxt} onChange={(e) => setPrixTxt(e.target.value)} data-testid="prix" /></label>
        <label className="block text-sm"><span className="font-medium">Ancien prix barré (facultatif)</span><input className="champ mt-1" inputMode="decimal" value={barreTxt} onChange={(e) => setBarreTxt(e.target.value)} data-testid="prix-barre" /></label>
        <label className="block text-sm"><span className="font-medium">Catégorie</span><select className="champ mt-1" value={p.categorie_id ?? ""} onChange={(e) => maj("categorie_id", e.target.value || null)}><option value="">Aucune</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nom.fr}</option>)}</select></label>
        <label className="flex items-end gap-2 text-sm pb-3"><input type="checkbox" checked={p.actif} onChange={(e) => maj("actif", e.target.checked)} />En vente sur la boutique</label>
      </section>
      <section>
        <h2 className="font-bold mb-1">Tailles et stock</h2>
        <p className="text-sm opacity-70 mb-3">1. Cliquez sur chaque taille que vous vendez. &nbsp;2. Indiquez combien de pièces vous avez dans chaque taille (utilisez + et −). <br />Pas de tailles (chaussures, accessoire…) ? Cliquez sur « Taille unique » ou écrivez la vôtre (ex. 40, 42).</p>
        <div className="flex flex-wrap gap-2 mb-3" data-testid="choix-tailles">{["XS", "S", "M", "L", "XL", "XXL", "3XL", "Unique"].map((t) => { const deja = lignes.some((l) => l.taille.toLowerCase() === t.toLowerCase()); return <button key={t} type="button" disabled={deja} onClick={() => setLignes([...lignes, { taille: t, stock: 1, prix: "", actif: true }])} data-testid={`choisir-${t}`} className={`h-10 min-w-12 px-3 border trait text-sm ${deja ? "bg-[var(--marque)] text-white" : "hover:bg-[var(--ciel)]"}`}>{deja ? "✓ " : "+ "}{t === "Unique" ? "Taille unique" : t}</button>; })}</div>
        {([["Tailles bébé", TAILLES_BEBE, "bebe"], ["Tailles enfant", TAILLES_ENFANT, "enfant"]] as const).map(([titre, liste, id]) => (
          <div key={id} className="mb-3"><p className="text-xs font-semibold opacity-70 mb-1">{titre}</p>
            <div className="flex flex-wrap gap-2" data-testid={`choix-tailles-${id}`}>{liste.map((t) => { const deja = lignes.some((l) => l.taille.toLowerCase() === t.toLowerCase()); return <button key={t} type="button" disabled={deja} onClick={() => setLignes([...lignes, { taille: t, stock: 1, prix: "", actif: true }])} data-testid={`choisir-${t}`} className={`h-10 px-3 border trait text-sm ${deja ? "bg-[var(--marque)] text-white" : "hover:bg-[var(--ciel)]"}`}>{deja ? "✓ " : "+ "}{t}</button>; })}</div></div>))}
        <div className="flex flex-wrap gap-2 mb-4"><input className="champ max-w-xs" placeholder="Autre taille, ex. 40, 42, 2XL ou 5 ans" value={tailles} onChange={(e) => setTailles(e.target.value)} data-testid="tailles" /><button type="button" className="btn-ligne h-12" onClick={ajouterTailles} data-testid="ajouter-tailles">Ajouter</button></div>
        {lignes.length > 0 && <>
          <div className="border trait divide-y divide-[#e5e5e5]">{lignes.map((l, i) => { const fixer = (n: number) => setLignes(lignes.map((x, j) => j === i ? { ...x, stock: Math.max(0, Math.trunc(n)) } : x)); return (
            <div key={l.id ?? l.taille} className="flex flex-wrap items-center gap-3 p-3" data-testid="ligne-taille">
              <span className="w-20 font-semibold text-lg">{l.taille === "Unique" ? "Unique" : l.taille}</span>
              <div className="flex items-center">
                <button type="button" className="h-10 w-10 border trait text-xl" onClick={() => fixer(l.stock - 1)} aria-label={`Une pièce de moins en ${l.taille}`}>−</button>
                <input type="number" min={0} className="champ h-10 w-20 text-center" value={l.stock} onChange={(e) => fixer(e.target.value === "" ? 0 : Number(e.target.value))} data-testid={`stock-${l.taille}`} aria-label={`Pièces en stock en ${l.taille}`} />
                <button type="button" className="h-10 w-10 border trait text-xl" onClick={() => fixer(l.stock + 1)} aria-label={`Une pièce de plus en ${l.taille}`}>+</button>
              </div>
              <span className="text-sm opacity-70">{l.stock === 0 ? "épuisé" : l.stock === 1 ? "pièce en stock" : "pièces en stock"}</span>
              {avance && <><input className="champ h-10 w-36" placeholder="Prix spécial (MAD)" value={l.prix} onChange={(e) => setLignes(lignes.map((x, j) => j === i ? { ...x, prix: e.target.value } : x))} aria-label={`Prix particulier ${l.taille}`} /><label className="text-sm flex items-center gap-1"><input type="checkbox" checked={l.actif} onChange={(e) => setLignes(lignes.map((x, j) => j === i ? { ...x, actif: e.target.checked } : x))} />Visible</label></>}
              <button type="button" className="ms-auto text-sm underline opacity-70 hover:opacity-100 flex items-center gap-1" onClick={() => void retirer(i)} aria-label={`Retirer ${l.taille}`}><Trash2 className="h-4 w-4" />Retirer</button>
            </div>); })}</div>
          <p className="text-sm mt-2"><b>Total : {lignes.reduce((n, l) => n + l.stock, 0)} pièces</b> &nbsp;·&nbsp; <label className="inline-flex items-center gap-1 opacity-70"><input type="checkbox" checked={avance} onChange={(e) => setAvance(e.target.checked)} />Options avancées (prix différent selon la taille)</label></p>
        </>}
      </section>
      <section>
        <h2 className="font-bold mb-2">Photos</h2>
        <div className="flex flex-wrap gap-3 mb-3">{p.photos.map((u, i) => <div key={u} className="relative"><img src={u} alt="" className="h-28 w-24 object-cover" /><button type="button" onClick={() => maj("photos", p.photos.filter((_, j) => j !== i))} className="absolute top-1 end-1 bg-white text-xs px-1.5 py-0.5 border trait" aria-label="Retirer la photo">✕</button></div>)}</div>
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => void televerser(e.target.files)} data-testid="photos" />
        <p className="text-xs opacity-60 mt-2">La première photo est celle de la liste. JPG, PNG ou WebP, 5 Mo maximum chacune. N'oubliez pas d'enregistrer.</p>
        <details className="mt-4 border trait p-3" data-testid="guide-photo"><summary className="cursor-pointer font-semibold text-sm">Quelles photos prendre ? (exemples dessinés)</summary>
          <p className="text-xs opacity-70 my-2">Lumière du jour près d'une fenêtre, fond uni clair, photo verticale, appareil bien droit. Ce sont des dessins d'exemple, pas de vraies photos.</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{GUIDE.map((g) => <figure key={g.vue}><Exemple vue={g.vue} className="aspect-[3/4] w-full" /><figcaption className="text-xs mt-1"><b>{g.titre}</b><br />{g.conseil}</figcaption></figure>)}</div>
        </details>
      </section>
      {!nouveau && <button type="button" className="text-sm underline" style={{ color: "var(--promo)" }} onClick={supprimer}>Supprimer ce produit</button>}
    </form>
  );
}
