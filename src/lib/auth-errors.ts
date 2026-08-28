/**
 * Traduz mensagens de erro do Supabase Auth pra PT-BR.
 * Para mensagens não mapeadas, retorna uma versão amigável genérica.
 */

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
}

const PT_BR_MAP: Array<{ match: RegExp | string; pt: string }> = [
  // Login
  {
    match: /invalid login credentials/i,
    pt: "Email ou senha incorretos.",
  },
  {
    match: /email not confirmed/i,
    pt: "Confirme seu email antes de fazer login. Verifique sua caixa de entrada.",
  },

  // Cadastro
  {
    match: /user already registered|already been registered/i,
    pt: "Já existe uma conta com esse email. Tente fazer login.",
  },
  {
    match: /unable to validate email address/i,
    pt: "Email com formato inválido.",
  },
  {
    match: /signup is disabled/i,
    pt: "Cadastros estão temporariamente desativados.",
  },
  {
    match: /password should be at least/i,
    pt: "A senha precisa ter no mínimo 6 caracteres.",
  },
  {
    match: /weak password|password is too weak/i,
    pt: "Senha muito fraca. Use letras e números.",
  },

  // Rate limit
  {
    match: /email rate limit exceeded|rate limit exceeded/i,
    pt: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  },
  {
    match: /too many requests/i,
    pt: "Muitas tentativas. Aguarde um pouco.",
  },

  // Reset
  {
    match: /token has expired|invalid token|jwt expired/i,
    pt: "Link expirado. Solicite um novo email de recuperação.",
  },
  {
    match: /same.*password/i,
    pt: "A nova senha precisa ser diferente da atual.",
  },

  // Network
  {
    match: /network|failed to fetch/i,
    pt: "Sem conexão com o servidor. Verifique sua internet.",
  },
];

export const translateSupabaseError = (
  err: unknown,
  fallback = "Erro inesperado. Tente novamente."
): string => {
  if (!err) return fallback;
  const message =
    typeof err === "string"
      ? err
      : (err as SupabaseLikeError).message ?? "";

  if (!message) return fallback;

  for (const entry of PT_BR_MAP) {
    const matches =
      typeof entry.match === "string"
        ? message.toLowerCase().includes(entry.match.toLowerCase())
        : entry.match.test(message);
    if (matches) return entry.pt;
  }

  return fallback;
};
