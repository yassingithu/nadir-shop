const ORDRE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];
/** Ordre naturel des tailles : XS < S < M < L < XL, puis les pointures numériques, puis le reste par ordre alphabétique. */
export const TAILLES_BEBE = ["3 mois", "6 mois", "12 mois", "18 mois"];
export const TAILLES_ENFANT = ["2 ans", "4 ans", "6 ans", "8 ans", "10 ans", "12 ans", "14 ans", "16 ans"];
/** Âge en années d'une taille enfant (« 6 mois » → 0,5 ; « 8 ans » → 8), sinon null. */
export function ageTaille(t: string | undefined): number | null {
  const m = /^(\d+(?:[.,]\d+)?)\s*(mois|ans?)$/i.exec((t ?? "").trim());
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return /^mois$/i.test(m[2]) ? n / 12 : n;
}
/** Affiche une taille enfant dans la langue du visiteur (« 8 ans » → « 8 yrs » / « 8 سنوات »). */
export function libelleTaille(t: string | undefined, langue: string): string {
  const m = /^(\d+(?:[.,]\d+)?)\s*(mois|ans?)$/i.exec((t ?? "").trim());
  if (!m || langue === "fr") return t ?? "";
  const mois = /^mois$/i.test(m[2]);
  return langue === "en" ? `${m[1]} ${mois ? "months" : "yrs"}` : `${m[1]} ${mois ? "أشهر" : "سنوات"}`;
}
export function comparerTailles(a: string | undefined, b: string | undefined): number {
  const x = (a ?? "").toUpperCase(), y = (b ?? "").toUpperCase();
  const aa = ageTaille(x), ab = ageTaille(y);
  if (aa !== null && ab !== null) return aa - ab;
  if (aa !== null) return -1;
  if (ab !== null) return 1;
  const ia = ORDRE.indexOf(x), ib = ORDRE.indexOf(y);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  const na = parseFloat(x), nb = parseFloat(y);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return x.localeCompare(y, "fr");
}
