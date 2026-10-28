import type { Categorie, Produit, Reglages } from "./types";
const TAILLE = { cle: "taille", nom: { fr: "Taille", en: "Size", ar: "المقاس" } };
const tailles = (stocks: number[]) => ["S", "M", "L", "XL"].map((t, i) => ({ id: "", valeurs: { taille: t }, prix: null, stock: stocks[i] }));
let n = 0;
const v = (p: string, vs: ReturnType<typeof tailles>) => vs.map((x) => ({ ...x, id: `${p}-${++n}` }));

export const CATEGORIES_DEMO: Categorie[] = [
  { slug: "hauts", nom: { fr: "Hauts", en: "Tops", ar: "قمصان" } },
  { slug: "bas", nom: { fr: "Pantalons", en: "Trousers", ar: "سراويل" } },
  { slug: "vestes", nom: { fr: "Vestes", en: "Jackets", ar: "سترات" } },
];
export const PRODUITS_DEMO: Produit[] = [
  { id: "p1", slug: "tshirt-coton", categorie: "hauts", nom: { fr: "T-shirt en coton", en: "Cotton T-shirt", ar: "تيشرت قطني" }, description: { fr: "Coupe droite, coton épais et doux, couleur qui tient au lavage.", en: "Straight cut, thick soft cotton, colour that lasts in the wash.", ar: "قصة مستقيمة، قطن سميك وناعم، لون يدوم بعد الغسيل." }, prix: 120, prix_barre: null, couleur: "#1f4d3f", options: [TAILLE], variantes: v("p1", tailles([4, 10, 6, 0])) },
  { id: "p2", slug: "chemise-lin", categorie: "hauts", nom: { fr: "Chemise en lin", en: "Linen shirt", ar: "قميص من الكتان" }, description: { fr: "Légère et fraîche, parfaite pour l'été.", en: "Light and cool, perfect for summer.", ar: "خفيفة ومنعشة، مثالية لفصل الصيف." }, prix: 260, prix_barre: 320, couleur: "#d9c7a3", options: [TAILLE], variantes: v("p2", tailles([2, 5, 5, 3])) },
  { id: "p3", slug: "pantalon-chino", categorie: "bas", nom: { fr: "Pantalon chino", en: "Chino trousers", ar: "سروال شينو" }, description: { fr: "Taille confortable, tissu résistant.", en: "Comfortable waist, hard-wearing fabric.", ar: "خصر مريح وقماش متين." }, prix: 340, prix_barre: null, couleur: "#8a6f4d", options: [TAILLE], variantes: v("p3", tailles([3, 8, 8, 2])) },
  { id: "p4", slug: "veste-legere", categorie: "vestes", nom: { fr: "Veste légère", en: "Light jacket", ar: "سترة خفيفة" }, description: { fr: "Pour les mi-saisons, poches intérieures.", en: "For mid-season, with inner pockets.", ar: "لأنصاف الفصول، مع جيوب داخلية." }, prix: 480, prix_barre: null, couleur: "#2b2f3a", options: [TAILLE], variantes: v("p4", tailles([1, 2, 0, 0])) },
];
export const REGLAGES_DEMO: Reglages = { nom_boutique: "Sweet Family", frais_livraison: 30, livraison_gratuite_des: 500, virement_titulaire: "Sweet Family (exemple)", virement_banque: "Banque d'exemple", virement_rib: "000 000 0000000000000000 00", whatsapp: "" };
