import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ok, sb, type Cmd, type Prod, type Var } from "./db";

const mad = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " MAD";

export default function Tableau() {
  const [d, setD] = useState<{ cmds: Cmd[]; bas: { v: Var; p?: Prod }[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const cmds = await ok<Cmd[]>(sb().from("commandes").select("*").order("created_at", { ascending: false }).limit(300));
        const seuil = (await ok<{ seuil_stock_bas: number }>(sb().from("reglages").select("seuil_stock_bas").eq("id", 1).single())).seuil_stock_bas;
        const vars = await ok<Var[]>(sb().from("variantes").select("*").eq("actif", true).lte("stock", seuil));
        const prods = vars.length ? await ok<Prod[]>(sb().from("produits").select("*").in("id", [...new Set(vars.map((v) => v.produit_id))])) : [];
        setD({ cmds, bas: vars.map((v) => ({ v, p: prods.find((p) => p.id === v.produit_id) })).filter((x) => x.p?.actif) });
      } catch (e) { setErr((e as Error).message); }
    })();
  }, []);
  if (err) return <p role="alert" style={{ color: "var(--promo)" }}>{err}</p>;
  if (!d) return <p className="opacity-60">Chargement…</p>;
  const aujourdhui = new Date().toDateString();
  const jour = d.cmds.filter((c) => new Date(c.created_at).toDateString() === aujourdhui && c.statut !== "annulee");
  const nouvelles = d.cmds.filter((c) => c.statut === "recue").length;
  const aEncaisser = d.cmds.filter((c) => c.mode_paiement === "virement" && !c.paiement_recu && c.statut !== "annulee").length;
  const Carte = ({ titre, valeur, to }: { titre: string; valeur: string | number; to?: string }) => {
    const c = <div className="border trait p-5 h-full hover:border-black"><p className="text-sm opacity-60">{titre}</p><p className="text-3xl font-bold mt-1" data-testid={`kpi-${titre}`}>{valeur}</p></div>;
    return to ? <Link to={to}>{c}</Link> : c;
  };
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Carte titre="Nouvelles commandes" valeur={nouvelles} to="/admin/commandes?statut=recue" />
        <Carte titre="Ventes du jour" valeur={mad(jour.reduce((s, c) => s + Number(c.total), 0))} />
        <Carte titre="Virements à vérifier" valeur={aEncaisser} to="/admin/commandes" />
        <Carte titre="Stock bas" valeur={d.bas.length} />
      </div>
      <h2 className="text-lg font-bold mt-10 mb-3">Articles à réapprovisionner</h2>
      {d.bas.length === 0 ? <p className="opacity-60 text-sm">Aucun article en stock bas.</p> : (
        <ul className="divide-y trait border trait">
          {d.bas.map(({ v, p }) => <li key={v.id} className="flex justify-between px-4 py-3 text-sm"><Link className="underline" to={`/admin/produits/${p!.id}`}>{p!.nom.fr} {Object.values(v.valeurs).join(" ")}</Link><span style={{ color: v.stock === 0 ? "var(--promo)" : undefined }} className="font-semibold">{v.stock === 0 ? "Épuisé" : `${v.stock} restant${v.stock > 1 ? "s" : ""}`}</span></li>)}
        </ul>
      )}
    </div>
  );
}
