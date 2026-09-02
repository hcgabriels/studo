export type OnboardingProfileStep =
  | "boas-vindas"
  | "aluno"
  | "cobranca"
  | "politica"
  | "endereco"
  | "pronto";

export interface OnboardingProfileDraft {
  endereco: string;
  chave_pix: string;
  cpf_cnpj: string;
  cobrar_falta_sem_aviso: boolean;
  horas_antecedencia_aviso: number;
}

/**
 * Cada etapa persiste somente os campos que possui. Isso torna os PATCHes
 * concorrentes comutativos: uma resposta antiga nunca apaga dados preenchidos
 * numa etapa posterior.
 */
export const onboardingProfilePatch = (
  step: OnboardingProfileStep,
  draft: OnboardingProfileDraft,
): Record<string, unknown> => {
  if (step === "cobranca") {
    return {
      chave_pix: draft.chave_pix.trim() || null,
      cpf_cnpj: draft.cpf_cnpj.trim() || null,
    };
  }
  if (step === "politica") {
    return {
      cobrar_falta_sem_aviso: draft.cobrar_falta_sem_aviso,
      horas_antecedencia_aviso: draft.horas_antecedencia_aviso,
    };
  }
  if (step === "endereco") {
    return { endereco: draft.endereco.trim() || null };
  }
  return {};
};
