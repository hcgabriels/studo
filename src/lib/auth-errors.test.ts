import { describe, expect, it } from "vitest";
import { translateSupabaseError } from "./auth-errors";

describe("translateSupabaseError", () => {
  it("mantém a regra mínima de senha alinhada com o cadastro", () => {
    expect(
      translateSupabaseError({ message: "Password should be at least 8 characters" }),
    ).toBe("A senha precisa ter no mínimo 8 caracteres.");
  });

  it("traduz link expirado", () => {
    expect(
      translateSupabaseError({ message: "Token has expired" }),
    ).toBe("Link expirado. Solicite um novo email de recuperação.");
  });
});
