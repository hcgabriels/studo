import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PageState {
  title: string;
  subtitle?: string;
  /** Rótulo curto da seção ("Cadastro", "Calendário"). Vai no TopBar. */
  eyebrow?: string;
}

interface PageContextType extends PageState {
  setPage: (page: PageState) => void;
}

const PageContext = createContext<PageContextType>({
  title: "",
  setPage: () => {},
});

export const PageProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PageState>({ title: "" });

  return (
    <PageContext.Provider
      value={{
        title: state.title,
        subtitle: state.subtitle,
        eyebrow: state.eyebrow,
        setPage: setState,
      }}
    >
      {children}
    </PageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePageHeader = () => useContext(PageContext);

/**
 * Atualiza o cabeçalho do shell.
 *
 * O `eyebrow` voltou a ser usado: o TopBar mostrava o MESMO título que o
 * PageHead logo abaixo, então no desktop a palavra aparecia duas vezes
 * empilhada. Agora o TopBar exibe seção + contexto, e o título fica só no
 * <h1> da página.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const usePage = (
  title: string,
  subtitle?: string,
  eyebrow?: string,
) => {
  const { setPage } = useContext(PageContext);
  useEffect(() => {
    setPage({ title, subtitle, eyebrow });
  }, [title, subtitle, eyebrow, setPage]);
};
