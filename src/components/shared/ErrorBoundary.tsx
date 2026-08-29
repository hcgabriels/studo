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
  reloadingChunk: boolean;
}

const isChunkLoadError = (error: Error) =>
  /failed to fetch dynamically imported module|importing a module script failed|loading chunk|chunkloaderror/i.test(
    `${error.name} ${error.message}`,
  );

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, reloadingChunk: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reloadingChunk: isChunkLoadError(error) };
  }

  componentDidMount() {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      window.sessionStorage.removeItem("studoo:chunk-reload:v2");
    }, 10000);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Antes o erro morria aqui: tela amigável, informação descartada. Quem
    // travasse durante o beta simplesmente sumia sem deixar rastro.
    capturarErro(error, {
      origem: "ErrorBoundary",
      componentStack: errorInfo.componentStack?.slice(0, 2000),
      rota: typeof window !== "undefined" ? window.location.pathname : null,
    });

    if (typeof window !== "undefined" && isChunkLoadError(error)) {
      const key = "studoo:chunk-reload:v2";
      const last = Number(window.sessionStorage.getItem(key) ?? 0);
      const now = Date.now();
      if (!last || now - last > 15000) {
        window.sessionStorage.setItem(key, String(now));
        this.setState({ reloadingChunk: true });
        window.setTimeout(() => window.location.replace(window.location.href), 250);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, reloadingChunk: false });
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
              {this.state.reloadingChunk ? "Atualizando o Studoo" : "Algo deu errado"}
            </h1>
            <p className="text-sm text-muted-foreground mb-2">
              {this.state.reloadingChunk
                ? "Publicamos uma versão nova. A página vai recarregar sozinha."
                : "Ocorreu um erro inesperado. Tente recarregar a página."}
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
