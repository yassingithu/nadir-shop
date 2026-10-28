import type { Produit } from "./types";
/** Image du produit : la première photo si elle existe, sinon un visuel de remplacement. */
export default function Visuel({ p, className = "" }: { p: Produit & { photos?: string[] }; className?: string }) {
  if (p.photos?.[0]) return <img src={p.photos[0]} alt="" loading="lazy" className={`object-cover ${className}`} />;
  return (
    <div className={`grid place-items-center ${className}`} style={{ background: `linear-gradient(160deg, ${p.couleur}22, ${p.couleur}55)` }} aria-hidden>
      <svg viewBox="0 0 100 100" className="w-1/2 opacity-80" fill={p.couleur}><path d="M35 12 22 20 8 38l12 8 8-7v49h44V39l8 7 12-8-14-18-13-8c-2 7-8 11-15 11s-13-4-15-11Z" /></svg>
    </div>
  );
}
