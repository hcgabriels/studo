/**
 * Regras de acesso pela assinatura. Puro (sem React/Supabase) e testado.
 *
 * Dois tipos de "trialing" convivem na mesma coluna:
 * - Teste do Studoo: criado no banco quando a conta nasce, sem Stripe
 *   (`gateway_subscription_id` nulo). Dura DIAS_TESTE dias.
 * - Teste da Stripe: o professor assinou durante o teste do Studoo e a Stripe
 *   segura a primeira cobrança até o fim dele (`gateway_subscription_id` preenchido).
 */
import type { Assinatura } from "@/types/supabase";

export const DIAS_TESTE = 7;

type AssinaturaAcesso = Pick<
  Assinatura,
  "status" | "trial_ends_at" | "gateway_subscription_id"
>;

const DIA_MS = 24 * 60 * 60 * 1000;

const fimDoTeste = (a: AssinaturaAcesso) =>
  a.trial_ends_at ? new Date(a.trial_ends_at) : null;

/** Libera o painel? */
export function temAcesso(a: AssinaturaAcesso | null | undefined, agora = new Date()): boolean {
  if (!a) return false;
  if (a.status === "active") return true;
  if (a.status === "trialing") {
    const fim = fimDoTeste(a);
    return !!fim && fim.getTime() > agora.getTime();
  }
  return false;
}

/** Teste do Studoo em andamento (ainda sem assinatura na Stripe). */
export function emTesteGratis(a: AssinaturaAcesso | null | undefined, agora = new Date()): boolean {
  return !!a && a.status === "trialing" && !a.gateway_subscription_id && temAcesso(a, agora);
}

/** Teste do Studoo acabou e o professor não assinou. */
export function testeEncerrado(a: AssinaturaAcesso | null | undefined, agora = new Date()): boolean {
  return !!a && a.status === "trialing" && !a.gateway_subscription_id && !temAcesso(a, agora);
}

/** Já existe assinatura na Stripe que ainda vale: não deixa abrir outro checkout. */
export function jaAssinou(a: AssinaturaAcesso | null | undefined): boolean {
  if (!a?.gateway_subscription_id) return false;
  return ["active", "trialing", "past_due", "unpaid", "paused"].includes(a.status);
}

/** A Stripe só aceita segurar a primeira cobrança se faltar pelo menos 48h de teste. */
export const MINIMO_TESTE_STRIPE_MS = 48 * 60 * 60 * 1000;

/** Assinando agora, a primeira cobrança fica pro fim do teste? */
export function cobraNoFimDoTeste(a: AssinaturaAcesso | null | undefined, agora = new Date()): boolean {
  if (!emTesteGratis(a, agora)) return false;
  const fim = fimDoTeste(a!);
  return !!fim && fim.getTime() - agora.getTime() >= MINIMO_TESTE_STRIPE_MS;
}

/** Dias inteiros que faltam, arredondando pra cima (sobrou 1h = "1 dia"). */
export function diasRestantesTeste(a: AssinaturaAcesso | null | undefined, agora = new Date()): number {
  const fim = a ? fimDoTeste(a) : null;
  if (!fim) return 0;
  return Math.max(0, Math.ceil((fim.getTime() - agora.getTime()) / DIA_MS));
}
