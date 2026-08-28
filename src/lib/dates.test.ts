import { describe, it, expect } from "vitest";
import { parseDateOnly, toDateOnly, yearOfDateOnly, parseDateOnlySafe } from "./dates";

/**
 * A raiz do bug: `new Date("2026-01-01")` é meia-noite UTC, que em UTC-3 vira
 * 31/12/2025 21:00 local. Isso fazia a cobrança de janeiro não entrar no
 * "total pago no ano".
 */
describe("parseDateOnly", () => {
  it("REGRESSÃO: primeiro dia do ano continua no ano certo", () => {
    expect(yearOfDateOnly("2026-01-01")).toBe(2026);
    expect(parseDateOnly("2026-01-01").getMonth()).toBe(0);
    expect(parseDateOnly("2026-01-01").getDate()).toBe(1);
  });

  it("interpreta como meia-noite local, não UTC", () => {
    const d = parseDateOnly("2026-08-10");
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(10);
  });

  it("aceita timestamp completo, usando só a parte da data", () => {
    expect(parseDateOnly("2026-08-10T23:45:00Z").getDate()).toBe(10);
  });

  it("safe devolve null pra vazio e inválido", () => {
    expect(parseDateOnlySafe(null)).toBeNull();
    expect(parseDateOnlySafe("")).toBeNull();
    expect(parseDateOnlySafe("banana")).toBeNull();
    expect(parseDateOnlySafe("2026-08-10")?.getDate()).toBe(10);
  });
});

describe("toDateOnly", () => {
  it("REGRESSÃO: não volta um dia perto da meia-noite", () => {
    // `toISOString().slice(0,10)` erraria aqui em UTC-3.
    expect(toDateOnly(new Date(2026, 7, 10, 22, 30))).toBe("2026-08-10");
    expect(toDateOnly(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });

  it("fecha o ciclo com parseDateOnly", () => {
    const original = "2026-12-31";
    expect(toDateOnly(parseDateOnly(original))).toBe(original);
  });
});
