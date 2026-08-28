/**
 * Paleta dos gráficos.
 *
 * `Donut` e `HBars` cada um carregava a própria lista de cores, com os mesmos
 * hex soltos (`#8C7BD9`, `#3CB59C`) fora dos tokens — mudar a paleta exigia
 * editar dois arquivos e torcer pra não esquecer nenhum.
 *
 * Os tokens do tema entram como `hsl(var(--x))` (acompanham light/dark);
 * os dois hex são cores de apoio que não têm token próprio.
 */

/** Roxo de apoio — sem token no tema. */
export const CHART_ROXO = "#8C7BD9";

/** Verde-água de apoio — sem token no tema. */
export const CHART_TEAL = "#3CB59C";

/** Paleta padrão do Donut — ordem pensada pra fatias vizinhas contrastarem. */
export const CHART_PALETTE_DONUT = [
  "hsl(var(--primary))",
  CHART_ROXO,
  "hsl(var(--destructive))",
  "hsl(var(--info))",
  CHART_TEAL,
  "hsl(var(--muted-foreground))",
] as const;

/** Paleta padrão das barras horizontais (ranking: 1º lugar em primary). */
export const CHART_PALETTE_BARS = [
  "hsl(var(--primary))",
  CHART_ROXO,
  "hsl(var(--info))",
  CHART_TEAL,
  "hsl(var(--success))",
  "hsl(var(--destructive))",
] as const;

/** Cor da posição `i`, ciclando a paleta. */
export const corDaSerie = (
  palette: readonly string[],
  i: number,
): string => palette[i % palette.length];
