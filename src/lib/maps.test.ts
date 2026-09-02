import { describe, expect, it } from "vitest";
import { buildGoogleMapsSearchUrl } from "./maps";

describe("buildGoogleMapsSearchUrl", () => {
  it("monta uma busca segura com o endereço informado", () => {
    expect(buildGoogleMapsSearchUrl(" Rua Harmonia, 123 — São Paulo ")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rua%20Harmonia%2C%20123%20%E2%80%94%20S%C3%A3o%20Paulo",
    );
  });
});
