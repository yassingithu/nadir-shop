import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Domaines provisoires : on demande aux moteurs de recherche de ne pas les indexer (retirer quand le vrai nom de domaine est branché). */
const PROVISOIRE = /(\.workers\.dev|\.pages\.dev|\.netlify\.app|\.vercel\.app|localhost|127\.0\.0\.1)$/;

function meta(attr: "name" | "property", cle: string, valeur: string | undefined, ajoutes: Element[]) {
  if (!valeur) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${cle}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, cle); document.head.appendChild(el); ajoutes.push(el); }
  el.content = valeur;
}

export type SeoProps = {
  titre: string; description?: string; image?: string; noindex?: boolean;
  /** Données structurées (schema.org), par exemple un produit. */
  donnees?: Record<string, unknown>; type?: "website" | "product";
};

/** Titre, description, aperçu de partage (WhatsApp, Facebook…), adresse canonique et données produit pour Google. */
export function useSeo({ titre, description, image, noindex, donnees, type = "website" }: SeoProps) {
  const { pathname } = useLocation();
  const json = donnees ? JSON.stringify(donnees) : "";
  useEffect(() => {
    const ancien = document.title, ajoutes: Element[] = [];
    document.title = titre;
    const url = location.origin + pathname;
    const desc = description?.slice(0, 160);
    meta("name", "description", desc, ajoutes);
    meta("property", "og:title", titre, ajoutes); meta("property", "og:description", desc, ajoutes);
    meta("property", "og:type", type === "product" ? "product" : "website", ajoutes); meta("property", "og:url", url, ajoutes);
    meta("property", "og:image", image, ajoutes);
    meta("name", "twitter:card", image ? "summary_large_image" : "summary", ajoutes);
    const interdit = noindex || PROVISOIRE.test(location.hostname);
    meta("name", "robots", interdit ? "noindex, nofollow" : "index, follow", ajoutes);
    const canon = document.createElement("link"); canon.rel = "canonical"; canon.href = url; document.head.appendChild(canon); ajoutes.push(canon);
    if (json) { const s = document.createElement("script"); s.type = "application/ld+json"; s.text = json; document.head.appendChild(s); ajoutes.push(s); }
    return () => { document.title = ancien; ajoutes.forEach((e) => e.remove()); };
  }, [titre, description, image, noindex, json, type, pathname]);
}
