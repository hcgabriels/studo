import { describe, expect, it } from "vitest";
import { detectPixType, formatPixKey } from "./masks";

describe("chave PIX", () => {
  it.each([
    ["professor@studoo.com.br", "E-mail"],
    ["52998224725", "CPF"],
    ["11987654321", "Celular"],
    ["11222333000181", "CNPJ"],
    ["123e4567-e89b-12d3-a456-426614174000", "Chave aleatória"],
  ])("reconhece %s como %s", (value, expected) => {
    expect(detectPixType(value)).toBe(expected);
  });

  it.each([
    ["Professor@Studoo.com.br ", "professor@studoo.com.br"],
    ["52998224725", "529.982.247-25"],
    ["11987654321", "(11) 98765-4321"],
    ["5511987654321", "(11) 98765-4321"],
    ["11222333000181", "11.222.333/0001-81"],
  ])("formata %s", (value, expected) => {
    expect(formatPixKey(value)).toBe(expected);
  });
});
