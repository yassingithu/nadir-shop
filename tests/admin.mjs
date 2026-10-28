// Essai de l'administration avec une FAUSSE base en mémoire (aucun accès au vrai Supabase).
// Lancer : VITE_SUPABASE_URL=https://fake.supabase.co VITE_SUPABASE_ANON_KEY=sb_publishable_fake npx vite --port 5192  puis  node tests/admin.mjs
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:5192", UID = "00000000-0000-0000-0000-0000000000aa";
const T = { equipe: [{ user_id: UID }], reglages: [{ id: 1, nom_boutique: "Nadir Shop", devise: "MAD", frais_livraison: 30, livraison_gratuite_des: 500, virement_titulaire: "", virement_banque: "", virement_rib: "", telephone: "", whatsapp: "212677859227", email_contact: "contact@swtfamily.com", instagram: "", facebook: "", tiktok: "", adresse: "", horaires: "", newsletter_expediteur: "Sweet Family <contact@swtfamily.com>", bienvenue_actif: false, bienvenue_sujet: "Bienvenue", bienvenue_texte: "Merci", seuil_stock_bas: 3, textes: {} }],
  categories: [{ id: "c1", slug: "hauts", nom: { fr: "Hauts", en: "Tops", ar: "قمصان" }, ordre: 1, actif: true }],
  produits: [{ id: "p1", slug: "tshirt", categorie_id: "c1", nom: { fr: "T-shirt", en: "T-shirt", ar: "" }, description: {}, prix: 120, prix_barre: null, photos: [], options: [{ cle: "taille", nom: { fr: "Taille" } }], actif: true, created_at: "2026-10-01" }],
  variantes: [{ id: "v1", produit_id: "p1", valeurs: { taille: "M" }, prix: null, stock: 2, actif: true }, { id: "v2", produit_id: "p1", valeurs: { taille: "S" }, prix: null, stock: 10, actif: true }],
  commandes: [{ id: "o1", numero: 1001, nom: "Ali", telephone: "0612345678", email: null, ville: "Rabat", adresse: "rue 1", note: null, mode_paiement: "virement", statut: "recue", paiement_recu: false, sous_total: 240, frais_livraison: 30, total: 270, created_at: new Date().toISOString() }],
  lignes_commande: [{ id: "l1", commande_id: "o1", variante_id: "v1", nom: "T-shirt", valeurs: { taille: "M" }, prix_unitaire: 120, quantite: 2 }], mouvements_stock: [], abonnes_newsletter: [], codes_promo: [], avis: [], campagnes: [], visites: [] };
const env = { rpc: [], meta: {} };
export { T, env };

function filtrer(rows, qs) {
  let r = [...rows];
  for (const [k, v] of qs) {
    if (["select", "order", "limit", "on_conflict"].includes(k)) continue;
    const m = /^(eq|in|lte|gte|neq)\.(.*)$/.exec(v); if (!m) continue;
    const val = (x) => String(x);
    if (m[1] === "eq") r = r.filter((x) => val(x[k]) === m[2]);
    else if (m[1] === "neq") r = r.filter((x) => val(x[k]) !== m[2]);
    else if (m[1] === "lte") r = r.filter((x) => Number(x[k]) <= Number(m[2]));
    else if (m[1] === "gte") r = r.filter((x) => Number(x[k]) >= Number(m[2]));
    else if (m[1] === "in") { const l = m[2].replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")); r = r.filter((x) => l.includes(val(x[k]))); }
  }
  const o = qs.get("order"); if (o) { const [c, d] = o.split("."); r.sort((a, b) => (a[c] > b[c] ? 1 : -1) * (d === "desc" ? -1 : 1)); }
  return r;
}
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };

export async function monter(page) {
  await page.route("https://api.mymemory.translated.net/**", (route) => { const u = new URL(route.request().url()); const lang = (u.searchParams.get("langpair") || "").split("|")[1]; route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify({ responseStatus: 200, responseData: { translatedText: `[${lang}] ${u.searchParams.get("q")}` } }) }); });
  await page.route("https://fake.supabase.co/**", async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    const rep = (status, body, extra = {}) => route.fulfill({ status, headers: { ...CORS, "content-type": "application/json", ...extra }, body: body === undefined ? "" : JSON.stringify(body) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (u.pathname.includes("/auth/v1/token")) {
      const b = JSON.parse(req.postData() || "{}");
      if (b.password !== "bon-mdp") return rep(400, { error: "invalid_grant", error_description: "Invalid login credentials" });
      return rep(200, { access_token: "x.y.z", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: UID, email: b.email, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" } });
    }
    if (u.pathname.includes("/storage/v1/object/")) return rep(200, { Key: u.pathname.split("/object/")[1] });
    if (u.pathname.includes("/auth/v1/signup")) {
      const b = JSON.parse(req.postData() || "{}"), user = { id: UID, email: b.email, aud: "authenticated", app_metadata: {}, user_metadata: b.data || {}, created_at: "2026-01-01", identities: b.email === "deja@x.com" ? [] : [{ id: "i" }] };
      env.meta = b.data || {};
      if (b.email === "deja@x.com") return rep(200, user);
      return rep(200, { access_token: "x.y.z", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user });
    }
    if (u.pathname.endsWith("/auth/v1/user")) {
      const b = JSON.parse(req.postData() || "{}"); if (b.data) env.meta = { ...(env.meta || {}), ...b.data };
      return rep(200, { id: UID, email: "client@x.com", aud: "authenticated", app_metadata: {}, user_metadata: env.meta || {}, created_at: "2026-01-01" });
    }
    if (u.pathname.includes("/rest/v1/rpc/")) {
      const nom = u.pathname.split("/rpc/")[1], b = JSON.parse(req.postData() || "{}"); env.rpc.push([nom, b]);
      if (nom === "annuler_commande") { for (const l of T.lignes_commande.filter((x) => x.commande_id === b.p_id)) T.variantes.find((v) => v.id === l.variante_id).stock += l.quantite; T.commandes.find((c) => c.id === b.p_id).statut = "annulee"; }
      if (nom === "passer_commande") return rep(200, { numero: 1002, total: 120, mode_paiement: b.p.mode_paiement });
      if (nom === "verifier_code_promo") { const c = T.codes_promo.find((x) => x.code === b.p_code && x.actif !== false); if (!c) return rep(200, { valide: false, message: "Code promo invalide." }); return rep(200, { valide: true, code: c.code, type: c.type, remise: c.type === "pourcentage" ? 12 : 0, frais: c.type === "livraison" ? 0 : 30 }); }
      if (nom === "stats_visites") return rep(200, { jours: [{ jour: "2026-10-27", vues: 5, visiteurs: 3 }, { jour: "2026-10-28", vues: 9, visiteurs: 4 }], total_vues: 14, total_visiteurs: 7, aujourdhui_vues: 9, aujourdhui_visiteurs: 4, pages: [{ chemin: "/", vues: 8, visiteurs: 5 }], sources: [{ source: "Direct", visiteurs: 5 }, { source: "instagram.com", visiteurs: 2 }], langues: [{ langue: "fr", visiteurs: 6 }], commandes: 1, chiffre: 270 });
      if (nom === "peut_donner_avis") return rep(200, { connecte: true, a_achete: !T.avis.some((a) => a.produit_id === b.p_produit && a.user_id === UID) && env.achete !== false, deja: T.avis.some((a) => a.produit_id === b.p_produit && a.user_id === UID) });
      if (nom === "laisser_avis") { T.avis.push({ id: "av" + T.avis.length, produit_id: b.p_produit, user_id: UID, nom_affiche: b.p_nom, note: b.p_note, titre: b.p_titre, texte: b.p_texte, statut: "attente", reponse: null, created_at: new Date().toISOString() }); return rep(200, null); }
      if (nom === "abonner_newsletter") { T.abonnes_newsletter.push({ id: "a" + T.abonnes_newsletter.length, email: b.p_email.toLowerCase(), langue: b.p_langue, actif: true, token: "tok" + T.abonnes_newsletter.length, source: b.p_source, created_at: new Date().toISOString() }); return rep(200, null); }
      return rep(200, null);
    }
    if (u.pathname.includes("/functions/v1/newsletter")) { const b = JSON.parse(req.postData() || "{}"); env.fn = (env.fn || []).concat([b]); if (b.action === "envoyer") { const c = T.campagnes.find((x) => x.id === b.id); Object.assign(c, { statut: "envoyee", nb_envoyes: 2, envoyee_le: new Date().toISOString() }); return rep(200, { envoyes: 2, erreurs: 0 }); } return rep(200, { ok: true }); }
    const t = u.pathname.split("/rest/v1/")[1], rows = T[t]; if (!rows) return rep(404, { message: "table inconnue " + t });
    const unique = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const prefer = req.headers()["prefer"] || "";
    if (m === "GET" || m === "HEAD") { let r = filtrer(rows, u.searchParams); if (t === "produits" && (u.searchParams.get("select") || "").includes("variantes(")) r = r.map((x) => ({ ...x, variantes: T.variantes.filter((v) => v.produit_id === x.id), categorie: T.categories.find((c) => c.id === x.categorie_id) ?? null })); const lim = u.searchParams.get("limit"); if (t === "avis") r = r.map((x) => ({ ...x, produits: { nom: T.produits.find((q) => q.id === x.produit_id)?.nom, slug: T.produits.find((q) => q.id === x.produit_id)?.slug } })); if (lim) r = r.slice(0, Number(lim));
      if (unique) return r.length ? rep(200, r[0]) : rep(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }); return rep(200, r); }
    if (m === "POST") { const b = JSON.parse(req.postData() || "{}"), arr = Array.isArray(b) ? b : [b]; const ajoutes = arr.map((x) => { const l = { created_at: new Date().toISOString(), ...x }; if (!l.id && ["campagnes", "codes_promo", "avis"].includes(t)) l.id = t + (rows.length + 1); rows.push(l); return l; }); return rep(201, prefer.includes("return=representation") ? (unique ? ajoutes[0] : ajoutes) : undefined); }
    if (m === "PATCH") { const b = JSON.parse(req.postData() || "{}"), r = filtrer(rows, u.searchParams); r.forEach((x) => Object.assign(x, b)); return rep(200, prefer.includes("return=representation") ? r : undefined); }
    if (m === "DELETE") { const r = filtrer(rows, u.searchParams); r.forEach((x) => rows.splice(rows.indexOf(x), 1)); return rep(204); }
    return rep(405, {});
  });
}

if (process.argv[1].endsWith("admin.mjs")) {
  const b = await chromium.launch(); const err = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
  p.on("pageerror", (e) => err.push(e.message)); await monter(p);
  const ok = (nom, cond) => { console.log(cond ? "✅" : "❌", nom); if (!cond) process.exitCode = 1; };
  await p.goto(BASE + "/admin"); await p.waitForSelector('[data-testid="connexion"]');
  await p.fill('[data-testid="admin-email"]', "frere@test.ma"); await p.fill('[data-testid="admin-mdp"]', "mauvais"); await p.click('[data-testid="admin-connecter"]');
  await p.waitForTimeout(500);
  ok("mauvais mot de passe refusé", await p.getByText("incorrect").isVisible());
  await p.fill('[data-testid="admin-mdp"]', "bon-mdp"); await p.click('[data-testid="admin-connecter"]'); await p.waitForSelector('[data-testid="kpi-Nouvelles commandes"]');
  ok("tableau de bord : 1 nouvelle commande", (await p.textContent('[data-testid="kpi-Nouvelles commandes"]')) === "1");
  ok("tableau de bord : 1 article en stock bas (M, 2 restants)", (await p.textContent('[data-testid="kpi-Stock bas"]')) === "1");
  await p.screenshot({ path: "/tmp/claude-0/ns/adm-tableau.png" });

  await p.goto(BASE + "/admin/produits"); await p.waitForSelector('[data-testid="ligne-produit"]');
  await p.click('[data-testid="nouveau-produit"]'); await p.waitForSelector('[data-testid="nom-fr"]');
  await p.click('[data-testid="enregistrer"]'); ok("nom obligatoire", await p.getByText("nom en français est obligatoire").isVisible());
  await p.fill('[data-testid="nom-fr"]', "Robe d'été"); await p.fill('[data-testid="nom-ar"]', "فستان صيفي"); await p.waitForFunction(() => document.querySelector('[data-testid="nom-en"]').value.startsWith("[en]")); ok("traduction automatique : anglais rempli, arabe déjà écrit conservé", (await p.inputValue('[data-testid="nom-en"]')) === "[en] Robe d'été" && (await p.inputValue('[data-testid="nom-ar"]')) === "فستان صيفي"); await p.fill('[data-testid="prix"]', "199,50"); await p.fill('[data-testid="prix-barre"]', "249");
  await p.fill('[data-testid="tailles"]', "XL, S, M"); await p.click('[data-testid="ajouter-tailles"]');
  await p.click('[data-testid="choisir-8 ans"]'); await p.click('[data-testid="choisir-6 mois"]'); ok("tailles enfant/bébé ajoutables en un clic", (await p.inputValue('[data-testid="stock-8 ans"]')) === "1" && (await p.inputValue('[data-testid="stock-6 mois"]')) === "1"); await p.fill('[data-testid="stock-8 ans"]', "0"); await p.fill('[data-testid="stock-6 mois"]', "0");
  await p.fill('[data-testid="stock-S"]', "4"); await p.fill('[data-testid="stock-M"]', "6");
  await p.click('[data-testid="enregistrer"]'); await p.waitForSelector('[data-testid="message"]');
  const robe = T.produits.find((x) => x.nom.fr === "Robe d'été");
  ok("produit créé avec prix décimal 199,5 et prix barré 249", robe && robe.prix === 199.5 && robe.prix_barre === 249);
  ok("5 tailles créées, stock S=4 M=6 XL=0", T.variantes.filter((v) => v.produit_id === robe.id).length === 5 && T.variantes.find((v) => v.produit_id === robe.id && v.valeurs.taille === "M").stock === 6);
  ok("mouvements de stock « réception » enregistrés (S et M)", T.mouvements_stock.filter((x) => x.motif === "reception").length === 2);
  ok("options taille créées", robe.options[0]?.cle === "taille");
  await p.waitForTimeout(1200); await p.fill('[data-testid="stock-S"]', "7"); await p.click('[data-testid="enregistrer"]'); await p.waitForTimeout(1000);
  ok("correction de stock S 4→7 tracée (+3)", T.mouvements_stock.some((x) => x.motif === "correction" && x.delta === 3));
  await p.screenshot({ path: "/tmp/claude-0/ns/adm-produit.png" });

  await p.goto(BASE + "/admin/produits"); await p.waitForSelector('[data-testid="ligne-produit"]');
  const dl = p.waitForEvent("download"); await p.click('[data-testid="exporter"]'); const d = await dl; await d.saveAs("/tmp/claude-0/ns/export.csv");
  const csv = readFileSync("/tmp/claude-0/ns/export.csv", "utf8"); ok("export : en-tête + 7 lignes de tailles", csv.split("\r\n").length === 8 && csv.includes("Robe d'été"));
  writeFileSync("/tmp/claude-0/ns/import.csv", "slug;nom_fr;nom_en;nom_ar;categorie;prix;prix_barre;taille;stock;actif\nrobe-import;Robe import;;;hauts;310,5;;M;3;oui\nrobe-import;Robe import;;;hauts;310,5;;L;5;oui\n");
  await p.setInputFiles('[data-testid="import-fichier"]', "/tmp/claude-0/ns/import.csv"); await p.waitForSelector('[data-testid="info-import"]');
  ok("import : produit créé avec 2 tailles et catégorie liée", T.produits.find((x) => x.slug === "robe-import")?.categorie_id === "c1" && T.variantes.filter((v) => v.produit_id === T.produits.find((x) => x.slug === "robe-import").id).length === 2);
  writeFileSync("/tmp/claude-0/ns/mauvais.csv", "slug;nom_fr;prix\nx;Truc;abc\n");
  await p.setInputFiles('[data-testid="import-fichier"]', "/tmp/claude-0/ns/mauvais.csv"); await p.waitForTimeout(400); ok("import invalide : erreur lisible, rien créé", (await p.getByText("Ligne 2 : prix invalide").isVisible()) && !T.produits.some((x) => x.slug === "x"));

  await p.goto(BASE + "/admin/commandes"); await p.waitForSelector('[data-testid="commande"]'); await p.click('[data-testid="commande"] button');
  await p.waitForSelector('[data-testid="detail-commande"]'); ok("détail commande : articles et total", (await p.textContent('[data-testid="detail-commande"]')).includes("2 × T-shirt"));
  await p.selectOption('[data-testid="changer-statut"]', "confirmee"); await p.waitForTimeout(300); ok("statut changé en « confirmée »", T.commandes[0].statut === "confirmee");
  await p.getByLabel("Virement reçu").click(); await p.waitForTimeout(400); ok("virement marqué reçu", T.commandes[0].paiement_recu === true);
  p.once("dialog", (dd) => dd.accept()); const avant = T.variantes.find((v) => v.id === "v1").stock; await p.click('[data-testid="annuler"]'); await p.waitForTimeout(400);
  ok(`annulation : stock remis (${avant} → ${avant + 2}) et statut annulée`, T.variantes.find((v) => v.id === "v1").stock === avant + 2 && T.commandes[0].statut === "annulee");
  await p.screenshot({ path: "/tmp/claude-0/ns/adm-commandes.png" });

  await p.goto(BASE + "/admin/categories"); await p.waitForSelector('[data-testid="categorie"]'); await p.fill('[data-testid="cat-fr"]', "Robes"); await p.keyboard.press("Tab"); await p.waitForFunction(() => document.querySelector('input[placeholder="Anglais"]').value === "[en] Robes"); ok("catégorie : traduction automatique", true); await p.click('[data-testid="cat-ajouter"]'); await p.waitForTimeout(400);
  ok("catégorie ajoutée", T.categories.some((c) => c.nom.fr === "Robes"));
  await p.goto(BASE + "/admin/reglages"); await p.waitForSelector('[data-testid="reg-nom_boutique"]'); await p.fill('[data-testid="reg-frais_livraison"]', "45"); await p.fill('[data-testid="reg-virement_rib"]', "123 456"); await p.fill('[data-testid="reg-livraison_gratuite_des"]', ""); await p.click('[data-testid="reg-enregistrer"]'); await p.waitForSelector('[data-testid="reg-message"]');
  ok("réglages : frais 45, RIB, livraison gratuite supprimée (null)", T.reglages[0].frais_livraison === 45 && T.reglages[0].virement_rib === "123 456" && T.reglages[0].livraison_gratuite_des === null);
  await p.goto(BASE + "/admin/textes"); await p.waitForSelector('[data-testid="textes-recherche"]'); await p.fill('[data-testid="textes-recherche"]', "Paiement à la livraison ou par virement");
  await p.locator('[data-testid="texte-ligne"]').filter({ has: p.locator('textarea[data-testid="texte-fr"]') }).evaluateAll((els) => els.forEach((e) => { const t = e.querySelector("textarea"); if (t && t.value !== "Paiement à la livraison ou par virement") e.remove(); })); await p.locator('[data-testid="texte-fr"]').first().fill("Paiement par virement sécurisé et/ou à la livraison"); await p.click('[data-testid="textes-enregistrer"]'); await p.waitForSelector('[data-testid="textes-message"]');
  ok("textes du site : surcharge enregistrée", JSON.stringify(T.reglages[0].textes).includes("virement sécurisé et/ou"));
  ok("réglages conservent les textes", T.reglages[0].textes && Object.keys(T.reglages[0].textes).length === 1);
  await p.goto(BASE + "/"); await p.getByText("FR", { exact: true }).first().click(); await p.waitForSelector("text=Paiement par virement sécurisé et/ou à la livraison", { timeout: 8000 }); ok("la boutique affiche le texte modifié", true); await p.goto(BASE + "/admin"); await p.waitForSelector('[data-testid="deconnexion"]');
  await p.click('[data-testid="deconnexion"]'); await p.waitForSelector('[data-testid="connexion"]'); ok("déconnexion", true);
  console.log("erreurs page:", err); await b.close();
}
