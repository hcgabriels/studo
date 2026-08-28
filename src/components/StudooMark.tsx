import { cn } from "@/lib/utils";

interface StudooMarkProps {
  variant?: "color" | "mono";
  className?: string;
  size?: number;
}

/**
 * Studoo symbol mark. Use `variant="color"` para versão com primary em destaque,
 * ou `variant="mono"` para preto/branco (footers, watermarks).
 */
export function StudooMark({
  variant = "color",
  className,
  size = 24,
}: StudooMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={cn("text-foreground shrink-0", className)}
      aria-hidden="true"
    >
      <rect x="114" y="28" width="28" height="200" rx="14" fill="currentColor" />
      <circle
        cx="178"
        cy="78"
        r="34"
        stroke={variant === "color" ? "hsl(var(--primary))" : "currentColor"}
        strokeWidth="20"
        fill="none"
      />
      <circle cx="74" cy="206" r="22" fill="currentColor" />
    </svg>
  );
}

interface WordmarkProps {
  size?: number;
  className?: string;
}

/**
 * Wordmark "studoo" com o último O em amber (primary).
 * Use ao lado do StudooMark ou isolado.
 */
export function Wordmark({ size = 16, className }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-sans font-extrabold tracking-tight leading-none",
        className,
      )}
      style={{
        fontSize: size,
        letterSpacing: "-0.045em",
      }}
    >
      stud
      <em style={{ fontStyle: "normal", color: "hsl(var(--primary))" }}>oo</em>
    </span>
  );
}

/**
 * Combo Mark + Wordmark lado a lado.
 */
export function StudooLogo({
  size = 22,
  wordmarkSize,
  className,
  variant = "color",
}: {
  size?: number;
  wordmarkSize?: number;
  className?: string;
  variant?: "color" | "mono";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <StudooMark size={size} variant={variant} />
      <Wordmark size={wordmarkSize ?? Math.round(size * 0.85)} />
    </span>
  );
}
