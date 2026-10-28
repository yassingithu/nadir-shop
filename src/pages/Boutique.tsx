import { useSearchParams } from "react-router-dom";
import { useLangue } from "../lib/i18n";
import { useDonnees } from "../lib/donnees";
import Carte, { remise } from "../lib/Carte";

export default function Boutique() {
  const { t, tr } = useLangue();
  const { produits, categories, etat } = useDonnees();
  const [sp, setSp] = useSearchParams();
  const cat = sp.get("cat"), promo = sp.get("promo") === "1", q = (sp.get("q") || "").toLowerCase(), tri = sp.get("tri") || "";
  const maj = (k: string, v: string | null) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k === "cat") { n.delete("nouveautes"); } setSp(n); };
  let liste = produits.filter((p) => (!cat || p.categorie === cat) && (!promo || remise(p) > 0) && (!q || [p.nom.fr, p.nom.en, p.nom.ar].some((x) => x?.toLowerCase().includes(q))));
  if (tri === "asc") liste = [...liste].sort((a, b) => a.prix - b.prix);
  if (tri === "desc") liste = [...liste].sort((a, b) => b.prix - a.prix);
  const titre = q ? `« ${q} »` : cat ? tr(categories.find((c) => c.slug === cat)?.nom) : promo ? t("Promotions") : sp.get("nouveautes") ? t("Nouveautés") : t("Boutique");
  const chip = (on: boolean) => `block w-full text-start py-1.5 text-sm ${on ? "font-bold underline underline-offset-4" : "opacity-70 hover:opacity-100"}`;
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold" data-testid="titre-liste">{titre}</h1>
      <div className="mt-6 flex items-center justify-between border-y trait py-3 text-sm">
        <span data-testid="compte">{liste.length === 1 ? t("{n} produit", { n: 1 }) : t("{n} produits", { n: liste.length })}</span>
        <label className="flex items-center gap-2">{t("Trier")}
          <select value={tri} onChange={(e) => maj("tri", e.target.value || null)} className="border trait h-9 px-2 bg-white" data-testid="tri">
            <option value="">{t("Pertinence")}</option><option value="asc">{t("Prix croissant")}</option><option value="desc">{t("Prix décroissant")}</option>
          </select></label>
      </div>
      <div className="grid md:grid-cols-[200px_1fr] gap-10 mt-6">
        <aside className="hidden md:block">
          <p className="font-semibold mb-2">{t("Catégories")}</p>
          <button className={chip(!cat)} onClick={() => maj("cat", null)} data-testid="cat-tout">{t("Tout")}</button>
          {categories.map((c) => <button key={c.slug} className={chip(cat === c.slug)} onClick={() => maj("cat", c.slug)} data-testid={`cat-${c.slug}`}>{tr(c.nom)}</button>)}
          <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={promo} onChange={(e) => maj("promo", e.target.checked ? "1" : null)} />{t("Promotions uniquement")}</label>
        </aside>
        <div>
          <div className="md:hidden flex gap-2 overflow-x-auto pb-4 -mt-2">
            {[null, ...categories.map((c) => c.slug)].map((s) => <button key={s ?? "tout"} onClick={() => maj("cat", s)} className={`shrink-0 h-9 px-4 border text-sm ${cat === s ? "bg-black text-white border-black" : "trait"}`}>{s ? tr(categories.find((c) => c.slug === s)?.nom) : t("Tout")}</button>)}
          </div>
          {etat === "ok" && liste.length === 0 && <p className="opacity-60">{q ? t("Aucun résultat pour « {q} »", { q }) : t("Aucun produit pour le moment.")}</p>}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-8">{liste.map((p) => <Carte key={p.id} p={p} />)}</div>
        </div>
      </div>
    </div>
  );
}
