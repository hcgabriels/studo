import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCobrancaStatus } from "./cobranca";
import type { Cobranca } from "@/types/supabase";

const cobranca = (over: Partial<Cobranca> = {}): Cobranca => ({
  id: "cob-1",
  professor_id: "prof-1",
  aluno_id: "aluno-1",
  valor: 350,
  mes_referencia: "2026-08-01",
  vencimento: "2026-08-10",
  status: "pendente",
  data_pagamento: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  ...over,
});

/**
 * "Atrasado" não existe no banco — é derivado no cliente comparando o
 * vencimento com hoje. Por isso o relógio precisa ser fixado nos testes.
 */
describe("getCobrancaStatus", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const hoje = (iso: string) => vi.setSystemTime(new Date(iso));

  it("pago continua pago, mesmo vencido", () => {
    hoje("2026-09-01T10:00:00");
    expect(getCobrancaStatus(cobranca({ status: "pago" }))).toBe("pago");
  });

  it("pendente com vencimento no futuro é pendente", () => {
    hoje("2026-08-05T10:00:00");
    expect(getCobrancaStatus(cobranca())).toBe("pendente");
  });

  it("no próprio dia do vencimento ainda é pendente", () => {
    // Vencer hoje não é estar em atraso — cobrar o aluno nesse dia é errado.
    hoje("2026-08-10T23:00:00");
    expect(getCobrancaStatus(cobranca())).toBe("pendente");
  });

  it("no dia seguinte vira atrasado", () => {
    hoje("2026-08-11T00:30:00");
    expect(getCobrancaStatus(cobranca())).toBe("atrasado");
  });

  it("REGRESSÃO: usa data local, não UTC", () => {
    // Em UTC-3, `new Date("2026-08-11")` cai em 10/08 21:00 local. Se a
    // comparação passasse por UTC, o alerta de atraso dispararia cedo.
    hoje("2026-08-10T21:00:00");
    expect(getCobrancaStatus(cobranca({ vencimento: "2026-08-10" }))).toBe(
      "pendente",
    );
  });
});
