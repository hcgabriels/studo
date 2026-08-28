import { createContext, useContext } from "react";

/**
 * Dados que o `<Field>` (src/components/shared/FormGrid.tsx) injeta no controle
 * de formulário que ele envolve.
 */
export interface FieldControl {
  /** Id gerado pelo Field. É o alvo do `<label htmlFor>`. */
  id: string;
  /** Ids do erro e/ou da dica, pra `aria-describedby`. */
  describedBy?: string;
  /** `true` quando o Field recebeu a prop `error`. */
  invalid: boolean;
}

export const FieldControlContext = createContext<FieldControl | null>(null);

/**
 * Consumido por Input/Textarea/SelectTrigger pra herdarem `id`,
 * `aria-describedby` e `aria-invalid` do `<Field>` que os envolve.
 * Fora de um Field devolve `null` e nada muda.
 */
export const useFieldControl = () => useContext(FieldControlContext);
