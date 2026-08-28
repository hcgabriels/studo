/**
 * Formatação compartilhada.
 *
 * `fmtBRL` estava copiado literalmente em 5 arquivos, com mais 2 variantes
 * divergentes — o mesmo valor aparecia com e sem centavos dependendo da tela.
 */

/** R$ 1.234,50 — padrão do app (sempre com centavos). */
export const fmtBRL = (valor: number | string): string =>
  `R$ ${Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** R$ 1.235 — para listas densas, onde os centavos só fazem ruído. */
export const fmtBRLCompacto = (valor: number | string): string =>
  `R$ ${Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

/** 1.234,50 — sem o prefixo, pra quando o "R$" já está no layout. */
export const fmtNumero = (valor: number | string, casas = 2): string =>
  Number(valor).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
