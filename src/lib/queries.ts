import type { QueryClient } from "@tanstack/react-query";

/**
 * Lista de queryKeys raiz que dependem de cobranças.
 * Sempre que uma mutation toca em cobrancas, invalide todas.
 *
 * O TanStack Query usa prefix matching apenas se o primeiro elemento bate
 * exatamente. Como temos várias variantes ("cobrancas", "cobrancas-dashboard",
 * "cobrancas-alunos" etc), precisamos enumerar.
 */
const COBRANCAS_KEYS = [
  ["cobrancas"],
  ["cobrancas-dashboard"],
  ["cobrancas-mes-anterior"],
  ["cobrancas-alunos"],
  ["cobrancas-ano"],
  ["cobrancas-6m"],
  ["aluno-cobrancas"],
] as const;

const ALUNOS_KEYS = [
  ["alunos"],
  ["alunos-detalhe"],
  ["aluno-detalhe"],
] as const;

const AULAS_KEYS = [
  ["aulas"],
  ["aulas-agenda"],
  ["aulas-alunos"],
  ["aulas-recentes"],
  ["aulas-relatorio"],
  ["aulas-aluno"],
  ["aluno-aulas"],
  ["aula"],
] as const;

const MENSAGENS_KEYS = [
  ["mensagens"],
  ["aluno-mensagens"],
] as const;

const PACOTES_KEYS = [
  ["pacotes"],
  ["pacotes-aluno"],
  ["pacotes-dashboard"],
] as const;

const PROFESSOR_KEYS = [["professor"]] as const;

/** Invalida todas as queries de cobranças no app. */
export function invalidateCobrancas(qc: QueryClient) {
  for (const key of COBRANCAS_KEYS) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/** Invalida todas as queries de alunos no app. */
export function invalidateAlunos(qc: QueryClient) {
  for (const key of ALUNOS_KEYS) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/** Invalida todas as queries de aulas no app. */
export function invalidateAulas(qc: QueryClient) {
  for (const key of AULAS_KEYS) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/** Invalida o registro do professor. */
export function invalidateProfessor(qc: QueryClient) {
  for (const key of PROFESSOR_KEYS) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/** Invalida histórico de mensagens (WhatsApp etc). */
export function invalidateMensagens(qc: QueryClient) {
  for (const key of MENSAGENS_KEYS) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/** Invalida pacotes (vendidos, dashboard, perfil aluno). */
export function invalidatePacotes(qc: QueryClient) {
  for (const key of PACOTES_KEYS) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/**
 * Atalho: invalida cobranças + alunos + aulas + professor.
 * Use depois de mutations grandes (gerar cobranças, deletar aluno, etc).
 */
export function invalidateAll(qc: QueryClient) {
  invalidateCobrancas(qc);
  invalidateAlunos(qc);
  invalidateAulas(qc);
  invalidateProfessor(qc);
}
