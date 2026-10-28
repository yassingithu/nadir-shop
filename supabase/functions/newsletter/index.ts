// Sweet Family : envoi des newsletters (Resend) – campagnes immédiates, programmées, e-mail de bienvenue.
// Déployer avec « Verify JWT » DÉSACTIVÉ (la fonction vérifie elle-même l'administrateur ou le secret du planificateur).
// Secrets requis : RESEND_API_KEY, CRON_SECRET. Facultatif : SITE_URL (défaut https://swtfamily.com).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Content-Type": "application/json" };
const rep = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: CORS });
const SITE = (Deno.env.get("SITE_URL") ?? "https://swtfamily.com").replace(/\/$/, "");
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function enHtml(texte: string, lienDesabo: string | null): string {
  const corps = texte.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 16px;line-height:1.6">${esc(p).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#286b7b">$1</a>').replace(/\n/g, "<br>")}</p>`).join("");
  const pied = lienDesabo ? `<p style="margin:32px 0 0;font-size:12px;color:#777">Vous recevez ce message car vous êtes inscrit(e) à la newsletter. <a href="${lienDesabo}" style="color:#777">Se désinscrire</a></p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#222;font-size:15px">${corps}${pied}</div></body></html>`;
}
const pasDeHtml = (texte: string, lien: string | null) => texte.trim() + (lien ? `\n\n—\nSe désinscrire : ${lien}` : "");

type Msg = { from: string; to: string[]; subject: string; html: string; text: string; headers?: Record<string, string> };
async function resend(msgs: Msg[]): Promise<{ ok: number; ko: number; erreur?: string }> {
  const cle = Deno.env.get("RESEND_API_KEY"); if (!cle) return { ok: 0, ko: msgs.length, erreur: "RESEND_API_KEY manquante (secret de la fonction)." };
  let ok = 0, ko = 0, erreur: string | undefined;
  for (let i = 0; i < msgs.length; i += 100) {
    const lot = msgs.slice(i, i + 100);
    const r = await fetch("https://api.resend.com/emails/batch", { method: "POST", headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" }, body: JSON.stringify(lot) });
    if (r.ok) ok += lot.length; else { ko += lot.length; erreur = `Resend ${r.status} : ${(await r.text()).slice(0, 300)}`; }
  }
  return { ok, ko, erreur };
}
async function expediteur(): Promise<string> {
  const { data } = await db.from("reglages").select("newsletter_expediteur").eq("id", 1).single();
  return data?.newsletter_expediteur || "Sweet Family <contact@swtfamily.com>";
}
const message = (from: string, a: { email: string; token: string }, sujet: string, texte: string): Msg => {
  const lien = `${SITE}/newsletter/desabonnement?t=${a.token}`;
  return { from, to: [a.email], subject: sujet, html: enHtml(texte, lien), text: pasDeHtml(texte, lien), headers: { "List-Unsubscribe": `<${lien}>` } };
};

async function envoyerCampagne(id: string) {
  // « Réservation » atomique : une campagne ne peut partir qu'une seule fois.
  const { data: c } = await db.from("campagnes").update({ statut: "envoi", erreur: null }).eq("id", id).in("statut", ["brouillon", "planifiee", "erreur"]).select("*").maybeSingle();
  if (!c) return { erreur: "Cette campagne a déjà été envoyée ou n'existe pas." };
  const { data: abonnes } = await db.from("abonnes_newsletter").select("email, token").eq("actif", true);
  const from = await expediteur();
  const msgs = (abonnes ?? []).map((a) => message(from, a, c.sujet, c.contenu));
  const r = msgs.length ? await resend(msgs) : { ok: 0, ko: 0 };
  await db.from("campagnes").update({ statut: r.ko && !r.ok ? "erreur" : "envoyee", envoyee_le: new Date().toISOString(), nb_envoyes: r.ok, nb_erreurs: r.ko, erreur: r.erreur ?? null }).eq("id", id);
  return { envoyes: r.ok, erreurs: r.ko, erreur: r.ok === 0 && r.erreur ? r.erreur : undefined };
}

async function traiterPlanning() {
  const res: Record<string, unknown> = { campagnes: 0, bienvenues: 0 };
  const { data: dues } = await db.from("campagnes").select("id").eq("statut", "planifiee").lte("planifiee_le", new Date().toISOString()).limit(5);
  for (const c of dues ?? []) { await envoyerCampagne(c.id); res.campagnes = (res.campagnes as number) + 1; }
  const { data: reg } = await db.from("reglages").select("bienvenue_actif, bienvenue_sujet, bienvenue_texte").eq("id", 1).single();
  if (reg?.bienvenue_actif) {
    const depuis = new Date(Date.now() - 2 * 86400000).toISOString(); // jamais d'envoi rétroactif aux anciens abonnés
    const { data: nouveaux } = await db.from("abonnes_newsletter").select("id, email, token").eq("actif", true).eq("bienvenue_envoye", false).gte("created_at", depuis).limit(50);
    if (nouveaux?.length) {
      const from = await expediteur();
      const r = await resend(nouveaux.map((a) => message(from, a, reg.bienvenue_sujet, reg.bienvenue_texte)));
      if (r.ok) await db.from("abonnes_newsletter").update({ bienvenue_envoye: true }).in("id", nouveaux.map((a) => a.id));
      res.bienvenues = r.ok; if (r.erreur) res.erreur = r.erreur;
    }
  }
  // Les anciens abonnés (hors fenêtre) sont marqués pour ne plus être repris.
  await db.from("abonnes_newsletter").update({ bienvenue_envoye: true }).eq("bienvenue_envoye", false).lt("created_at", new Date(Date.now() - 2 * 86400000).toISOString());
  return res;
}

async function estAdmin(req: Request): Promise<boolean> {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""); if (!jwt) return false;
  const { data } = await db.auth.getUser(jwt); if (!data.user) return false;
  const { data: e } = await db.from("equipe").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return !!e;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const corps = await req.json().catch(() => ({}));
    const secret = Deno.env.get("CRON_SECRET");
    if (corps.action === "planning") {
      if (!secret || req.headers.get("x-cron-secret") !== secret) return rep({ erreur: "Non autorisé" }, 401);
      return rep(await traiterPlanning());
    }
    if (!(await estAdmin(req))) return rep({ erreur: "Non autorisé" }, 401);
    if (corps.action === "test") {
      if (!String(corps.a ?? "").includes("@") || !corps.sujet || !corps.contenu) return rep({ erreur: "Sujet, message et adresse requis." }, 400);
      const r = await resend([{ from: await expediteur(), to: [corps.a], subject: `[TEST] ${corps.sujet}`, html: enHtml(corps.contenu, `${SITE}/newsletter/desabonnement`), text: pasDeHtml(corps.contenu, null) }]);
      return r.ok ? rep({ ok: true }) : rep({ erreur: r.erreur ?? "Échec de l'envoi" }, 502);
    }
    if (corps.action === "envoyer") return rep(await envoyerCampagne(String(corps.id)));
    return rep({ erreur: "Action inconnue" }, 400);
  } catch (e) { return rep({ erreur: (e as Error).message }, 500); }
});
