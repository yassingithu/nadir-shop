const ORDRE = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];
/** Ordre naturel des tailles : XS < S < M < L < XL, puis les pointures numériques, puis le reste par ordre alphabétique. */
export function comparerTailles(a: string | undefined, b: string | undefined): number {
  const x = (a ?? "").toUpperCase(), y = (b ?? "").toUpperCase();
  const ia = ORDRE.indexOf(x), ib = ORDRE.indexOf(y);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  const na = parseFloat(x), nb = parseFloat(y);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return x.localeCompare(y, "fr");
}
