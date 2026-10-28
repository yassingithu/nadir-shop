import { Star } from "lucide-react";
export function Etoiles({ note, taille = 16 }: { note: number; taille?: number }) {
  return <span className="inline-flex" role="img" aria-label={`${note}/5`} dir="ltr">{[1, 2, 3, 4, 5].map((i) => <Star key={i} width={taille} height={taille} style={{ color: "#e0a800" }} fill={i <= Math.round(note) ? "#e0a800" : "none"} />)}</span>;
}
export function moyenne(a: { note: number }[]) { return a.length ? a.reduce((s, x) => s + x.note, 0) / a.length : 0; }
