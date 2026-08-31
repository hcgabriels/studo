import {
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { FieldControlContext } from "@/hooks/useFieldControl";

interface FormGridProps {
  cols?: 1 | 2 | 3;
  /** Em mobile, sempre stack. cols só aplica em sm+. */
  className?: string;
  children: ReactNode;
}

/**
 * Form grid Studoo (`.form-grid` + `.cols-2/.cols-3`).
 * Especificação `studoo-screens.css` linhas 668-670.
 */
export const FormGrid = ({ cols = 1, className, children }: FormGridProps) => (
  <div
    className={cn(
      "grid gap-3.5",
      cols === 2 && "grid-cols-1 sm:grid-cols-2",
      cols === 3 && "grid-cols-1 sm:grid-cols-3",
      className,
    )}
  >
    {children}
  </div>
);

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Tags nativas que o Field consegue "adotar" por clonagem. Os componentes de
 * `ui/` (Input, Textarea, SelectTrigger) leem o contexto sozinhos, então não
 * precisam disso — mas ainda existem `<input type="date">` soltos nos forms.
 */
const CONTROLES_NATIVOS = new Set(["input", "select", "textarea"]);

/**
 * Wrapper de campo de formulário: label + input + hint/erro.
 *
 * Acessibilidade: gera um id estável com `useId()`, liga o `<label htmlFor>` a
 * ele e publica id + `aria-describedby` + `aria-invalid` num contexto que os
 * controles de `ui/` consomem. Assim nenhum call-site precisa mudar.
 */
export const Field = ({
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) => {
  const uid = useId();
  const id = `campo${uid}`;
  const errorId = `${id}-erro`;
  const hintId = `${id}-dica`;

  const describedBy =
    [error ? errorId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const contexto = useMemo(
    () => ({ id, describedBy, invalid: !!error }),
    [id, describedBy, error],
  );

  // Filho nativo (ex.: <input type="date">) não passa por ui/, então recebe os
  // atributos por clonagem. Wrappers (<div className="relative">…) ficam
  // intactos — quem se identifica lá dentro é o Input via contexto.
  let controle: ReactNode = children;
  if (
    isValidElement(children) &&
    typeof children.type === "string" &&
    CONTROLES_NATIVOS.has(children.type)
  ) {
    const props = children.props as Record<string, unknown>;
    controle = cloneElement(children as ReactElement<Record<string, unknown>>, {
      id,
      "aria-describedby": props["aria-describedby"] ?? describedBy,
      "aria-invalid": error ? true : props["aria-invalid"],
    });
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-foreground/85 mb-1.5"
      >
        {label}
        {required && (
          <>
            <span className="ml-1 text-primary" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
      </label>

      <FieldControlContext.Provider value={contexto}>
        {controle}
      </FieldControlContext.Provider>

      {/* Erro e hint convivem: o contador de caracteres não pode sumir só
          porque o campo ficou inválido. */}
      {(error || hint) && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {error && (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {hint && (
            <p
              id={hintId}
              className="text-[12px] text-muted-foreground leading-snug"
            >
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
