import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessor } from "@/hooks/useProfessor";
import { Button } from "@/components/ui/button";

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const location = useLocation();
  const {
    data: professor,
    isLoading: profLoading,
    isError: profError,
  } = useProfessor();

  if (authLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  // Aguarda o perfil carregar antes de decidir sobre o onboarding.
  if (profLoading) return <LoadingScreen />;

  // Erro ao carregar perfil: oferece recarga + sair (evita loop infinito).
  if (profError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="t-h2">Erro ao carregar perfil</h1>
          <p className="text-sm text-muted-foreground">
            Não conseguimos carregar seus dados. Tente recarregar ou sair e entrar de novo.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>Recarregar</Button>
            <Button variant="outline" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const onOnboarding = location.pathname === "/onboarding";

  // Escape hatch: se a migration de onboarding_completo ainda não rodou
  // (campo vem `undefined`), ou se o user marcou skip local, tratamos como completo.
  const localSkip =
    typeof window !== "undefined" &&
    window.localStorage.getItem("studoo:onboarding-done") === "1";
  const fieldMissing =
    !!professor && (professor as { onboarding_completo?: boolean }).onboarding_completo === undefined;
  const completo =
    !!professor && (professor.onboarding_completo === true || localSkip || fieldMissing);

  if (professor && !completo && !onOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (professor && completo && onOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  // Sem perfil e sem erro de query: o trigger `handle_new_user` não criou o
  // registro em `professores`. Antes isso caía direto no app, com todas as
  // queries `enabled: false` — o professor via telas vazias sem explicação.
  if (!professor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="t-h2">Faltou criar seu perfil</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta existe, mas o perfil de professor não foi criado. Recarregue
            a página — se continuar assim, saia e entre de novo, ou fale com a
            gente em contato@studoo.app.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>Recarregar</Button>
            <Button variant="outline" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
