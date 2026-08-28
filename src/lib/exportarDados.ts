/**
 * Exportação de dados (LGPD, art. 18, V — portabilidade).
 *
 * A Política de Privacidade promete que o professor consegue baixar tudo que
 * o Studoo guarda dele. Aqui a gente cumpre: um único `.json` legível, com
 * cabeçalho de metadados e uma chave por tabela.
 */
import { supabase } from "@/lib/supabase";
import { toDateOnly } from "@/lib/dates";

/** Versão do formato do arquivo. Sobe quando o shape mudar. */
export const VERSAO_EXPORTACAO = 1;

/** Tabelas com coluna `professor_id`. `professores` entra à parte (filtra por id). */
const TABELAS_DO_PROFESSOR = [
  "alunos",
  "aulas_recorrentes",
  "aulas",
  "cobrancas",
  "pacotes_aulas",
  "bloqueios_data",
  "mensagens_enviadas",
] as const;

export type TabelaExportada =
  | "professores"
  | (typeof TABELAS_DO_PROFESSOR)[number];

export interface ExportacaoStudoo {
  _meta: {
    app: "Studoo";
    versao_exportacao: number;
    exportado_em: string;
    professor_id: string;
    tabelas: TabelaExportada[];
    observacao: string;
  };
  dados: Record<TabelaExportada, unknown[]>;
}

/** Busca tudo do professor. Lança se qualquer consulta falhar. */
export const coletarDadosProfessor = async (
  professorId: string,
): Promise<ExportacaoStudoo> => {
  const professorQuery = supabase
    .from("professores")
    .select("*")
    .eq("id", professorId);

  const [professorRes, ...resultados] = await Promise.all([
    professorQuery,
    ...TABELAS_DO_PROFESSOR.map((tabela) =>
      supabase.from(tabela).select("*").eq("professor_id", professorId),
    ),
  ]);

  if (professorRes.error) throw professorRes.error;

  const dados = {
    professores: (professorRes.data ?? []) as unknown[],
  } as Record<TabelaExportada, unknown[]>;

  TABELAS_DO_PROFESSOR.forEach((tabela, i) => {
    const res = resultados[i];
    if (res.error) throw res.error;
    dados[tabela] = (res.data ?? []) as unknown[];
  });

  return {
    _meta: {
      app: "Studoo",
      versao_exportacao: VERSAO_EXPORTACAO,
      exportado_em: new Date().toISOString(),
      professor_id: professorId,
      tabelas: ["professores", ...TABELAS_DO_PROFESSOR],
      observacao:
        "Exportação completa dos seus dados no Studoo. Cada chave em 'dados' é uma tabela do banco.",
    },
    dados,
  };
};

/** Dispara o download de um blob com o nome dado. */
const baixarArquivo = (nome: string, conteudo: string, tipo: string) => {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari precisa da URL viva por um instante depois do clique.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export interface ResultadoExportacao {
  arquivo: string;
  /** Quantidade de registros por tabela — bom pro toast e pro console. */
  totais: Record<string, number>;
}

/**
 * Baixa TODOS os dados do professor num `.json` indentado.
 * Uso: `await baixarMeusDados(professor.id)`.
 */
export const baixarMeusDados = async (
  professorId: string,
): Promise<ResultadoExportacao> => {
  const exportacao = await coletarDadosProfessor(professorId);
  const arquivo = `studoo-meus-dados-${toDateOnly(new Date())}.json`;

  baixarArquivo(
    arquivo,
    JSON.stringify(exportacao, null, 2),
    "application/json;charset=utf-8",
  );

  const totais = Object.fromEntries(
    Object.entries(exportacao.dados).map(([tabela, linhas]) => [
      tabela,
      linhas.length,
    ]),
  );

  return { arquivo, totais };
};
