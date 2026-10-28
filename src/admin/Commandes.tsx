import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ok, sb, type Cmd, type LigneCmd } from "./db";

const mad = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n) + " MAD";
const STATUTS: [string, string][] = [["recue", "Reçue"], ["confirmee", "Confirmée"], ["expediee", "Expédiée"], ["livree", "Livrée"], ["annulee", "Annulée"]];
const nomStatut = (s: string) => STATUTS.find(([k]) => k === s)?.[1] ?? s;

export default function Commandes() {
  const [sp, setSp] = useSearchParams();
  const [cmds, setCmds] = useState<Cmd[] | null>(null), [lignes, setLignes] = useState<Record<string, LigneCmd[]>>({}), [ouverte, setOuverte] = useState<string | null>(null);
  const [q, setQ] = useState(""), [err, setErr] = useState("");
  const statut = sp.get("statut") ?? "";
  const charger = async () => { try { setCmds(await ok<Cmd[]>(sb().from("commandes").select("*").order("created_at", { ascending: false }).limit(500))); } catch (e) { setErr((e as Error).message); } };
  useEffect(() => { void charger(); }, []);
  const ouvrir = async (c: Cmd) => {
    setOuverte(ouverte === c.id ? null : c.id);
    if (!lignes[c.id]) { try { const l = await ok<LigneCmd[]>(sb().from("lignes_commande").select("*").eq("commande_id", c.id)); setLignes((x) => ({ ...x, [c.id]: l })); } catch (e) { setErr((e as Error).message); } }
  };
  const modifier = async (c: Cmd, champs: Partial<Cmd>) => { setErr(""); try { await ok(sb().from("commandes").update(champs).eq("id", c.id)); await charger(); } catch (e) { setErr((e as Error).message); } };
  const annuler = async (c: Cmd) => {
    if (!window.confirm(`Annuler la commande ${c.numero} et remettre les articles en stock ?`)) return;
    try { await ok(sb().rpc("annuler_commande", { p_id: c.id })); await charger(); } catch (e) { setErr((e as Error).message); }
  };
  if (!cmds) return err ? <p role="alert" style={{ color: "var(--promo)" }}>{err}</p> : <p className="opacity-60">Chargement…</p>;
  const liste = cmds.filter((c) => (!statut || c.statut === statut) && (!q || [String(c.numero), c.nom, c.telephone, c.ville].some((x) => x.toLowerCase().includes(q.toLowerCase()))));
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 no-print">Commandes</h1>
      <div className="flex flex-wrap gap-2 mb-4 no-print">
        <input className="champ max-w-xs" placeholder="Numéro, nom, téléphone, ville" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="champ max-w-[200px]" value={statut} onChange={(e) => { const n = new URLSearchParams(sp); if (e.target.value) n.set("statut", e.target.value); else n.delete("statut"); setSp(n); }} data-testid="filtre-statut"><option value="">Tous les statuts</option>{STATUTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {err && <p className="mb-3 text-sm" role="alert" style={{ color: "var(--promo)" }}>{err}</p>}
      {liste.length === 0 && <p className="opacity-60 text-sm">Aucune commande.</p>}
      <ul className="space-y-2">
        {liste.map((c) => (
          <li key={c.id} className="border trait bg-white" data-testid="commande">
            <button className="w-full flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-start text-sm no-print" onClick={() => void ouvrir(c)} aria-expanded={ouverte === c.id}>
              <span className="font-bold w-16">#{c.numero}</span><span className="flex-1 min-w-32">{c.nom} · {c.ville}</span>
              <span>{new Date(c.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
              <span className="font-semibold">{mad(c.total)}</span>
              <span className="px-2 py-0.5 text-xs border trait" data-testid="statut">{nomStatut(c.statut)}</span>
              <span className="text-xs opacity-70">{c.mode_paiement === "virement" ? (c.paiement_recu ? "Virement reçu" : "Virement attendu") : "À la livraison"}</span>
            </button>
            {ouverte === c.id && (
              <div className="border-t trait p-4 text-sm space-y-4" data-testid="detail-commande">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><p className="font-semibold">Client</p><p>{c.nom}</p><p dir="ltr">{c.telephone}</p>{c.email && <p>{c.email}</p>}<p>{c.adresse}, {c.ville}</p>{c.note && <p className="italic">« {c.note} »</p>}</div>
                  <div><p className="font-semibold">Articles</p>
                    <ul>{(lignes[c.id] ?? []).map((l) => <li key={l.id} className="flex justify-between gap-3"><span>{l.quantite} × {l.nom} {Object.values(l.valeurs).join(" ")}</span><span>{mad(l.prix_unitaire * l.quantite)}</span></li>)}</ul>
                    {(c.remise ?? 0) > 0 && <p className="flex justify-between mt-2 opacity-70"><span>Code {c.code_promo}</span><span>- {mad(c.remise!)}</span></p>}<p className="flex justify-between mt-2 opacity-70"><span>Livraison</span><span>{mad(c.frais_livraison)}</span></p><p className="flex justify-between font-bold"><span>Total à encaisser</span><span>{mad(c.total)}</span></p></div>
                </div>
                <div className="flex flex-wrap items-center gap-3 no-print">
                  <label className="flex items-center gap-2">Statut <select className="champ h-10 w-40" value={c.statut} disabled={c.statut === "annulee"} onChange={(e) => void modifier(c, { statut: e.target.value })} data-testid="changer-statut">{STATUTS.filter(([k]) => k !== "annulee").map(([k, v]) => <option key={k} value={k}>{v}</option>)}{c.statut === "annulee" && <option value="annulee">Annulée</option>}</select></label>
                  {c.mode_paiement === "virement" && <label className="flex items-center gap-2"><input type="checkbox" checked={c.paiement_recu} onChange={(e) => void modifier(c, { paiement_recu: e.target.checked })} />Virement reçu</label>}
                  <a className="btn-ligne h-10" href={`https://wa.me/${c.telephone.replace(/\D/g, "").replace(/^0/, "212")}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  <button className="btn-ligne h-10" onClick={() => window.print()}>Imprimer le bon</button>
                  {c.statut !== "annulee" && <button className="h-10 px-4 text-sm underline" style={{ color: "var(--promo)" }} onClick={() => void annuler(c)} data-testid="annuler">Annuler et remettre en stock</button>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
