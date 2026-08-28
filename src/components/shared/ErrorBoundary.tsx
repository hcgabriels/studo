import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capturarErro } from "@/lib/analytics";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Antes o erro morria aqui: tela amigável, informação descartada. Quem
    // travasse durante o beta simplesmente sumia sem deixar rastro.
    capturarErro(error, {
      origem: "ErrorBoundary",
      componentStack: errorInfo.componentStack?.slice(0, 2000),
      rota: typeof window !== "undefined" ? window.location.pathname : null,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h1
              className="text-xl font-bold mb-2"
>
              Algo deu errado
            </h1>
            <p className="text-sm text-muted-foreground mb-2">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {/* A mensagem crua do Postgres/JS vazava nome de coluna e de
                constraint pro professor. Agora fica só no console e na
                telemetria; aqui vai o que dá pra ele fazer. */}
            <p className="text-xs text-muted-foreground/60 mb-6">
              Se continuar assim, escreve pra gente em contato@studoo.app.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Recarregar
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
