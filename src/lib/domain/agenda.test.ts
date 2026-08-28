import { describe, it, expect } from "vitest";
import {
  buildSlotsForDay,
  buildHorasGrid,
  grantsReposicao,
  toleranciaMatch,
  type SlotAula,
} from "./agenda";
import type { Aluno, Aula, AulaRecorrente } from "@/types/supabase";

// ---------------------------------------------------------------------------
// Fábricas mínimas. Só o que a regra lê; o resto é preenchimento.
// ---------------------------------------------------------------------------
const aluno = (over: Partial<Aluno> = {}): Aluno => ({
  id: "aluno-1",
  professor_id: "prof-1",
  nome: "Ana",
  instrumento: "Violão",
  telefone: null,
  email_notificacao: null,
  nome_responsavel: null,
  dia_semana: 1,
  horario: "14:00",
  duracao_minutos: 60,
  valor_mensalidade: 350,
  status: "ativo",
  observacoes: null,
  reposicoes_disponiveis: 0,
  data_nascimento: null,
  nivel: null,
  objetivo: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

const recorrente = (over: Partial<AulaRecorrente> = {}): AulaRecorrente => ({
  id: "rec-1",
  aluno_id: "aluno-1",
  professor_id: "prof-1",
  dia_semana: 1,
  horario: "14:00",
  duracao_minutos: 60,
  ativo: true,
  data_inicio: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...over,
});

const aula = (over: Partial<Aula> = {}): Aula => ({
  id: "aula-1",
  aluno_id: "aluno-1",
  professor_id: "prof-1",
  data_hora: "2026-08-10T14:00:00",
  duracao_minutos: 60,
  status: "realizada",
  tipo: "recorrente",
  reagendada_de: null,
  aluno_experimental_nome: null,
  eh_reposicao: false,
  observacao: null,
  licao_casa: null,
  repertorio: null,
  created_at: "2026-08-10T00:00:00Z",
  updated_at: "2026-08-10T00:00:00Z",
  ...over,
});

/** Segunda-feira. */
const SEGUNDA = new Date(2026, 7, 10);

describe("toleranciaMatch", () => {
  it("usa metade da duração, com piso de 15 minutos", () => {
    expect(toleranciaMatch(60)).toBe(30);
    expect(toleranciaMatch(90)).toBe(45);
    // Aula de 30min não pode tolerar 15min pra cada lado sem colidir; o piso
    // é o mínimo aceitável e ainda assim menor que o intervalo entre aulas.
    expect(toleranciaMatch(30)).toBe(15);
    expect(toleranciaMatch(0)).toBe(30); // sem duração, assume 60
  });
});

describe("buildSlotsForDay — casamento slot ↔ aula registrada", () => {
  it("REGRESSÃO: dois horários do mesmo aluno no mesmo dia não casam com a mesma aula", () => {
    // Este era o bug: com tolerância fixa de ±60min, o slot das 15h casava com
    // a aula das 14h. A presença ia pro registro errado e a segunda marcação
    // sobrescrevia a primeira.
    const a = aluno();
    const recs = [
      recorrente({ id: "rec-14", horario: "14:00" }),
      recorrente({ id: "rec-15", horario: "15:00" }),
    ];
    const registrada = aula({
      id: "aula-14h",
      data_hora: "2026-08-10T14:00:00",
    });

    const slots = buildSlotsForDay(SEGUNDA, [a], [registrada], recs);

    expect(slots).toHaveLength(2);
    expect(slots[0].date.getHours()).toBe(14);
    expect(slots[1].date.getHours()).toBe(15);
    expect(slots[0].existingAula?.id).toBe("aula-14h");
    // O ponto do teste: o slot das 15h fica SEM registro.
    expect(slots[1].existingAula).toBeUndefined();
  });

  it("casa com a aula mais próxima quando há pequeno desvio de horário", () => {
    const registrada = aula({ data_hora: "2026-08-10T14:10:00" });
    const slots = buildSlotsForDay(SEGUNDA, [aluno()], [registrada], [recorrente()]);
    expect(slots[0].existingAula?.id).toBe("aula-1");
  });

  it("não casa quando o desvio passa da tolerância", () => {
    const registrada = aula({ data_hora: "2026-08-10T16:00:00" });
    const slots = buildSlotsForDay(SEGUNDA, [aluno()], [registrada], [recorrente()]);
    expect(slots[0].existingAula).toBeUndefined();
  });
});

describe("buildSlotsForDay — data_inicio da recorrência", () => {
  it("REGRESSÃO: não gera slot antes da data de início", () => {
    // Aluno cadastrado dia 10 não pode aparecer na segunda dia 3.
    const recs = [recorrente({ data_inicio: "2026-08-10" })];
    const segundaAnterior = new Date(2026, 7, 3);

    expect(buildSlotsForDay(segundaAnterior, [aluno()], [], recs)).toHaveLength(0);
    expect(buildSlotsForDay(SEGUNDA, [aluno()], [], recs)).toHaveLength(1);
  });

  it("sem data_inicio, a recorrência vale sempre", () => {
    const recs = [recorrente({ data_inicio: null })];
    expect(
      buildSlotsForDay(new Date(2020, 0, 6), [aluno()], [], recs),
    ).toHaveLength(1);
  });
});

describe("buildSlotsForDay — filtros e tipos", () => {
  it("ignora aluno arquivado", () => {
    const slots = buildSlotsForDay(
      SEGUNDA,
      [aluno({ status: "inativo" })],
      [],
      [recorrente()],
    );
    expect(slots).toHaveLength(0);
  });

  it("inclui avulsa e experimental, sem duplicar a recorrente", () => {
    const avulsa = aula({
      id: "avulsa-1",
      tipo: "avulsa",
      data_hora: "2026-08-10T19:00:00",
      status: "agendada",
    });
    const trial = aula({
      id: "trial-1",
      tipo: "experimental",
      aluno_id: null,
      aluno_experimental_nome: "Curioso",
      data_hora: "2026-08-10T20:00:00",
    });
    const slots = buildSlotsForDay(
      SEGUNDA,
      [aluno()],
      [aula(), avulsa, trial],
      [recorrente()],
    );
    expect(slots.map((s) => s.date.getHours())).toEqual([14, 19, 20]);
    expect(slots[1].isExtra).toBe(true);
    expect(slots[2].aluno.nome).toBe("Curioso");
  });

  it("devolve os slots em ordem cronológica", () => {
    const recs = [
      recorrente({ id: "r1", horario: "18:00" }),
      recorrente({ id: "r2", horario: "09:00" }),
      recorrente({ id: "r3", horario: "13:30" }),
    ];
    const slots = buildSlotsForDay(SEGUNDA, [aluno()], [], recs);
    expect(slots.map((s) => s.date.getHours())).toEqual([9, 13, 18]);
  });
});

describe("buildHorasGrid", () => {
  const slotEm = (hora: number): SlotAula => ({
    aluno: aluno(),
    date: new Date(2026, 7, 10, hora, 0),
  });

  it("mantém 07h–22h quando tudo cabe na faixa padrão", () => {
    expect(buildHorasGrid([slotEm(14)])).toEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
  });

  it("REGRESSÃO: estica a grade pra aula fora do horário comercial", () => {
    // Aula às 6h ou 23h simplesmente sumia da grade — sem scroll nem aviso.
    const grid = buildHorasGrid([slotEm(6), slotEm(23)]);
    expect(grid[0]).toBe(6);
    expect(grid[grid.length - 1]).toBe(23);
    expect(grid).toContain(14);
  });

  it("aguenta grade vazia", () => {
    expect(buildHorasGrid([])).toHaveLength(16);
  });
});

describe("grantsReposicao — política de faltas", () => {
  it("falta justificada sempre concede", () => {
    expect(grantsReposicao("falta_justificada", true)).toBe(true);
    expect(grantsReposicao("falta_justificada", false)).toBe(true);
    expect(grantsReposicao("falta_justificada", null)).toBe(true);
  });

  it("falta sem aviso só concede na política flexível", () => {
    expect(grantsReposicao("falta_sem_aviso", false)).toBe(true);
    expect(grantsReposicao("falta_sem_aviso", true)).toBe(false);
    // Default (null/undefined) é rigoroso: não concede.
    expect(grantsReposicao("falta_sem_aviso", null)).toBe(false);
    expect(grantsReposicao("falta_sem_aviso", undefined)).toBe(false);
  });

  it("presença e status desconhecido nunca concedem", () => {
    expect(grantsReposicao("realizada", false)).toBe(false);
    expect(grantsReposicao(undefined, false)).toBe(false);
  });
});
