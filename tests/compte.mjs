// Comptes clients + newsletter, avec la FAUSSE base de tests/admin.mjs (serveur : port 5192, voir admin.mjs).
import { chromium } from "/opt/npm-tools/node_modules/playwright/index.mjs";
import { monter, T, env } from "./admin.mjs";
const BASE = "http://127.0.0.1:5192";
let echecs = 0; const ok = (nom, v) => { console.log(v ? "✅" : "❌", nom); if (!v) echecs++; };

const b = await chromium.launch(); const err = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("langue", "fr"); localStorage.setItem("panier", JSON.stringify([{ variante_id: "v2", produit_id: "p1", quantite: 1 }])); } catch {} });
const p = await ctx.newPage(); p.on("pageerror", (e) => err.push(e.message)); await monter(p);

// 1. Sans compte : porte d'entrée
await p.goto(BASE + "/commande"); await p.waitForSelector('[data-testid="porte-compte"]'); ok("commande sans compte : invitation à se connecter", true);
// newsletter dans le pied de page
await p.fill('[data-testid="newsletter-email"]', "Visiteur@Exemple.com"); await p.click('[data-testid="newsletter-envoyer"]'); await p.waitForSelector('[data-testid="newsletter-ok"]');
ok("newsletter : inscription enregistrée (minuscules)", T.abonnes_newsletter.some((a) => a.email === "visiteur@exemple.com"));
// 2. Inscription depuis la porte
await p.click('[data-testid="porte-inscription"]'); await p.waitForSelector('[data-testid="compte-nom"]');
await p.fill('[data-testid="compte-nom"]', "Salma Idrissi"); await p.fill('[data-testid="compte-telephone"]', "0661223344"); await p.fill('[data-testid="compte-email"]', "client@x.com"); await p.fill('[data-testid="compte-mdp"]', "court");
await p.click('[data-testid="compte-valider"]'); await p.waitForSelector('[data-testid="compte-erreur"]'); ok("mot de passe trop court refusé", (await p.textContent('[data-testid="compte-erreur"]')).includes("8 caractères"));
await p.fill('[data-testid="compte-mdp"]', "motdepasse8"); await p.click('[data-testid="compte-valider"]');
await p.waitForSelector('[data-testid="champ-nom"]'); ok("inscription → retour à la commande, panier conservé", p.url().endsWith("/commande"));
ok("formulaire de commande prérempli (nom, téléphone, e-mail)", (await p.inputValue('[data-testid="champ-nom"]')) === "Salma Idrissi" && (await p.inputValue('[data-testid="champ-telephone"]')) === "0661223344" && (await p.inputValue('[data-testid="champ-email"]')) === "client@x.com");
ok("newsletter cochée à l'inscription", T.abonnes_newsletter.some((a) => a.email === "client@x.com" && a.source === "inscription"));
await p.fill('[data-testid="champ-ville"]', "Tanger"); await p.fill('[data-testid="champ-adresse"]', "Rue 5"); await p.click('[data-testid="confirmer"]'); await p.waitForSelector('[data-testid="merci"]');
ok("commande passée avec un compte (numéro 1002)", (await p.textContent('[data-testid="numero"]')) === "1002" && env.rpc.some(([n]) => n === "passer_commande"));
// 3. Mon compte
await p.goto(BASE + "/compte"); await p.waitForTimeout(1500); await p.screenshot({ path: "/tmp/claude-0/ns/compte.png" }); await p.waitForSelector('[data-testid="profil-nom"]'); ok("page compte : profil affiché", (await p.inputValue('[data-testid="profil-nom"]')) === "Salma Idrissi");
await p.waitForSelector('[data-testid="mes-commandes"]'); ok("« Mes commandes » listées", (await p.locator('[data-testid="mes-commandes"] li').count()) >= 1);
await p.fill('[data-testid="profil-ville"]', "Tanger"); await p.fill('[data-testid="profil-adresse"]', "Rue 5, Malabata"); await p.click("text=Enregistrer"); await p.waitForTimeout(700);
ok("profil de livraison enregistré", env.meta.ville === "Tanger" && env.meta.adresse === "Rue 5, Malabata");
await p.click('[data-testid="deconnexion-client"]'); await p.waitForSelector('[data-testid="compte-valider"]'); ok("déconnexion client", true);
// 4. Mauvais mot de passe
await p.fill('[data-testid="compte-email"]', "client@x.com"); await p.fill('[data-testid="compte-mdp"]', "mauvais"); await p.click('[data-testid="compte-valider"]'); await p.waitForSelector('[data-testid="compte-erreur"]');
ok("mauvais mot de passe : message clair", (await p.textContent('[data-testid="compte-erreur"]')).includes("incorrect"));
// 5. Adresse déjà inscrite
await p.click('[data-testid="onglet-inscription"]'); await p.fill('[data-testid="compte-nom"]', "Autre"); await p.fill('[data-testid="compte-telephone"]', "0661000000"); await p.fill('[data-testid="compte-email"]', "deja@x.com"); await p.fill('[data-testid="compte-mdp"]', "motdepasse8"); await p.click('[data-testid="compte-valider"]');
await p.waitForSelector('[data-testid="compte-erreur"]'); ok("adresse déjà inscrite : message clair", (await p.textContent('[data-testid="compte-erreur"]')).includes("existe déjà"));
// 6. Administration : liste des abonnés
await p.goto(BASE + "/admin"); await p.waitForSelector('input[type="email"]'); await p.fill('input[type="email"]', "admin@x.com"); await p.fill('input[type="password"]', "bon-mdp"); await p.keyboard.press("Enter");
await p.waitForSelector('[data-testid="deconnexion"]'); await p.goto(BASE + "/admin/newsletter"); await p.waitForSelector('[data-testid="abonne"]');
ok("admin : abonnés de la newsletter listés", (await p.locator('[data-testid="abonne"]').count()) === 2);
// 7. Désinscription par lien
await p.goto(BASE + "/newsletter/desabonnement?t=tok0"); await p.waitForSelector('[data-testid="desabonnement"]'); await p.waitForTimeout(600);
console.log("erreurs page:", err); await b.close(); process.exit(echecs ? 1 : 0);
