// Codes promo, WhatsApp, coordonnées, avis, statistiques et campagnes, avec la FAUSSE base de tests/admin.mjs (port 5192).
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import { monter, T, env } from "./admin.mjs";
const BASE = "http://127.0.0.1:5192";
let echecs = 0; const ok = (nom, v) => { console.log(v ? "✅" : "❌", nom); if (!v) echecs++; };
const b = await chromium.launch(); const err = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("langue", "fr"); localStorage.setItem("panier", JSON.stringify([{ variante_id: "v2", produit_id: "p1", quantite: 1 }])); } catch {} });
const p = await ctx.newPage(); p.on("pageerror", (e) => err.push(e.message)); await monter(p);

// ── Admin : connexion, code promo
await p.goto(BASE + "/admin"); await p.fill('[data-testid="admin-email"]', "frere@test.ma"); await p.fill('[data-testid="admin-mdp"]', "bon-mdp"); await p.click('[data-testid="admin-connecter"]'); await p.waitForSelector('[data-testid="kpi-Nouvelles commandes"]');
await p.goto(BASE + "/admin/promos"); await p.waitForSelector('[data-testid="form-promo"]');
await p.click('[data-testid="promo-creer"]'); ok("code obligatoire", await p.getByText("Saisissez un code").isVisible());
await p.fill('[data-testid="promo-code"]', "bienvenue10"); await p.fill('[data-testid="promo-valeur"]', "10"); await p.click('[data-testid="promo-creer"]'); await p.waitForSelector('[data-testid="ligne-promo"]');
ok("code promo créé en majuscules (BIENVENUE10, -10 %)", T.codes_promo[0]?.code === "BIENVENUE10" && T.codes_promo[0].type === "pourcentage" && T.codes_promo[0].valeur === 10);
await p.selectOption('[data-testid="promo-type"]', "livraison"); await p.fill('[data-testid="promo-code"]', "LIVRAISON"); await p.click('[data-testid="promo-creer"]'); await p.waitForTimeout(600);
ok("code « livraison offerte » créé", T.codes_promo.some((c) => c.code === "LIVRAISON" && c.type === "livraison" && c.valeur === 0));

// ── Boutique : WhatsApp, pied de page, promo au paiement
await p.goto(BASE + "/"); await p.waitForSelector('[data-testid="whatsapp-flottant"]');
ok("bouton WhatsApp flottant vers 212677859227", (await p.getAttribute('[data-testid="whatsapp-flottant"]', "href")).startsWith("https://wa.me/212677859227"));
ok("pied de page : e-mail de contact depuis les réglages", (await p.textContent('[data-testid="email-contact"]')) === "contact@swtfamily.com");
await p.goto(BASE + "/produit/tshirt"); await p.waitForSelector('[data-testid="whatsapp-produit"]'); ok("lien WhatsApp sur la fiche produit avec le nom du produit", decodeURIComponent(await p.getAttribute('[data-testid="whatsapp-produit"]', "href")).includes("T-shirt"));
await p.goto(BASE + "/commande"); await p.waitForSelector('[data-testid="champ-nom"]');
await p.fill('[data-testid="champ-nom"]', "Salma Idrissi"); await p.fill('[data-testid="champ-telephone"]', "0661223344");
await p.waitForSelector('[data-testid="champ-promo"]');
await p.fill('[data-testid="champ-promo"]', "FAUX"); await p.click('[data-testid="appliquer-promo"]'); await p.waitForSelector('[data-testid="erreur-promo"]'); ok("code inconnu refusé", true);
await p.fill('[data-testid="champ-promo"]', "bienvenue10"); await p.click('[data-testid="appliquer-promo"]'); await p.waitForSelector('[data-testid="promo-appliquee"]');
ok("code appliqué : remise 12 affichée, total 120-12+30 = 138", (await p.textContent('[data-testid="remise"]')).includes("12") && (await p.textContent('[data-testid="total"]')).replace(/\D/g, "").startsWith("138"));
await p.fill('[data-testid="champ-ville"]', "Tanger"); await p.fill('[data-testid="champ-adresse"]', "Rue 5"); await p.click('[data-testid="confirmer"]'); await p.waitForSelector('[data-testid="merci"]');
ok("le code promo est envoyé avec la commande", env.rpc.filter(([n]) => n === "passer_commande").pop()[1].p.code_promo === "BIENVENUE10");
ok("visites enregistrées (appel enregistrer_visite)", env.rpc.some(([n, a]) => n === "enregistrer_visite" && a.p_chemin === "/" && a.p_visiteur.length >= 8));

// ── Avis : formulaire sur la fiche produit, modération
await p.goto(BASE + "/produit/tshirt"); await p.waitForSelector('[data-testid="form-avis"]');
await p.click('[data-testid="note-4"]'); await p.fill('[data-testid="avis-titre"]', "Très bien"); await p.fill('[data-testid="avis-texte"]', "Belle qualité"); await p.click('[data-testid="avis-envoyer"]'); await p.waitForSelector('[data-testid="avis-merci"]');
const av = T.avis[0]; ok("avis enregistré en attente, note 4, nom affiché", av && av.statut === "attente" && av.note === 4 && av.nom_affiche.length > 0);
ok("avis non publié : pas encore visible sur la page /avis", (await (async () => { await p.goto(BASE + "/avis"); await p.waitForSelector('[data-testid="page-avis"]'); await p.waitForTimeout(500); return p.locator('[data-testid="avis"]').count(); })()) === 0);
await p.goto(BASE + "/admin/avis"); await p.waitForSelector('[data-testid="avis-admin"]'); await p.click('[data-testid="avis-publier"]'); await p.waitForTimeout(600);
ok("avis publié par l'administrateur", T.avis[0].statut === "publie");
await p.goto(BASE + "/avis"); await p.waitForSelector('[data-testid="avis"]'); ok("avis publié visible sur l'onglet Avis", (await p.textContent('[data-testid="page-avis"]')).includes("Belle qualité"));
await p.goto(BASE + "/produit/tshirt"); await p.waitForSelector('[data-testid="avis"]'); ok("avis publié visible sur la fiche produit", true);

// ── Statistiques
await p.goto(BASE + "/admin/statistiques"); await p.waitForSelector('[data-testid="st-vis"]');
ok("statistiques : 7 visiteurs, 4 aujourd'hui", (await p.textContent('[data-testid="st-vis"]')) === "7" && (await p.textContent('[data-testid="st-auj"]')) === "4");

// ── Réglages : coordonnées modifiables
await p.goto(BASE + "/admin/reglages"); await p.waitForSelector('[data-testid="reg-whatsapp"]');
await p.fill('[data-testid="reg-whatsapp"]', "212600000000"); await p.fill('[data-testid="reg-email_contact"]', "info@swtfamily.com"); await p.fill('[data-testid="reg-instagram"]', "https://instagram.com/sweetfamily"); await p.click('[data-testid="reg-enregistrer"]'); await p.waitForSelector('[data-testid="reg-message"]');
ok("réglages de contact enregistrés", T.reglages[0].whatsapp === "212600000000" && T.reglages[0].instagram.includes("instagram"));
await p.goto(BASE + "/"); await p.waitForSelector('[data-testid="social-instagram"]');
ok("le site reprend les nouvelles coordonnées", (await p.getAttribute('[data-testid="whatsapp-pied"]', "href")).includes("212600000000") && (await p.textContent('[data-testid="email-contact"]')) === "info@swtfamily.com");

// ── Campagnes
await p.goto(BASE + "/admin/newsletter"); await p.waitForSelector('[data-testid="camp-sujet"]');
await p.click('[data-testid="camp-envoyer"]'); ok("campagne vide refusée", await p.getByText("sujet et le message sont obligatoires").isVisible());
await p.fill('[data-testid="camp-sujet"]', "Nouvelle collection"); await p.fill('[data-testid="camp-contenu"]', "Bonjour,\n\nDécouvrez nos nouveautés."); await p.fill('[data-testid="camp-test-mail"]', "moi@x.com"); await p.click('[data-testid="camp-test"]'); await p.waitForSelector('[data-testid="camp-message"]');
ok("e-mail de test demandé à la fonction", env.fn?.some((x) => x.action === "test" && x.a === "moi@x.com"));
await p.fill('[data-testid="camp-quand"]', "2020-01-01T10:00"); await p.click('[data-testid="camp-planifier"]'); ok("date passée refusée", await p.getByText("dans le futur").isVisible());
const dem = new Date(Date.now() + 86400000); dem.setMinutes(dem.getMinutes() - dem.getTimezoneOffset());
await p.fill('[data-testid="camp-quand"]', dem.toISOString().slice(0, 16)); await p.click('[data-testid="camp-planifier"]'); await p.waitForSelector('[data-testid="campagne"]');
ok("campagne programmée enregistrée", T.campagnes[0]?.statut === "planifiee" && !!T.campagnes[0].planifiee_le);
p.once("dialog", (d) => d.accept());
await p.locator('[data-testid="campagne"] >> text=Modifier').click(); await p.click('[data-testid="camp-envoyer"]'); await p.waitForFunction(() => document.querySelector('[data-testid="camp-message"]')?.textContent?.includes("envoyée")).catch(() => {}); await p.waitForTimeout(800);
ok("envoi immédiat : fonction appelée, campagne marquée envoyée", env.fn.some((x) => x.action === "envoyer") && T.campagnes[0].statut === "envoyee");

ok("aucune erreur JavaScript", err.length === 0); if (err.length) console.log(err);
await b.close(); process.exit(echecs ? 1 : 0);
