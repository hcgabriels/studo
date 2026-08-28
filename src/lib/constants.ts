/**
 * Constantes de domínio compartilhadas.
 *
 * `DIAS_SEMANA` estava duplicado em 6 arquivos, com 3 variantes abreviadas
 * diferentes — daí os rótulos divergirem entre a agenda e a lista de alunos.
 */

/**
 * Tamanho mínimo de senha. Precisa ser um só: o cadastro exigia 8 caracteres
 * e o reset aceitava 6 — mesma senha, mesmo produto, duas regras.
 */
export const MIN_PASSWORD = 8;

/**
 * Instrumentos oferecidos.
 *
 * Estava duplicado no select do formulário de aluno e no da aula experimental,
 * e o onboarding usava texto livre — dava pra cadastrar "violao" e depois o
 * valor não bater com nenhuma opção na hora de editar o aluno.
 */
export const INSTRUMENTOS = [
  "Violão",
  "Guitarra",
  "Baixo",
  "Bateria",
  "Teclado",
  "Piano",
  "Canto/Voz",
  "Flauta",
  "Saxofone",
  "Trompete",
  "Violino",
  "Ukulele",
  "Cavaquinho",
  "Pandeiro",
  "Percussão",
  "Teoria Musical",
  "Musicalização",
] as const;

/** Índice = Date.getDay() (0 = domingo). */
export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const DIAS_SEMANA_SHORT = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

/** Dia da semana por extenso, tolerante a índice fora da faixa. */
export const nomeDiaSemana = (dia: number): string =>
  DIAS_SEMANA[dia] ?? "—";

export const nomeDiaSemanaCurto = (dia: number): string =>
  DIAS_SEMANA_SHORT[dia] ?? "—";
