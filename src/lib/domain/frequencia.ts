/**
 * Cálculo de frequência.
 *
 * Vivia dentro de `Relatorios.tsx`. É a função que produz o número que o
 * professor usa pra cobrar (ou não) uma falta — se ela erra, ele desconfia do
 * app inteiro. Já errou duas vezes: contava aula em dia bloqueado e contava o
 * mês inteiro pra aluno cadastrado no dia 25.
 */
import { getHorariosDoAluno } from "@/lib/domain/horarios";
import { parseDateOnly } from "@/lib/dates";
import type { Aluno, Aula, AulaRecorrente } from "@/types/supabase";

export interface FrequenciaAluno {
  aluno: Aluno;
  previstas: number;
  realizadas: number;
  faltasJustificadas: number;
  faltasSemAviso: number;
  presencaPct: number; // 0-100
}

export const calcFrequencia = (
  alunos: Aluno[],
  recorrentes: AulaRecorrente[],
  aulas: Aula[],
  inicio: Date,
  fim: Date,
  isDiaBloqueado: (d: Date) => boolean = () => false
): FrequenciaAluno[] => {
  // Conta quantas ocorrências recorrentes caem no período pra cada aluno.
  //
  // Precisa descontar duas coisas que o cálculo antigo ignorava:
  //  - dias BLOQUEADOS (feriado, férias). Quem tirava uma semana aparecia com
  //    uma queda de frequência que nunca aconteceu.
  //  - o INÍCIO da recorrência. Aluno cadastrado dia 25 contava o mês inteiro
  //    como previsto e caía pra ~25% de presença no primeiro mês.
  const ocorrenciasPrevistasPorAluno = new Map<string, number>();
  for (const aluno of alunos) {
    if (aluno.status !== "ativo") continue;
    const horarios = getHorariosDoAluno(aluno, recorrentes);
    let count = 0;
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      if (!isDiaBloqueado(cursor)) {
        for (const h of horarios) {
          if (cursor.getDay() !== h.dia_semana) continue;
          if (h.data_inicio && cursor < parseDateOnly(h.data_inicio)) continue;
          count++;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    ocorrenciasPrevistasPorAluno.set(aluno.id, count);
  }

  // Agrupa aulas registradas por aluno
  const aulasPorAluno = new Map<string, Aula[]>();
  for (const aula of aulas) {
    if (!aula.aluno_id) continue;
    const arr = aulasPorAluno.get(aula.aluno_id) ?? [];
    arr.push(aula);
    aulasPorAluno.set(aula.aluno_id, arr);
  }

  return alunos
    .filter((a) => a.status === "ativo")
    .map((aluno) => {
      const aulasDoAluno = aulasPorAluno.get(aluno.id) ?? [];
      const realizadas = aulasDoAluno.filter(
        (a) => a.status === "realizada"
      ).length;
      const faltasJustificadas = aulasDoAluno.filter(
        (a) => a.status === "falta_justificada"
      ).length;
      const faltasSemAviso = aulasDoAluno.filter(
        (a) => a.status === "falta_sem_aviso"
      ).length;
      // Prevista = max entre o que tava agendado e o que foi registrado
      // (aulas avulsas/extras + reagendamentos podem ir além do recorrente)
      const recorrentesPrevistas =
        ocorrenciasPrevistasPorAluno.get(aluno.id) ?? 0;
      const totalRegistros =
        realizadas + faltasJustificadas + faltasSemAviso;
      const previstas = Math.max(recorrentesPrevistas, totalRegistros);

      const consideradas = realizadas + faltasJustificadas + faltasSemAviso;
      const presencaPct =
        consideradas > 0
          ? Math.round((realizadas / consideradas) * 100)
          : -1; // -1 = sem dados (não pode calcular)

      return {
        aluno,
        previstas,
        realizadas,
        faltasJustificadas,
        faltasSemAviso,
        presencaPct,
      };
    });
};
