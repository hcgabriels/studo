/**
 * Detecção de plataforma pra rótulos de atalho de teclado.
 *
 * O produto é BR: a maioria dos professores está em Windows/Android, então
 * mostrar "⌘" pra todo mundo é simplesmente errado. Aqui a gente decide o
 * símbolo pelo que a máquina realmente é.
 */

interface NavegadorComUAData extends Navigator {
  userAgentData?: { platform?: string };
}

/** Mac, iPhone e iPad usam ⌘. O resto (Windows, Linux, Android) usa Ctrl. */
export const isMacPlatform = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavegadorComUAData;
  const plataforma = nav.userAgentData?.platform || nav.platform || "";
  const ua = nav.userAgent || "";
  return (
    /mac|iphone|ipad|ipod/i.test(plataforma) || /mac os x|iphone|ipad/i.test(ua)
  );
};

/** Rótulo do atalho de salvar, já no formato que vai pro rodapé do dialog. */
export const atalhoSalvarLabel = (): string =>
  isMacPlatform() ? "⌘ + Enter pra salvar" : "Ctrl + Enter pra salvar";

/** Formato mínimo de um KeyboardEvent (nativo ou sintético do React). */
interface EventoTecla {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}

/**
 * `true` quando o evento é Cmd+Enter (Mac) ou Ctrl+Enter (resto). Aceita os
 * dois em qualquer plataforma — quem vem de outro app não deveria errar.
 */
export const isAtalhoSalvar = (e: EventoTecla): boolean =>
  (e.key === "Enter" || e.key === "NumpadEnter") && (e.metaKey || e.ctrlKey);
