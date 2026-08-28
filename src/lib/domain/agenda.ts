/**
 * Regra de negócio da agenda.
 *
 * Isto morava dentro de `Agenda.tsx`, junto com três modais e 2 mil linhas de
 * JSX — o que tornava impossível testar. E era exatamente aqui que estavam os
 * piores bugs: presença gravada na aula errada, aula fantasma retroativa e
 * aula sumindo da grade fora do horário comercial.
 *
 * Nada aqui toca React ou Supabase de propósito: entra dado, sai dado.
 */
import { addDays, differenceInMinutes, startOfDay } from "date-fns";
import { getHorariosDoAluno } from "@/lib/domain/horarios";
import type { Aluno, Aula, AulaRecorrente } from "@/types/supabase";

export interface SlotAula {
  aluno: Aluno;
  date: Date;
  existingAula?: Aula;
  isExtra?: boolean;
}

export const makeExtraAluno = (aula: Aula, alunoReal?: Aluno): Aluno => {
  if (alunoReal) return alunoReal;
  return {
    id: aula.aluno_id ?? "",
    professor_id: aula.professor_id,
    nome: aula.aluno_experimental_nome ?? "Aula experimental",
    instrumento: aula.tipo === "experimental" ? "Experimental" : "—",
    telefone: null,
    email_notificacao: null,
    nome_responsavel: null,
    dia_semana: 0,
    horario: "",
    duracao_minutos: aula.duracao_minutos,
    valor_mensalidade: 0,
    status: "ativo",
    observacoes: null,
    reposicoes_disponiveis: 0,
    data_nascimento: null,
    nivel: null,
    objetivo: null,
    created_at: aula.created_at,
    updated_at: aula.updated_at,
  };
};

export const HORA_GRID_MIN = 7;
export const HORA_GRID_MAX = 22;

/**
 * Faixa de horas da grade semanal.
 *
 * Era fixa em 07h–22h, então aula às 06:30 ou 23h — perfeitamente cadastrável,
 * já que o campo de horário é livre — simplesmente sumia da grade, sem scroll
 * nem aviso. Agora a faixa estica pra caber o que existe na semana.
 */
export const buildHorasGrid = (slots: SlotAula[]): number[] => {
  let min = HORA_GRID_MIN;
  let max = HORA_GRID_MAX;
  for (const s of slots) {
    const h = s.date.getHours();
    if (h < min) min = h;
    if (h > max) max = h;
  }
  return Array.from({ length: max - min + 1 }, (_, i) => i + min);
};

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Índice de aulas por dia, memoizado pela identidade do array.
 *
 * Antes, `buildSlotsForDay` varria TODAS as aulas com `new Date()` dentro do
 * `.find()`, e a visão mensal chama a função 42 vezes — o que dava centenas de
 * milhares de construções de Date a cada troca de mês.
 */
const aulaIndexCache = new WeakMap<Aula[], Map<string, Aula[]>>();
const getAulasPorDia = (aulas: Aula[]): Map<string, Aula[]> => {
  const cached = aulaIndexCache.get(aulas);
  if (cached) return cached;
  const idx = new Map<string, Aula[]>();
  for (const a of aulas) {
    const k = dayKey(new Date(a.data_hora));
    const arr = idx.get(k);
    if (arr) arr.push(a);
    else idx.set(k, [a]);
  }
  aulaIndexCache.set(aulas, idx);
  return idx;
};

/**
 * Tolerância pra casar um slot recorrente com o registro real da aula.
 *
 * Era ±60min fixo, o que fazia dois horários do mesmo aluno no mesmo dia
 * (ex: 14h e 15h) casarem com a MESMA aula — a presença ia parar no registro
 * errado e a segunda marcação sobrescrevia a primeira.
 */
export const toleranciaMatch = (duracaoMin: number) =>
  Math.max(15, Math.floor((duracaoMin || 60) / 2));

// Slots de um único dia (recorrentes + avulsas/experimentais).
export const buildSlotsForDay = (
  day: Date,
  alunos: Aluno[],
  aulas: Aula[],
  recorrentes: AulaRecorrente[]
): SlotAula[] => {
  const aulasDoDia = getAulasPorDia(aulas).get(dayKey(day)) ?? [];
  const usedAulaIds = new Set<string>();

  // 1) Monta os slots recorrentes do dia, já em ordem cronológica.
  const candidatos: Array<{ aluno: Aluno; date: Date; duracao: number }> = [];
  for (const aluno of alunos) {
    if (aluno.status !== "ativo") continue;
    for (const h of getHorariosDoAluno(aluno, recorrentes)) {
      if (h.dia_semana !== day.getDay()) continue;
      // Recorrência só vale a partir da data de início (quando informada).
      // Sem isso, aluno cadastrado hoje aparecia com aulas em todo o passado.
      if (h.data_inicio) {
        const inicio = new Date(`${h.data_inicio}T00:00:00`);
        if (day < startOfDay(inicio)) continue;
      }
      const [hh, mm] = h.horario.split(":").map(Number);
      const date = new Date(day);
      date.setHours(hh, mm, 0, 0);
      candidatos.push({ aluno, date, duracao: h.duracao_minutos });
    }
  }
  candidatos.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 2) Casa cada slot com a aula mais próxima ainda não usada.
  const slots: SlotAula[] = candidatos.map(({ aluno, date, duracao }) => {
    const tol = toleranciaMatch(duracao);
    let melhor: Aula | undefined;
    let melhorDiff = Number.POSITIVE_INFINITY;
    for (const au of aulasDoDia) {
      if (usedAulaIds.has(au.id)) continue;
      if (au.aluno_id !== aluno.id) continue;
      if (au.tipo === "avulsa" || au.tipo === "experimental") continue;
      const diff = Math.abs(differenceInMinutes(new Date(au.data_hora), date));
      if (diff < tol && diff < melhorDiff) {
        melhor = au;
        melhorDiff = diff;
      }
    }
    if (melhor) usedAulaIds.add(melhor.id);
    return {
      aluno: { ...aluno, duracao_minutos: duracao },
      date,
      existingAula: melhor,
    };
  });

  // 3) Avulsas/experimentais desse dia
  for (const aula of aulasDoDia) {
    if (usedAulaIds.has(aula.id)) continue;
    if (aula.tipo !== "avulsa" && aula.tipo !== "experimental") continue;
    const alunoReal = alunos.find((a) => a.id === aula.aluno_id);
    slots.push({
      aluno: makeExtraAluno(aula, alunoReal),
      date: new Date(aula.data_hora),
      existingAula: aula,
      isExtra: true,
    });
  }

  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const buildWeekSlots = (
  alunos: Aluno[],
  weekStart: Date,
  aulas: Aula[],
  recorrentes: AulaRecorrente[]
) => {
  const slots: SlotAula[] = [];
  for (let d = 0; d < 7; d++) {
    slots.push(
      ...buildSlotsForDay(addDays(weekStart, d), alunos, aulas, recorrentes)
    );
  }
  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const grantsReposicao = (
  status: string | undefined,
  cobrarSemAviso: boolean | null | undefined,
): boolean => {
  if (status === "falta_justificada") return true;
  if (status === "falta_sem_aviso" && cobrarSemAviso === false) return true;
  return false;
};
