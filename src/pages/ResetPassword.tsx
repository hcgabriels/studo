import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MIN_PASSWORD as MIN_SENHA } from "@/lib/constants";
import { translateSupabaseError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/layout/AuthLayout";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Só um link de recuperação libera a troca de senha.
    //
    // Antes qualquer sessão existente liberava, então um usuário já logado que
    // abrisse /reset-password trocava a senha sem reautenticação nenhuma —
    // com uma sessão roubada isso vira takeover de conta.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) setReady(true);
      }
    );

    // O evento pode disparar antes do listener montar quando o link já trouxe
    // a sessão de recovery na URL — daí a checagem do tipo de sessão.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const veioDeRecovery =
        typeof window !== "undefined" &&
        (window.location.hash.includes("type=recovery") ||
          new URLSearchParams(window.location.search).get("type") === "recovery");
      if (session && veioDeRecovery) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      {!ready ? (
        <p className="text-center text-muted-foreground text-sm py-4">
          Verificando link de recuperação...
        </p>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
