import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Langue = "fr" | "en" | "ar";
export type Tr = { fr: string; en?: string; ar?: string };

const TEXTES: Record<string, { en: string; ar: string }> = {
  "Boutique": { en: "Shop", ar: "المتجر" },
  "Tout": { en: "All", ar: "الكل" },
  "Panier": { en: "Cart", ar: "السلة" },
  "Suivre ma commande": { en: "Track my order", ar: "تتبّع طلبي" },
  "Ajouter au panier": { en: "Add to cart", ar: "أضف إلى السلة" },
  "Choisis une option": { en: "Choose an option", ar: "اختر خيارًا" },
  "Épuisé": { en: "Sold out", ar: "نفدت الكمية" },
  "Plus que {n} en stock": { en: "Only {n} left", ar: "بقي {n} فقط" },
  "En stock": { en: "In stock", ar: "متوفر" },
  "Ajouté au panier": { en: "Added to cart", ar: "تمت الإضافة إلى السلة" },
  "Votre panier est vide": { en: "Your cart is empty", ar: "سلتك فارغة" },
  "Continuer mes achats": { en: "Keep shopping", ar: "متابعة التسوق" },
  "Sous-total": { en: "Subtotal", ar: "المجموع الفرعي" },
  "Livraison": { en: "Delivery", ar: "التوصيل" },
  "Gratuite": { en: "Free", ar: "مجاني" },
  "Total": { en: "Total", ar: "المجموع" },
  "Commander": { en: "Checkout", ar: "إتمام الطلب" },
  "Retirer": { en: "Remove", ar: "إزالة" },
  "Vos informations": { en: "Your details", ar: "معلوماتك" },
  "Nom complet": { en: "Full name", ar: "الاسم الكامل" },
  "Téléphone": { en: "Phone", ar: "الهاتف" },
  "E-mail (facultatif)": { en: "Email (optional)", ar: "البريد الإلكتروني (اختياري)" },
  "Ville": { en: "City", ar: "المدينة" },
  "Adresse de livraison": { en: "Delivery address", ar: "عنوان التوصيل" },
  "Remarque (facultatif)": { en: "Note (optional)", ar: "ملاحظة (اختياري)" },
  "Mode de paiement": { en: "Payment method", ar: "طريقة الدفع" },
  "Paiement à la livraison": { en: "Cash on delivery", ar: "الدفع عند الاستلام" },
  "Vous payez en espèces quand vous recevez la commande.": { en: "You pay in cash when you receive the order.", ar: "تدفع نقدًا عند استلام الطلب." },
  "Virement bancaire": { en: "Bank transfer", ar: "تحويل بنكي" },
  "La commande est préparée dès réception du virement.": { en: "The order is prepared once the transfer is received.", ar: "يتم تجهيز الطلب بعد استلام التحويل." },
  "Confirmer la commande": { en: "Place order", ar: "تأكيد الطلب" },
  "Envoi…": { en: "Sending…", ar: "جارٍ الإرسال…" },
  "Merci, votre commande est enregistrée": { en: "Thank you, your order is placed", ar: "شكرًا، تم تسجيل طلبك" },
  "Numéro de commande": { en: "Order number", ar: "رقم الطلب" },
  "Gardez ce numéro et votre téléphone pour suivre la commande.": { en: "Keep this number and your phone to track the order.", ar: "احتفظ بهذا الرقم وبهاتفك لتتبّع الطلب." },
  "Pour régler par virement :": { en: "To pay by transfer:", ar: "للدفع عبر التحويل:" },
  "Titulaire": { en: "Account holder", ar: "صاحب الحساب" },
  "Banque": { en: "Bank", ar: "البنك" },
  "RIB": { en: "Bank account (RIB)", ar: "رقم الحساب (RIB)" },
  "Indiquez le numéro de commande dans le motif du virement.": { en: "Put the order number in the transfer reference.", ar: "اكتب رقم الطلب في سبب التحويل." },
  "Retour à la boutique": { en: "Back to the shop", ar: "العودة إلى المتجر" },
  "Numéro de commande ": { en: "Order number ", ar: "رقم الطلب " },
  "Rechercher": { en: "Look up", ar: "بحث" },
  "Commande introuvable. Vérifiez le numéro et le téléphone.": { en: "Order not found. Check the number and phone.", ar: "الطلب غير موجود. تحقق من الرقم والهاتف." },
  "Statut": { en: "Status", ar: "الحالة" },
  "Reçue": { en: "Received", ar: "تم الاستلام" },
  "Confirmée": { en: "Confirmed", ar: "مؤكَّد" },
  "Expédiée": { en: "Shipped", ar: "تم الشحن" },
  "Livrée": { en: "Delivered", ar: "تم التسليم" },
  "Annulée": { en: "Cancelled", ar: "ملغى" },
  "Mode démonstration : les produits et commandes ne sont pas enregistrés.": { en: "Demo mode: products and orders are not saved.", ar: "وضع تجريبي: لا يتم حفظ المنتجات والطلبات." },
  "Une erreur est survenue. Réessayez.": { en: "Something went wrong. Please try again.", ar: "حدث خطأ. أعد المحاولة." },
  "Une question ? Écrivez-nous sur WhatsApp": { en: "A question? Message us on WhatsApp", ar: "سؤال؟ راسلنا على واتساب" },
  "Quantité": { en: "Quantity", ar: "الكمية" },
  "Paiement reçu": { en: "Payment received", ar: "تم استلام الدفع" },
  "En attente de paiement": { en: "Awaiting payment", ar: "في انتظار الدفع" },
  "Aucun produit pour le moment.": { en: "No products yet.", ar: "لا توجد منتجات حاليًا." },
};

export const MONNAIE = "MAD";
type Ctx = { langue: Langue; setLangue: (l: Langue) => void; t: (fr: string, v?: Record<string, string | number>) => string; tr: (o: Tr | undefined) => string; prix: (n: number) => string };
const C = createContext<Ctx>(null as unknown as Ctx);

function langueInitiale(): Langue {
  try { const s = localStorage.getItem("langue"); if (s === "fr" || s === "en" || s === "ar") return s; } catch { /* ignoré */ }
  const n = navigator.language?.slice(0, 2);
  return n === "ar" ? "ar" : n === "en" ? "en" : "fr";
}

export function LangueProvider({ children }: { children: ReactNode }) {
  const [langue, setL] = useState<Langue>(langueInitiale);
  useEffect(() => { document.documentElement.lang = langue; document.documentElement.dir = langue === "ar" ? "rtl" : "ltr"; }, [langue]);
  const setLangue = (l: Langue) => { setL(l); try { localStorage.setItem("langue", l); } catch { /* ignoré */ } };
  const t: Ctx["t"] = (fr, v) => {
    const base = langue === "fr" ? fr : TEXTES[fr]?.[langue] ?? fr;
    return v ? base.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? "")) : base;
  };
  const tr: Ctx["tr"] = (o) => (o ? (langue === "fr" ? o.fr : o[langue] || o.fr) : "");
  const prix = (n: number) => new Intl.NumberFormat(langue === "ar" ? "ar-MA-u-nu-latn" : langue === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 2 }).format(n) + " " + MONNAIE;
  return <C.Provider value={{ langue, setLangue, t, tr, prix }}>{children}</C.Provider>;
}
export const useLangue = () => useContext(C);
