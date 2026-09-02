import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { translateSupabaseError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthOption } from "@/components/shared/GoogleSignInButton";
import AuthLayout from "@/components/layout/AuthLayout";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(translateSupabaseError(error));
    } else {
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Digite seu email primeiro");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(translateSupabaseError(error));
    } else {
      setResetSent(true);
      toast.success("Email de recuperação enviado!");
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Bom te ver de novo."
      subtitle="Continue de onde parou. Sua agenda já tá aberta esperando."
      topRight={{
        question: "Novo por aqui?",
        cta: "Criar conta",
        to: "/cadastro",
      }}
    >
      <GoogleAuthOption />

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <Label htmlFor="email" className="block text-[13px] font-medium text-foreground/80 mb-1.5">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="marina@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
            className="h-[46px] text-[14px]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="password" className="text-[13px] font-medium text-foreground/80">
              Senha
            </Label>
            {resetSent ? (
              <span className="text-xs text-success">Email enviado!</span>
            ) : (
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-[12.5px] text-primary hover:opacity-80 transition-opacity"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-[46px] text-[14px] pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-[15px] font-semibold gap-2 mt-1.5"
          style={{ boxShadow: "0 6px 24px -8px rgba(231,161,58,0.4)" }}
          disabled={loading}
        >
          {loading ? (
            "Entrando..."
          ) : (
            <>
              Entrar <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
