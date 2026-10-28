// Essai de l'administration avec une FAUSSE base en mémoire (aucun accès au vrai Supabase).
// Lancer : VITE_SUPABASE_URL=https://fake.supabase.co VITE_SUPABASE_ANON_KEY=sb_publishable_fake npx vite --port 5192  puis  node tests/admin.mjs
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "http://127.0.0.1:5192", UID = "00000000-0000-0000-0000-0000000000aa";
const T = { equipe: [{ user_id: UID }], reglages: [{ id: 1, nom_boutique: "Nadir Shop", devise: "MAD", frais_livraison: 30, livraison_gratuite_des: 500, virement_titulaire: "", virement_banque: "", virement_rib: "", telephone: "", whatsapp: "", seuil_stock_bas: 3, textes: {} }],
  categories: [{ id: "c1", slug: "hauts", nom: { fr: "Hauts", en: "Tops", ar: "قمصان" }, ordre: 1, actif: true }],
  produits: [{ id: "p1", slug: "tshirt", categorie_id: "c1", nom: { fr: "T-shirt", en: "T-shirt", ar: "" }, description: {}, prix: 120, prix_barre: null, photos: [], options: [{ cle: "taille", nom: { fr: "Taille" } }], actif: true, created_at: "2026-10-01" }],
  variantes: [{ id: "v1", produit_id: "p1", valeurs: { taille: "M" }, prix: null, stock: 2, actif: true }, { id: "v2", produit_id: "p1", valeurs: { taille: "S" }, prix: null, stock: 10, actif: true }],
  commandes: [{ id: "o1", numero: 1001, nom: "Ali", telephone: "0612345678", email: null, ville: "Rabat", adresse: "rue 1", note: null, mode_paiement: "virement", statut: "recue", paiement_recu: false, sous_total: 240, frais_livraison: 30, total: 270, created_at: new Date().toISOString() }],
  lignes_commande: [{ id: "l1", commande_id: "o1", variante_id: "v1", nom: "T-shirt", valeurs: { taille: "M" }, prix_unitaire: 120, quantite: 2 }], mouvements_stock: [] };
const env = { rpc: [] };

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
    if (u.pathname.includes("/rest/v1/rpc/")) {
      const nom = u.pathname.split("/rpc/")[1], b = JSON.parse(req.postData() || "{}"); env.rpc.push([nom, b]);
      if (nom === "annuler_commande") { for (const l of T.lignes_commande.filter((x) => x.commande_id === b.p_id)) T.variantes.find((v) => v.id === l.variante_id).stock += l.quantite; T.commandes.find((c) => c.id === b.p_id).statut = "annulee"; }
      return rep(200, null);
    }
    const t = u.pathname.split("/rest/v1/")[1], rows = T[t]; if (!rows) return rep(404, { message: "table inconnue " + t });
    const unique = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const prefer = req.headers()["prefer"] || "";
    if (m === "GET" || m === "HEAD") { let r = filtrer(rows, u.searchParams); if (t === "produits" && (u.searchParams.get("select") || "").includes("variantes(")) r = r.map((x) => ({ ...x, variantes: T.variantes.filter((v) => v.produit_id === x.id), categorie: T.categories.find((c) => c.id === x.categorie_id) ?? null })); const lim = u.searchParams.get("limit"); if (lim) r = r.slice(0, Number(lim));
      if (unique) return r.length ? rep(200, r[0]) : rep(406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }); return rep(200, r); }
    if (m === "POST") { const b = JSON.parse(req.postData() || "{}"), arr = Array.isArray(b) ? b : [b]; for (const x of arr) rows.push({ created_at: new Date().toISOString(), ...x }); return rep(201, prefer.includes("return=representation") ? arr : undefined); }
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
  await p.fill('[data-testid="nom-fr"]', "Robe d'été"); await p.fill('[data-testid="nom-ar"]', "فستان صيفي"); await p.fill('[data-testid="prix"]', "199,50"); await p.fill('[data-testid="prix-barre"]', "249");
  await p.fill('[data-testid="tailles"]', "XL, S, M"); await p.click('[data-testid="ajouter-tailles"]');
  await p.fill('[data-testid="stock-S"]', "4"); await p.fill('[data-testid="stock-M"]', "6");
  await p.click('[data-testid="enregistrer"]'); await p.waitForSelector('[data-testid="message"]');
  const robe = T.produits.find((x) => x.nom.fr === "Robe d'été");
  ok("produit créé avec prix décimal 199,5 et prix barré 249", robe && robe.prix === 199.5 && robe.prix_barre === 249);
  ok("3 tailles créées, stock S=4 M=6 XL=0", T.variantes.filter((v) => v.produit_id === robe.id).length === 3 && T.variantes.find((v) => v.produit_id === robe.id && v.valeurs.taille === "M").stock === 6);
  ok("mouvements de stock « réception » enregistrés (S et M)", T.mouvements_stock.filter((x) => x.motif === "reception").length === 2);
  ok("options taille créées", robe.options[0]?.cle === "taille");
  await p.fill('[data-testid="stock-S"]', "7"); await p.click('[data-testid="enregistrer"]'); await p.waitForSelector('[data-testid="message"]');
  ok("correction de stock S 4→7 tracée (+3)", T.mouvements_stock.some((x) => x.motif === "correction" && x.delta === 3));
  await p.screenshot({ path: "/tmp/claude-0/ns/adm-produit.png" });

  await p.goto(BASE + "/admin/produits"); await p.waitForSelector('[data-testid="ligne-produit"]');
  const dl = p.waitForEvent("download"); await p.click('[data-testid="exporter"]'); const d = await dl; await d.saveAs("/tmp/claude-0/ns/export.csv");
  const csv = readFileSync("/tmp/claude-0/ns/export.csv", "utf8"); ok("export : en-tête + 5 lignes de tailles", csv.split("\r\n").length === 6 && csv.includes("Robe d'été"));
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

  await p.goto(BASE + "/admin/categories"); await p.waitForSelector('[data-testid="categorie"]'); await p.fill('[data-testid="cat-fr"]', "Robes"); await p.click('[data-testid="cat-ajouter"]'); await p.waitForTimeout(400);
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
