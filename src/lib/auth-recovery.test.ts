import { describe, expect, it } from "vitest";
import { parseRecoveryUrl } from "./auth-recovery";

describe("parseRecoveryUrl", () => {
  it("reconhece o link de recuperação implícito", () => {
    expect(
      parseRecoveryUrl(
        "https://studoo.app/reset-password#access_token=token&type=recovery",
      ),
    ).toEqual({ isRecovery: true, error: null });
  });

  it("expõe erro de link expirado vindo no hash", () => {
    expect(
      parseRecoveryUrl(
        "https://studoo.app/reset-password#error=access_denied&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toEqual({
      isRecovery: false,
      error: "Email link is invalid or has expired",
    });
  });

  it("não aceita acesso direto como recuperação", () => {
    expect(parseRecoveryUrl("https://studoo.app/reset-password")).toEqual({
      isRecovery: false,
      error: null,
    });
  });
});
