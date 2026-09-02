/**
 * Horários recorrentes — funções puras.
 *
 * Moravam em `hooks/useAulasRecorrentes.ts`, que importa o client do Supabase.
 * Isso arrastava a validação de env pra dentro de qualquer teste que só queria
 * calcular um horário. Aqui não entra React nem rede.
 */
import type { Aluno, AulaRecorrente } from "@/types/supabase";

export interface HorarioRecorrente {
  id: string | null;
  dia_semana: number;
  horario: string;
  duracao_minutos: number;
  /** Data (YYYY-MM-DD) a partir da qual a recorrência vale. Null = sempre valeu. */
  data_inicio: string | null;
}

/**
 * Retorna os horários recorrentes de um aluno. Usa a tabela aulas_recorrentes
 * se houver registros; caso contrário, usa os campos legados do próprio aluno
 * (retrocompatibilidade durante a migration).
 */
export const getHorariosDoAluno = (
  aluno: Aluno,
  recorrentes: AulaRecorrente[]
): HorarioRecorrente[] => {
  const doAluno = recorrentes.filter((r) => r.aluno_id === aluno.id);
  if (doAluno.length > 0) {
    return doAluno.map((r) => ({
      id: r.id,
      dia_semana: r.dia_semana,
      horario: r.horario,
      duracao_minutos: r.duracao_minutos,
      data_inicio: r.data_inicio ?? null,
    }));
  }
  if (aluno.dia_semana === null || aluno.horario === null) return [];
  return [
    {
      id: null,
      dia_semana: aluno.dia_semana,
      horario: aluno.horario,
      duracao_minutos: aluno.duracao_minutos,
      // Sem tabela de recorrentes, a data de cadastro do aluno é o melhor
      // proxy pro início da recorrência (evita aula fantasma no passado).
      data_inicio: aluno.created_at ? aluno.created_at.slice(0, 10) : null,
    },
  ];
};

/**
 * Próxima ocorrência recorrente desse aluno depois da data informada.
 * Usado pra preencher o "pra praticar até X" no resumo do WhatsApp.
 */
export const nextAulaAfter = (
  aluno: Aluno,
  recorrentes: AulaRecorrente[],
  after: Date,
): Date | null => {
  const horarios = getHorariosDoAluno(aluno, recorrentes);
  if (horarios.length === 0) return null;
  let earliest: Date | null = null;
  for (const h of horarios) {
    const d = new Date(after);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    while (d.getDay() !== h.dia_semana) {
      d.setDate(d.getDate() + 1);
    }
    const [hh, mm] = h.horario.split(":").map(Number);
    d.setHours(hh, mm, 0, 0);
    if (!earliest || d < earliest) earliest = d;
  }
  return earliest;
};
