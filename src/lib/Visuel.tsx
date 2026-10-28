import type { Produit } from "./types";
import Exemple, { type Vue } from "./exemples";
/** Image du produit : la photo numéro `n` si elle existe, sinon une photo d'exemple dessinée (vue au choix). */
export default function Visuel({ p, className = "", n = 0, vue = "face" }: { p: Produit & { photos?: string[] }; className?: string; n?: number; vue?: Vue }) {
  if (p.photos?.[n]) return <img src={p.photos[n]} alt="" loading="lazy" className={`object-cover ${className}`} />;
  return <Exemple vue={vue} couleur={p.couleur} className={className} />;
}
