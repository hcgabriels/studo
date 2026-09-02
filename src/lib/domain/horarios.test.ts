import { describe, expect, it } from "vitest";
import { getHorariosDoAluno } from "./horarios";
import type { Aluno } from "@/types/supabase";

const aluno = (over: Partial<Aluno> = {}): Aluno => ({
  id: "aluno-1",
  professor_id: "prof-1",
  nome: "Ana",
  instrumento: "Violão",
  telefone: null,
  email_notificacao: null,
  nome_responsavel: null,
  dia_semana: 1,
  horario: "09:00:00",
  duracao_minutos: 60,
  valor_mensalidade: 350,
  status: "ativo",
  observacoes: null,
  reposicoes_disponiveis: 0,
  data_nascimento: null,
  nivel: null,
  objetivo: null,
  created_at: "2026-08-31T12:00:00Z",
  updated_at: "2026-08-31T12:00:00Z",
  ...over,
});

describe("getHorariosDoAluno", () => {
  it("mantém o fallback legado quando há dia e horário", () => {
    expect(getHorariosDoAluno(aluno(), [])).toEqual([
      {
        id: null,
        dia_semana: 1,
        horario: "09:00:00",
        duracao_minutos: 60,
        data_inicio: "2026-08-31",
      },
    ]);
  });

  it("REGRESSÃO: aluno importado sem horário não ganha aula fantasma", () => {
    const semHorario = aluno({
      dia_semana: null,
      horario: null,
    });

    expect(getHorariosDoAluno(semHorario, [])).toEqual([]);
  });
});
