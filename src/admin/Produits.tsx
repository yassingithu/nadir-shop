import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Plus, Upload } from "lucide-react";
import { ok, sb, type Cat, type Prod, type Var } from "./db";
import { COLONNES, lireProduits, versCsv, type LigneCsv } from "./csv";

const mad = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " MAD";

export default function Produits() {
  const [prods, setProds] = useState<Prod[] | null>(null), [vars, setVars] = useState<Var[]>([]), [cats, setCats] = useState<Cat[]>([]);
  const [q, setQ] = useState(""), [err, setErr] = useState(""), [info, setInfo] = useState("");
  const fichier = useRef<HTMLInputElement>(null), nav = useNavigate();
  const charger = async () => {
    try {
      const [p, v, c] = await Promise.all([ok<Prod[]>(sb().from("produits").select("*").order("created_at", { ascending: false })), ok<Var[]>(sb().from("variantes").select("*")), ok<Cat[]>(sb().from("categories").select("*").order("ordre"))]);
      setProds(p); setVars(v); setCats(c);
    } catch (e) { setErr((e as Error).message); }
  };
  useEffect(() => { void charger(); }, []);

  const exporter = () => {
    const lignes: LigneCsv[] = [];
    for (const p of prods ?? []) {
      const cat = cats.find((c) => c.id === p.categorie_id)?.slug ?? "";
      const vs = vars.filter((v) => v.produit_id === p.id);
      for (const v of vs.length ? vs : [null]) lignes.push({ slug: p.slug, nom_fr: p.nom.fr ?? "", nom_en: p.nom.en ?? "", nom_ar: p.nom.ar ?? "", categorie: cat, prix: String(p.prix), prix_barre: p.prix_barre == null ? "" : String(p.prix_barre), taille: v ? (v.valeurs.taille ?? "") : "", stock: v ? String(v.stock) : "", actif: p.actif ? "oui" : "non" });
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([versCsv(lignes)], { type: "text/csv;charset=utf-8" }));
    a.download = `produits-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  const modele = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([versCsv([
      { slug: "tshirt-coton", nom_fr: "T-shirt en coton", nom_en: "Cotton T-shirt", nom_ar: "تيشرت قطني", categorie: "hauts", prix: "120", prix_barre: "", taille: "S", stock: "5", actif: "oui" },
      { slug: "tshirt-coton", nom_fr: "T-shirt en coton", nom_en: "Cotton T-shirt", nom_ar: "تيشرت قطني", categorie: "hauts", prix: "120", prix_barre: "", taille: "M", stock: "8", actif: "oui" },
    ])], { type: "text/csv;charset=utf-8" }));
    a.download = "modele-import-produits.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  const importer = async (f: File) => {
    setErr(""); setInfo("");
    const { produits, erreurs } = lireProduits(await f.text());
    if (erreurs.length) return setErr(erreurs.slice(0, 8).join(" "));
    try {
      let crees = 0, maj = 0;
      for (const ip of produits) {
        const cat = cats.find((c) => c.slug === ip.categorie)?.id ?? null;
        const exist = prods?.find((p) => p.slug === ip.slug);
        const avecTaille = ip.variantes.some((v) => v.taille !== "Unique");
        const ligne = { slug: ip.slug, nom: ip.nom, categorie_id: cat, prix: ip.prix, prix_barre: ip.prix_barre, actif: ip.actif, options: avecTaille ? [{ cle: "taille", nom: { fr: "Taille", en: "Size", ar: "المقاس" } }] : [] };
        const id = exist?.id ?? crypto.randomUUID();
        if (exist) { await ok(sb().from("produits").update(ligne).eq("id", id)); maj++; } else { await ok(sb().from("produits").insert({ id, ...ligne })); crees++; }
        const existantes = vars.filter((v) => v.produit_id === id);
        for (const iv of ip.variantes) {
          const valeurs = iv.taille === "Unique" ? {} : { taille: iv.taille };
          const e = existantes.find((v) => (v.valeurs.taille ?? "Unique") === iv.taille);
          if (e) { if (e.stock !== iv.stock) { await ok(sb().from("variantes").update({ stock: iv.stock }).eq("id", e.id)); await ok(sb().from("mouvements_stock").insert({ variante_id: e.id, delta: iv.stock - e.stock, motif: "import" })); } }
          else { const nid = crypto.randomUUID(); await ok(sb().from("variantes").insert({ id: nid, produit_id: id, valeurs, stock: iv.stock })); if (iv.stock > 0) await ok(sb().from("mouvements_stock").insert({ variante_id: nid, delta: iv.stock, motif: "import" })); }
        }
      }
      setInfo(`Import terminé : ${crees} produit(s) créé(s), ${maj} mis à jour.`); await charger();
    } catch (e) { setErr("L'import s'est arrêté : " + (e as Error).message); await charger(); }
  };

  if (!prods) return err ? <p role="alert" style={{ color: "var(--promo)" }}>{err}</p> : <p className="opacity-60">Chargement…</p>;
  const liste = prods.filter((p) => !q || [p.nom.fr, p.nom.en, p.slug].some((x) => x?.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Produits</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ligne h-10" onClick={exporter} data-testid="exporter"><Download className="h-4 w-4" />Exporter (Excel)</button>
          <button className="btn-ligne h-10" onClick={() => fichier.current?.click()} data-testid="importer"><Upload className="h-4 w-4" />Importer</button>
          <input ref={fichier} type="file" accept=".csv,text/csv" className="hidden" data-testid="import-fichier" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importer(f); e.target.value = ""; }} />
          <button className="btn-plein h-10" onClick={() => nav(`/admin/produits/nouveau`)} data-testid="nouveau-produit"><Plus className="h-4 w-4" />Nouveau produit</button>
        </div>
      </div>
      {err && <p className="mb-4 text-sm" style={{ color: "var(--promo)" }} role="alert">{err}</p>}
      {info && <p className="mb-4 text-sm" style={{ color: "var(--stock)" }} data-testid="info-import">{info}</p>}
      <input className="champ mb-4 max-w-sm" placeholder="Rechercher un produit" value={q} onChange={(e) => setQ(e.target.value)} />
      {liste.length === 0 ? <p className="opacity-60 text-sm">Aucun produit. Ajoutez-en un, ou importez un fichier Excel (<button className="underline" onClick={modele}>télécharger le modèle</button>).</p> : (
        <table className="w-full text-sm border trait">
          <thead className="bg-[#f4f4f4] text-start"><tr><th className="text-start p-3">Produit</th><th className="text-start p-3">Prix</th><th className="text-start p-3">Stock</th><th className="text-start p-3">Statut</th></tr></thead>
          <tbody>{liste.map((p) => {
            const vs = vars.filter((v) => v.produit_id === p.id), stock = vs.reduce((s, v) => s + v.stock, 0);
            return <tr key={p.id} className="border-t trait hover:bg-[#fafafa]" data-testid="ligne-produit">
              <td className="p-3"><Link className="font-medium underline" to={`/admin/produits/${p.id}`}>{p.nom.fr || p.slug}</Link></td>
              <td className="p-3 whitespace-nowrap">{mad(p.prix)}</td>
              <td className="p-3" style={{ color: stock === 0 ? "var(--promo)" : undefined }}>{stock === 0 ? "Épuisé" : stock}</td>
              <td className="p-3">{p.actif ? "En vente" : "Masqué"}</td></tr>;
          })}</tbody>
        </table>
      )}
      <p className="mt-4 text-xs opacity-60">Colonnes du fichier Excel : {COLONNES.join(", ")}. Une ligne par taille.</p>
    </div>
  );
}
