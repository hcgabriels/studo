import { useEffect, useRef, useState } from "react";

/**
 * Adiciona classe `.in` em elementos `.lp-reveal` quando entram em viewport.
 * Roda uma vez por elemento.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".lp-reveal");
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((el) => io.observe(el));

    // Fallback síncrono pra above-the-fold (alguns browsers atrasam IO inicial)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const vh = window.innerHeight;
        targets.forEach((el) => {
          if (el.classList.contains("in")) return;
          const r = el.getBoundingClientRect();
          if (r.top < vh && r.bottom > 0) el.classList.add("in");
        });
      });
    });

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
}

/**
 * Retorna true quando o usuário rolou mais de `threshold` px (default 20).
 * Usado pro nav virar "scrolled" (blur/shadow).
 */
export function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/**
 * Anima um número de 0 até `target` em `duration` ms quando o elemento entra em viewport.
 * Retorna o valor atual + ref pra anexar no elemento observado.
 */
export function useCountUp(
  target: number,
  options: { duration?: number; decimals?: number } = {},
) {
  const { duration = 1400, decimals = 0 } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || started) continue;
          started = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(target * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.unobserve(el);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  const formatted = decimals === 0
    ? Math.round(value).toString()
    : value.toFixed(decimals).replace(".", ",");

  return { ref, value: formatted };
}

/**
 * Mouse-tilt sutil estilo Apple. Aplica transform 3D ao elemento `targetRef`
 * baseado na posição do mouse dentro de `hostRef`.
 */
export function useMouseTilt(
  hostRef: React.RefObject<HTMLElement | null>,
  targetRef: React.RefObject<HTMLElement | null>,
  opts: { intensity?: number } = {},
) {
  const intensity = opts.intensity ?? 1;
  useEffect(() => {
    const host = hostRef.current;
    const target = targetRef.current;
    if (!host || !target) return;

    let rafId: number | null = null;
    let bounds = host.getBoundingClientRect();
    const measure = () => {
      bounds = host.getBoundingClientRect();
    };
    window.addEventListener("resize", measure);

    const onMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = (e.clientX - bounds.left) / bounds.width - 0.5;
        const y = (e.clientY - bounds.top) / bounds.height - 0.5;
        const rotY = x * 6 * intensity;
        const rotX = -y * 4 * intensity;
        target.style.transform = `perspective(1600px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
      });
    };
    const onLeave = () => {
      if (rafId) cancelAnimationFrame(rafId);
      target.style.transform = "";
    };

    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("resize", measure);
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
    };
  }, [hostRef, targetRef, intensity]);
}
