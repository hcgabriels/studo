import { describe, expect, it } from "vitest";
import { onboardingProfilePatch, type OnboardingProfileDraft } from "./onboarding";

const draft: OnboardingProfileDraft = {
  endereco: " Rua Harmonia, 10 ",
  chave_pix: " professor@studoo.app ",
  cpf_cnpj: " 529.982.247-25 ",
  cobrar_falta_sem_aviso: true,
  horas_antecedencia_aviso: 24,
};

describe("onboardingProfilePatch", () => {
  it("não deixa uma etapa anterior sobrescrever campos posteriores", () => {
    expect(onboardingProfilePatch("cobranca", draft)).toEqual({
      chave_pix: "professor@studoo.app",
      cpf_cnpj: "529.982.247-25",
    });
    expect(onboardingProfilePatch("politica", draft)).toEqual({
      cobrar_falta_sem_aviso: true,
      horas_antecedencia_aviso: 24,
    });
    expect(onboardingProfilePatch("endereco", draft)).toEqual({
      endereco: "Rua Harmonia, 10",
    });
  });

  it("não grava perfil nas etapas sem campos do professor", () => {
    expect(onboardingProfilePatch("aluno", draft)).toEqual({});
    expect(onboardingProfilePatch("pronto", draft)).toEqual({});
  });
});
