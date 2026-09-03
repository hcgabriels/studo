import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type TourStep = {
  target: string;
  title: string;
  description: string;
};

const PADDING = 4;
const OVERLAY_CLASS = "absolute bg-background/58";

const steps: TourStep[] = [
  {
    target: '[data-tour="painel-kpis"]',
    title: "Comece pelo resumo",
    description:
      "Aqui você vê se o dia está em ordem: alunos ativos, aulas da semana e cobranças para acompanhar.",
  },
  {
    target: '[data-tour="nav-alunos"]',
    title: "Sua carteira de alunos",
    description:
      "Use Alunos como a base do Studoo: cadastro, horários, mensalidade, histórico e créditos ficam juntos.",
  },
  {
    target: '[data-tour="nav-agenda"]',
    title: "Registre cada aula",
    description:
      "Na Agenda você acompanha as próximas aulas e registra presença, conteúdo trabalhado e lição de casa.",
  },
  {
    target: '[data-tour="nav-financeiro"]',
    title: "Controle cobranças",
    description:
      "No Financeiro você gera mensalidades, acompanha pendências e marca pagamentos recebidos.",
  },
  {
    target: '[data-tour="nav-configuracoes"], [data-tour="nav-mais"]',
    title: "Ajuste seu jeito de trabalhar",
    description:
      "Em Ajustes ficam PIX, dados do recibo, bloqueios de agenda e preferências de cobrança.",
  },
];

const getVisibleTarget = (selector: string) => {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return elements.find((el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  });
};

export const GuidedTour = ({
  storageKey,
  enabled,
}: {
  storageKey: string;
  enabled: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  const finish = useCallback(() => {
    window.localStorage.setItem(storageKey, "1");
    setOpen(false);
  }, [storageKey]);

  const next = useCallback(() => {
    if (index === steps.length - 1) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  }, [finish, index]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey) === "1") return;
    const id = window.setTimeout(() => setOpen(true), 650);
    return () => window.clearTimeout(id);
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      const target = getVisibleTarget(step.target);
      if (!target) {
        setRect(null);
        return;
      }
      target.scrollIntoView({ block: "center", inline: "center" });
      window.setTimeout(() => setRect(target.getBoundingClientRect()), 160);
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, step.target]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish, next, open, prev]);

  const panelStyle = useMemo(() => {
    if (!rect) {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const panelWidth = Math.min(360, window.innerWidth - 32);
    const canFitRight = rect.right + 18 + panelWidth < window.innerWidth;
    const canFitLeft = rect.left - 18 - panelWidth > 0;
    const left = canFitRight
      ? rect.right + 18
      : canFitLeft
        ? rect.left - panelWidth - 18
        : Math.max(16, Math.min(rect.left, window.innerWidth - panelWidth - 16));
    const top = Math.max(
      16,
      Math.min(rect.top, window.innerHeight - 260),
    );

    return { left, top, width: panelWidth };
  }, [rect]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
      className="fixed inset-0 z-[90]"
    >
      {rect ? (
        <>
          <div
            aria-hidden="true"
            className={OVERLAY_CLASS}
            style={{ left: 0, top: 0, right: 0, height: Math.max(0, rect.top - PADDING) }}
          />
          <div
            aria-hidden="true"
            className={OVERLAY_CLASS}
            style={{
              left: 0,
              top: rect.top - PADDING,
              width: Math.max(0, rect.left - PADDING),
              height: rect.height + PADDING * 2,
            }}
          />
          <div
            aria-hidden="true"
            className={OVERLAY_CLASS}
            style={{
              left: rect.right + PADDING,
              top: rect.top - PADDING,
              right: 0,
              height: rect.height + PADDING * 2,
            }}
          />
          <div
            aria-hidden="true"
            className={OVERLAY_CLASS}
            style={{ left: 0, right: 0, top: rect.bottom + PADDING, bottom: 0 }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-background/58" />
      )}

      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl border border-primary/80 shadow-[0_0_0_1px_hsl(var(--primary)/0.24),0_0_10px_hsl(var(--primary)/0.16)] transition-all duration-200"
          style={{
            left: rect.left - PADDING,
            top: rect.top - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      )}

      <div
        className="absolute w-[min(360px,calc(100vw-32px))] rounded-xl border border-border bg-card p-5 shadow-2xl"
        style={panelStyle}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              Guia rápido · {index + 1}/{steps.length}
            </p>
            <h2 id="guided-tour-title" className="mt-1 text-lg font-semibold">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Fechar guia"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pular guia
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Button>
            )}
            <Button type="button" size="sm" onClick={next}>
              {index === steps.length - 1 ? "Concluir" : "Próximo"}
              {index < steps.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
