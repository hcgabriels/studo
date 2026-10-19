import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useProfessor } from "@/hooks/useProfessor";
import { useAssinatura } from "@/hooks/useAssinatura";
import { diasRestantesTeste, emTesteGratis } from "@/lib/domain/assinatura";

/**
 * Faixa fina no topo do painel durante o teste grátis: quantos dias faltam e
 * um atalho pra assinar. Some em Configurações, onde o card do plano já diz isso.
 */
const TrialBanner = () => {
  const location = useLocation();
  const { data: professor } = useProfessor();
  const { data: assinatura } = useAssinatura(professor?.id);

  if (location.pathname === "/configuracoes") return null;
  if (!emTesteGratis(assinatura)) return null;

  const dias = diasRestantesTeste(assinatura);
  const texto = dias === 1 ? "último dia" : `faltam ${dias} dias`;

  return (
    <div className="border-b border-primary/20 bg-primary/10">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 text-[12.5px]">
        <p className="flex items-center gap-2 min-w-0 m-0 text-foreground/85">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">
            Teste grátis: <b className="font-semibold text-foreground">{texto}</b>
          </span>
        </p>
        <Link
          to="/configuracoes"
          className="shrink-0 font-semibold text-primary hover:underline underline-offset-4"
        >
          Assinar
        </Link>
      </div>
    </div>
  );
};

export default TrialBanner;
