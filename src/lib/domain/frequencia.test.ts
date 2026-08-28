import { describe, it, expect } from "vitest";
import { calcFrequencia } from "./frequencia";
import type { Aluno, Aula, AulaRecorrente } from "@/types/supabase";

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

// Agosto/2026 começa num sábado. Segundas: 3, 10, 17, 24, 31 → 5 ocorrências.
const INICIO = new Date(2026, 7, 1);
const FIM = new Date(2026, 7, 31, 23, 59);

describe("calcFrequencia — previstas", () => {
  it("conta todas as segundas do mês", () => {
    const [f] = calcFrequencia([aluno()], [recorrente()], [], INICIO, FIM);
    expect(f.previstas).toBe(5);
  });

  it("REGRESSÃO: desconta dias bloqueados (feriado/férias)", () => {
    // Sem isso, quem tirava uma semana aparecia com queda de frequência que
    // nunca aconteceu.
    const bloqueado = (d: Date) => d.getDate() === 17 || d.getDate() === 24;
    const [f] = calcFrequencia(
      [aluno()],
      [recorrente()],
      [],
      INICIO,
      FIM,
      bloqueado,
    );
    expect(f.previstas).toBe(3);
  });

  it("REGRESSÃO: respeita data_inicio da recorrência", () => {
    // Aluno cadastrado dia 8 não deve ter a segunda dia 3 como prevista.
    const [f] = calcFrequencia(
      [aluno()],
      [recorrente({ data_inicio: "2026-08-08" })],
      [],
      INICIO,
      FIM,
    );
    expect(f.previstas).toBe(4);
  });

  it("soma os dois horários de quem tem duas aulas por semana", () => {
    const recs = [
      recorrente({ id: "r1", dia_semana: 1 }),
      recorrente({ id: "r2", dia_semana: 3 }), // quartas: 5, 12, 19, 26
    ];
    const [f] = calcFrequencia([aluno()], recs, [], INICIO, FIM);
    expect(f.previstas).toBe(9);
  });

  it("nunca fica abaixo do que foi efetivamente registrado", () => {
    // Aulas avulsas e reposições podem passar do recorrente.
    const extras = Array.from({ length: 8 }, (_, i) =>
      aula({ id: `a${i}`, data_hora: `2026-08-${10 + i}T14:00:00` }),
    );
    const [f] = calcFrequencia([aluno()], [recorrente()], extras, INICIO, FIM);
    expect(f.previstas).toBe(8);
  });
});

describe("calcFrequencia — presença", () => {
  it("calcula sobre o que foi registrado, não sobre o previsto", () => {
    const registros = [
      aula({ id: "a1", status: "realizada" }),
      aula({ id: "a2", status: "realizada" }),
      aula({ id: "a3", status: "falta_sem_aviso" }),
      aula({ id: "a4", status: "falta_justificada" }),
    ];
    const [f] = calcFrequencia([aluno()], [recorrente()], registros, INICIO, FIM);
    expect(f.realizadas).toBe(2);
    expect(f.faltasSemAviso).toBe(1);
    expect(f.faltasJustificadas).toBe(1);
    expect(f.presencaPct).toBe(50);
  });

  it("devolve -1 (sem dados) quando nada foi registrado", () => {
    // O professor que ainda não marcou presença não pode aparecer com 0%.
    const [f] = calcFrequencia([aluno()], [recorrente()], [], INICIO, FIM);
    expect(f.presencaPct).toBe(-1);
  });

  it("ignora status que não conta presença (agendada, reagendada, cancelada)", () => {
    const registros = [
      aula({ id: "a1", status: "realizada" }),
      aula({ id: "a2", status: "agendada" }),
      aula({ id: "a3", status: "reagendada" }),
      aula({ id: "a4", status: "cancelada_professor" }),
    ];
    const [f] = calcFrequencia([aluno()], [recorrente()], registros, INICIO, FIM);
    expect(f.presencaPct).toBe(100);
  });

  it("não mistura aulas de alunos diferentes", () => {
    const outro = aluno({ id: "aluno-2", nome: "Bruno" });
    const registros = [
      aula({ id: "a1", aluno_id: "aluno-1", status: "realizada" }),
      aula({ id: "a2", aluno_id: "aluno-2", status: "falta_sem_aviso" }),
    ];
    const res = calcFrequencia(
      [aluno(), outro],
      [recorrente(), recorrente({ id: "r2", aluno_id: "aluno-2" })],
      registros,
      INICIO,
      FIM,
    );
    expect(res.find((f) => f.aluno.id === "aluno-1")?.presencaPct).toBe(100);
    expect(res.find((f) => f.aluno.id === "aluno-2")?.presencaPct).toBe(0);
  });

  it("deixa aluno arquivado fora do relatório", () => {
    const res = calcFrequencia(
      [aluno({ status: "inativo" })],
      [recorrente()],
      [],
      INICIO,
      FIM,
    );
    expect(res).toHaveLength(0);
  });
});
