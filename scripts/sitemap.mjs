// Génère public/sitemap.xml (accueil, boutique, catégories, produits) et public/robots.txt avant la construction du site.
// Si la base est injoignable, le plan ne contient que les pages fixes.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const SITE = (process.env.SITE_URL || "https://swtfamily.com").replace(/\/$/, "");
const env = {};
if (existsSync(".env.production")) for (const l of readFileSync(".env.production", "utf8").split("\n")) { const m = /^(\w+)=(.*)$/.exec(l.trim()); if (m) env[m[1]] = m[2]; }
const URL_DB = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL, CLE = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

const urls = [["/", "1.0"], ["/boutique", "0.9"]];
try {
  if (URL_DB && CLE) {
    const get = async (t, q) => { const r = await fetch(`${URL_DB}/rest/v1/${t}?${q}`, { headers: { apikey: CLE, Authorization: `Bearer ${CLE}` }, signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(t + " " + r.status); return r.json(); };
    for (const c of await get("categories", "select=slug&actif=eq.true")) urls.push([`/boutique?cat=${encodeURIComponent(c.slug)}`, "0.7"]);
    for (const p of await get("produits", "select=slug&actif=eq.true")) urls.push([`/produit/${encodeURIComponent(p.slug)}`, "0.8"]);
  }
} catch (e) { console.warn("sitemap : base injoignable, pages fixes seulement (" + e.message + ")"); }

const jour = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, p]) => `  <url><loc>${(SITE + u).replace(/&/g, "&amp;")}</loc><lastmod>${jour}</lastmod><priority>${p}</priority></url>`).join("\n")}\n</urlset>\n`;
writeFileSync("public/sitemap.xml", xml);
writeFileSync("public/robots.txt", `User-agent: *\nDisallow: /admin\nDisallow: /panier\nDisallow: /commande\nDisallow: /suivi\nDisallow: /compte\nDisallow: /newsletter\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`sitemap : ${urls.length} adresses pour ${SITE}`);
