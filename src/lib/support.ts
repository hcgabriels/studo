import { buildWhatsAppUrl } from "./whatsapp";

const DEFAULT_SUPPORT_PHONE = "5549999256170";
const supportPhone =
  (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.trim() ||
  DEFAULT_SUPPORT_PHONE;

export const supportUsesWhatsApp = Boolean(supportPhone);

export const supportHref = supportPhone
  ? buildWhatsAppUrl(
      supportPhone,
      "Olá! Preciso de ajuda com o Studoo.",
    )
  : "mailto:contato@studoo.app?subject=Suporte%20Studoo";
