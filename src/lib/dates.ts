/**
 * Utilitários de data.
 *
 * REGRA DO PROJETO: colunas `date` do Postgres (vencimento, mes_referencia,
 * data_nascimento, data_validade, bloqueios_data.data) chegam como "YYYY-MM-DD".
 *
 * `new Date("2026-01-01")` é interpretado como MEIA-NOITE UTC, que no Brasil
 * (UTC-3) vira 31/12/2025 21:00 local. Na prática isso fazia, por exemplo, a
 * cobrança de janeiro não entrar no "total pago no ano".
 *
 * Sempre use `parseDateOnly` pra essas colunas. Para colunas `timestamptz`
 * (data_hora, created_at, enviada_em) o `new Date(...)` normal está correto.
 */

/** Converte "YYYY-MM-DD" em Date à meia-noite LOCAL. */
export const parseDateOnly = (value: string): Date =>
  new Date(`${value.slice(0, 10)}T00:00:00`);

/** Versão tolerante: retorna null pra valores vazios/inválidos. */
export const parseDateOnlySafe = (
  value: string | null | undefined,
): Date | null => {
  if (!value) return null;
  const d = parseDateOnly(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Ano civil (local) de uma coluna `date`. */
export const yearOfDateOnly = (value: string): number =>
  parseDateOnly(value).getFullYear();

/** Formata "YYYY-MM-DD" a partir de um Date, sem passar por UTC. */
export const toDateOnly = (d: Date): string => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
