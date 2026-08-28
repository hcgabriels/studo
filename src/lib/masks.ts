export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
export const unformatPhone = (v: string) => v.replace(/\D/g, "");
export const isValidPhone = (v: string) => {
  const d = unformatPhone(v);
  return d.length === 10 || d.length === 11;
};

export const formatCurrency = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const parseCurrencyInput = (value: string): number =>
  parseInt(value.replace(/\D/g, "") || "0", 10);

/**
 * Formata CPF (11 dígitos) ou CNPJ (14). O campo de recibo aceita os dois, e
 * antes o valor era gravado cru — saía "11144477735" no recibo do aluno.
 */
export const formatCpfCnpj = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) return formatCPF(d);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

export const formatCPF = (value: string): string => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const detectPixType = (value: string): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (value.includes("@")) return "E-mail";
  if (digits.length === 11) return "CPF / Celular";
  if (digits.length === 14) return "CNPJ";
  if (/^[a-f0-9]{32}$/i.test(value.replace(/-/g, ""))) return "Chave aleatória";
  return null;
};
export const formatPixKey = (value: string): string => {
  if (value.includes("@")) return value;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return formatCPF(digits);
  return value;
};

export const isValidEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
