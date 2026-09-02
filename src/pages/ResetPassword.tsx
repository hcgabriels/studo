import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MIN_PASSWORD as MIN_SENHA } from "@/lib/constants";
import { translateSupabaseError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/layout/AuthLayout";
import { parseRecoveryUrl } from "@/lib/auth-recovery";

type RecoveryState = "checking" | "ready" | "invalid";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryUrl] = useState(() => parseRecoveryUrl(window.location.href));
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(
    recoveryUrl.error ? "invalid" : "checking",
  );
  const [recoveryError, setRecoveryError] = useState<string | null>(
    recoveryUrl.error,
  );

  useEffect(() => {
    // Só um link de recuperação libera a troca de senha.
    //
    // Antes qualquer sessão existente liberava, então um usuário já logado que
    // abrisse /reset-password trocava a senha sem reautenticação nenhuma —
    // com uma sessão roubada isso vira takeover de conta.
    if (recoveryUrl.error) return;

    let receivedRecoveryEvent = false;
    let cancelled = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          receivedRecoveryEvent = true;
          setRecoveryState("ready");
        }
      }
    );

    // O evento pode disparar antes do listener montar quando o link já trouxe
    // a sessão de recovery na URL — daí a checagem do tipo de sessão.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (cancelled || receivedRecoveryEvent) return;
      if (session && recoveryUrl.isRecovery) {
        setRecoveryState("ready");
        return;
      }
      setRecoveryError(error?.message ?? null);
      setRecoveryState("invalid");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [recoveryUrl]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mesma regra do cadastro (antes aqui eram 6 e lá 8 — no mesmo produto).
    if (password.length < MIN_SENHA) {
      toast.error(`Senha deve ter no mínimo ${MIN_SENHA} caracteres`);
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(translateSupabaseError(error, "Erro ao redefinir senha"));
    } else {
      toast.success("Senha redefinida com sucesso!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Escolha uma nova senha pra sua conta"
      topRight={{
        question: "Voltou?",
        cta: "Entrar",
        to: "/login",
      }}
    >
      {recoveryState === "checking" ? (
        <p className="text-center text-muted-foreground text-sm py-4">
          Verificando link de recuperação...
        </p>
      ) : recoveryState === "invalid" ? (
        <div className="space-y-4 text-center">
          <p role="alert" className="text-sm text-muted-foreground">
            {recoveryError
              ? translateSupabaseError(recoveryError, "Este link é inválido ou expirou.")
              : "Este link é inválido ou expirou."}
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Solicitar novo link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              placeholder={`Mínimo ${MIN_SENHA} caracteres`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_SENHA}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_SENHA}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Redefinir senha"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
