import { describe, expect, it } from "vitest";
import { buildAlunosImportRpcPayload } from "./importacaoAlunos";
import type { AlunoImportRow } from "@/lib/csv";

const linha = (over: Partial<AlunoImportRow> = {}): AlunoImportRow => ({
  nome: " Ana ",
  instrumento: "Violão",
  telefone: "11999999999",
  horarios: [],
  valor_mensalidade: 350,
  errors: [],
  ...over,
});

describe("buildAlunosImportRpcPayload", () => {
  it("representa aluno sem horário com uma lista vazia", () => {
    expect(buildAlunosImportRpcPayload([linha()], "2026-09-01")[0]).toEqual({
      nome: "Ana",
      instrumento: "Violão",
      telefone: "11999999999",
      valor_mensalidade: 350,
      horarios: [],
    });
  });

  it("aninha todos os horários com a data de início", () => {
    expect(
      buildAlunosImportRpcPayload(
        [linha({
          horarios: [
            { dia_semana: 3, horario: "14:30", duracao_minutos: 45 },
            { dia_semana: 5, horario: "16:00", duracao_minutos: 60 },
          ],
        })],
        "2026-09-01",
      ),
    ).toMatchObject([
      {
        horarios: [
          {
            dia_semana: 3,
            horario: "14:30:00",
            duracao_minutos: 45,
            data_inicio: "2026-09-01",
          },
          {
            dia_semana: 5,
            horario: "16:00:00",
            duracao_minutos: 60,
            data_inicio: "2026-09-01",
          },
        ],
      },
    ]);
  });
});
