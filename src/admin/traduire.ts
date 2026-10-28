/** Traduction automatique (français → anglais / arabe) par le service gratuit MyMemory, sans clé. Toujours à relire. */
const cache = new Map<string, string>();

function morceaux(texte: string): string[] {
  const phrases = texte.match(/[^.!?\n]+[.!?]*\s*/g) ?? [texte], res: string[] = [];
  let cur = "";
  for (const p of phrases) { if ((cur + p).length > 450 && cur) { res.push(cur); cur = ""; } cur += p; }
  if (cur) res.push(cur);
  return res.flatMap((m) => (m.length > 480 ? m.match(/.{1,450}/gs)! : [m]));
}

async function un(q: string, vers: "en" | "ar"): Promise<string> {
  const cle = vers + "|" + q;
  if (cache.has(cle)) return cache.get(cle)!;
  const rep = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=fr|${vers}`);
  if (!rep.ok) throw new Error("service indisponible");
  const j = (await rep.json()) as { responseData?: { translatedText?: string }; responseStatus?: number | string };
  const t = j.responseData?.translatedText ?? "";
  if (Number(j.responseStatus) !== 200 || !t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) throw new Error("limite du service atteinte");
  cache.set(cle, t); return t;
}

export async function traduire(texte: string, vers: "en" | "ar"): Promise<string> {
  const t = texte.trim(); if (!t) return "";
  const parts = morceaux(t), sortie: string[] = [];
  for (const p of parts) sortie.push((await un(p.trim(), vers)).trim());
  return sortie.join(" ");
}

/** Traduit vers l'anglais et l'arabe uniquement les champs vides (ou tous si `ecraser`). Renvoie les champs à remplir. */
export async function completer(fr: string, actuel: { en?: string; ar?: string }, ecraser = false): Promise<{ en?: string; ar?: string }> {
  const sortie: { en?: string; ar?: string } = {};
  if (!fr.trim()) return sortie;
  const [en, ar] = await Promise.all([
    ecraser || !actuel.en?.trim() ? traduire(fr, "en") : Promise.resolve(undefined),
    ecraser || !actuel.ar?.trim() ? traduire(fr, "ar") : Promise.resolve(undefined),
  ]);
  if (en) sortie.en = en; if (ar) sortie.ar = ar;
  return sortie;
}

export const MESSAGE_ECHEC = "Traduction automatique indisponible pour le moment : écrivez l'anglais et l'arabe à la main, ou réessayez plus tard.";
