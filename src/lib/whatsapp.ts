import { unformatPhone } from "./masks";
import { supabase } from "./supabase";
import { track } from "./analytics";

const COUNTRY_CODE = "55";

export type WhatsAppTipo =
  | "saudacao"
  | "lembrete_aula"
  | "cobranca"
  | "parabens"
  | "resumo_aula"
  | "outro";

export const buildWhatsAppUrl = (phone: string, message?: string): string => {
  const digits = unformatPhone(phone);
  const full = digits.startsWith(COUNTRY_CODE) ? digits : `${COUNTRY_CODE}${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${full}${text}`;
};

export interface OpenWhatsAppOptions {
  professorId?: string;
  alunoId?: string | null;
  tipo?: WhatsAppTipo;
}

/**
 * Abre o WhatsApp e registra a mensagem no histórico.
 *
 * A janela abre PRIMEIRO e de forma síncrona — se abrisse depois de um await,
 * o browser trataria como popup não solicitado e bloquearia.
 *
 * Retorna a Promise do insert pra quem precisa invalidar cache só depois que o
 * registro chegou ao banco (senão o ✓ "Lembrado" não aparece e o professor
 * reenvia a mensagem).
 */
export const openWhatsApp = (
  phone: string,
  message?: string,
  opts?: OpenWhatsAppOptions
): Promise<void> => {
  window.open(buildWhatsAppUrl(phone, message), "_blank", "noopener,noreferrer");
  track("whatsapp_aberto", { tipo: opts?.tipo ?? "outro" });

  if (!opts?.professorId || !message) return Promise.resolve();

  return Promise.resolve(
    supabase.from("mensagens_enviadas").insert({
      professor_id: opts.professorId,
      aluno_id: opts.alunoId ?? null,
      tipo: opts.tipo ?? "outro",
      texto: message,
      telefone: unformatPhone(phone),
    }),
  ).then(({ error }) => {
    if (error) console.warn("Falha ao registrar mensagem:", error.message);
  });
};

export const messageTemplates = {
  saudacao: (alunoNome: string, professorNome: string) =>
    `Olá ${alunoNome}! Aqui é o(a) ${professorNome}. Tudo bem?`,
  lembreteAula: (alunoNome: string, professorNome: string, quando: string) =>
    `Oi ${alunoNome}! Passando pra lembrar da sua aula ${quando}. Qualquer coisa, é só me avisar. — ${professorNome}`,
  lembreteAulaHoje: (alunoNome: string, instrumento: string, horario: string) =>
    `Olá ${alunoNome}! 👋 Passando para lembrar da sua aula de ${instrumento} hoje às ${horario}. Até lá! 🎵`,
  lembreteCobranca: (
    alunoNome: string,
    professorNome: string,
    valor: string,
    vencimento: string,
    pix?: string
  ) =>
    `Oi ${alunoNome}! Passando pra lembrar da sua mensalidade de ${valor} com vencimento em ${vencimento}.${pix ? ` Meu PIX: ${pix}` : ""} Obrigado(a)! — ${professorNome}`,
  parabens: (alunoNome: string, professorNome: string) =>
    `Feliz aniversário, ${alunoNome}! 🎉 Que esse novo ano seja cheio de música e alegria. Um abraço, ${professorNome}.`,
  resumoAula: (
    alunoNome: string,
    dataAula: string,
    observacao: string | null,
    licao: string | null,
    proximaAulaTexto: string | null,
    professorNome: string,
  ): string => {
    const partes: string[] = [
      `Oi ${alunoNome}! Resumo da sua aula de ${dataAula}:`,
    ];
    if (observacao) partes.push(`\n✏️ O que trabalhamos: ${observacao}`);
    if (licao) {
      const ate = proximaAulaTexto ? `até ${proximaAulaTexto}` : "pra próxima aula";
      partes.push(`\n📝 Pra praticar ${ate}: ${licao}`);
    }
    partes.push(`\nQualquer dúvida me chama!\n— ${professorNome}`);
    return partes.join("\n");
  },
};
