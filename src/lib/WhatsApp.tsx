import { MessageCircle } from "lucide-react";
import { useLangue } from "./i18n";
import { useDonnees } from "./donnees";
export const lienWhatsApp = (numero: string, message?: string) => `https://wa.me/${numero.replace(/\D/g, "")}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
/** Bouton flottant WhatsApp, présent sur toutes les pages de la boutique. */
export default function BoutonWhatsApp() {
  const { t } = useLangue();
  const { reglages } = useDonnees();
  if (!reglages.whatsapp) return null;
  return <a href={lienWhatsApp(reglages.whatsapp, t("Bonjour, j'ai une question."))} target="_blank" rel="noreferrer" aria-label={t("Discuter sur WhatsApp")} data-testid="whatsapp-flottant"
    className="fixed z-20 end-4 bottom-20 md:bottom-6 h-14 w-14 rounded-full grid place-items-center text-white shadow-lg" style={{ background: "#25D366" }}><MessageCircle className="h-7 w-7" /></a>;
}
