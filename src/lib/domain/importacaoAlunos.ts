import type { AlunoImportRow } from "@/lib/csv";

export interface AlunoImportRpcPayload {
  nome: string;
  instrumento: string;
  telefone: string | null;
  valor_mensalidade: number;
  horarios: Array<{
    dia_semana: number;
    horario: string;
    duracao_minutos: number;
    data_inicio: string;
  }>;
}

/**
 * Monta o documento consumido pela RPC de importação. O vínculo entre aluno e
 * horários passa a ser estrutural (horários aninhados), sem depender da ordem
 * do RETURNING nem de nome/telefone para correlacionar registros.
 */
export const buildAlunosImportRpcPayload = (
  rows: AlunoImportRow[],
  dataInicio: string,
): AlunoImportRpcPayload[] =>
  rows.map((row) => ({
    nome: row.nome.trim(),
    instrumento: row.instrumento || "",
    telefone: row.telefone,
    valor_mensalidade: row.valor_mensalidade,
    horarios: row.horarios.map((horario) => ({
      dia_semana: horario.dia_semana,
      horario: `${horario.horario}:00`,
      duracao_minutos: horario.duracao_minutos,
      data_inicio: dataInicio,
    })),
  }));
