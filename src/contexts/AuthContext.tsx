import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Session, type User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { resetarIdentidade } from "@/lib/analytics";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // PASSWORD_RECOVERY: não autentica; deixa a página /reset-password lidar.
      if (event === "PASSWORD_RECOVERY") return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Em SIGNED_OUT, limpa cache pra evitar redirect-loop e dados antigos.
      if (event === "SIGNED_OUT") {
        // Não mistura sessões de contas diferentes na mesma máquina.
        resetarIdentidade();
        qc.clear();
        try {
          localStorage.removeItem("studoo:onboarding-done");
        } catch {
          /* ignore */
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [qc]);

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
