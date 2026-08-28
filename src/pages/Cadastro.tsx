import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MIN_PASSWORD } from "@/lib/constants";
import { translateSupabaseError } from "@/lib/auth-errors";
import { isValidEmail } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import AuthLayout from "@/components/layout/AuthLayout";

const trialPerks = [
  "Grátis no beta",
  "Sem cartão de crédito",
  "Seus dados são seus",
];



const Cadastro = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = "Nome é obrigatório";
    if (!email.trim()) errs.email = "Email é obrigatório";
    else if (!isValidEmail(email)) errs.email = "Email com formato inválido";
    if (password.length < MIN_PASSWORD)
      errs.password = `Senha deve ter no mínimo ${MIN_PASSWORD} caracteres`;
    if (password !== confirmPassword)
      errs.confirmPassword = "As senhas não coincidem";
    return errs;
  };

  const handleCadastro = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome } },
      });

      if (error) {
        toast.error(translateSupabaseError(error));
        return;
      }

      if (!data.user) {
        toast.error("Não foi possível criar a conta. Tente novamente.");
        return;
      }

      // Quando confirm email está OFF, signUp já retorna sessão.
      // Quando está ON, retorna sem sessão e o trigger SQL cria o perfil.
      if (data.session) {
        const { error: profileError } = await supabase
          .from("professores")
          .upsert(
            {
              user_id: data.user.id,
              nome: nome.trim(),
              email: data.user.email ?? email,
            },
            { onConflict: "user_id", ignoreDuplicates: false }
          );

        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
          toast.error("Erro ao criar perfil. Faça login para continuar.");
          navigate("/login");
          return;
        }

        toast.success("Conta criada com sucesso!");
        navigate("/dashboard");
      } else {
        // Sem sessão = email confirmation ativo. Redireciona pra tela dedicada.
        navigate(`/verificar-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      console.error("Erro inesperado no cadastro:", err);
      toast.error(translateSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Crie sua conta de graça."
      subtitle="O Studoo tá em beta e não cobra nada. Sem cartão, sem cobrança escondida."
      topRight={{
        question: "Já tem conta?",
        cta: "Entrar",
        to: "/login",
      }}
    >
      <GoogleSignInButton />

      <div className="flex items-center gap-3.5 my-[22px]">
        <div className="flex-1 h-px bg-border" />
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 whitespace-nowrap">
          ou com email
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleCadastro} className="space-y-4">
        <div>
          <Label htmlFor="nome" className="block text-[13px] font-medium text-foreground/80 mb-1.5">
            Seu nome
          </Label>
          <Input
            id="nome"
            type="text"
            placeholder="Como seus alunos te chamam"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            className="h-[46px] text-[14px]"
          />
          {errors.nome && <p className="text-xs text-destructive mt-1.5">{errors.nome}</p>}
        </div>

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
            className="h-[46px] text-[14px]"
          />
          {errors.email && <p className="text-xs text-destructive mt-1.5">{errors.email}</p>}
        </div>

        <div>
          <Label htmlFor="password" className="block text-[13px] font-medium text-foreground/80 mb-1.5">
            Senha
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Crie uma senha forte"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          {errors.password ? (
            <p className="text-xs text-destructive mt-1.5">{errors.password}</p>
          ) : (
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-[1.45]">
              Use {MIN_PASSWORD}+ caracteres, misture letras e números.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword" className="block text-[13px] font-medium text-foreground/80 mb-1.5">
            Confirmar senha
          </Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Digite a senha novamente"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-[46px] text-[14px]"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive mt-1.5">{errors.confirmPassword}</p>
          )}
        </div>

        <p className="text-[13px] text-foreground/80 leading-[1.5] pt-1">
          Ao criar a conta, você concorda com os{" "}
          <Link to="/termos" className="text-primary hover:opacity-80">
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link to="/privacidade" className="text-primary hover:opacity-80">
            Política de Privacidade
          </Link>
          .
        </p>

        <Button
          type="submit"
          className="w-full h-12 text-[15px] font-semibold gap-2 mt-1.5"
          style={{ boxShadow: "0 6px 24px -8px rgba(231,161,58,0.4)" }}
          disabled={loading}
        >
          {loading ? (
            "Criando conta..."
          ) : (
            <>
              Criar conta de graça <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
          {trialPerks.map((perk) => (
            <span
              key={perk}
              className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground"
            >
              <Check className="h-3 w-3 text-success" />
              {perk}
            </span>
          ))}
        </div>
      </form>
    </AuthLayout>
  );
};

export default Cadastro;
