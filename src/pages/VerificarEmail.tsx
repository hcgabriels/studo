import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { translateSupabaseError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/layout/AuthLayout";

const COOLDOWN_SECONDS = 60;

const VerificarEmail = () => {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";
  const [cooldown, setCooldown] = useState(0);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleReenviar = async () => {
    if (!email) {
      toast.error("Email não encontrado. Faça o cadastro novamente.");
      return;
    }
    setReenviando(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    setReenviando(false);

    if (error) {
      toast.error(translateSupabaseError(error));
      return;
    }

    setReenviado(true);
    setCooldown(COOLDOWN_SECONDS);
    toast.success("Email reenviado!");
  };

  return (
    <AuthLayout
      title="Verifique seu email"
      subtitle={
        email ? (
          <>
            Enviamos um link de confirmação para{" "}
            <strong className="text-foreground">{email}</strong>
          </>
        ) : (
          "Enviamos um link de confirmação para você"
        )
      }
      footer={
        <>
          Já confirmou?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Fazer login
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center text-center py-2">
          <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mb-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Cheque sua caixa de entrada e clique no link para ativar sua conta.
            Pode levar alguns minutos.
          </p>
        </div>

        <div className="bg-muted/25 border border-border/70 rounded-lg px-4 py-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Não recebeu?</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Verifique a pasta de spam ou lixo eletrônico</li>
            <li>Confirme se o email está correto</li>
            <li>Reenvie o email abaixo</li>
          </ul>
        </div>

        <Button
          onClick={handleReenviar}
          variant="outline"
          className="w-full"
          disabled={reenviando || cooldown > 0 || !email}
        >
          {reenviado && cooldown === 0 ? (
            <>
              <Check className="h-4 w-4 mr-1.5 text-success" />
              Enviado! Reenviar novamente
            </>
          ) : cooldown > 0 ? (
            `Reenviar em ${cooldown}s`
          ) : reenviando ? (
            "Reenviando..."
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reenviar email
            </>
          )}
        </Button>

        <div className="text-center">
          <Link
            to="/cadastro"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Email errado? Voltar pro cadastro
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerificarEmail;
