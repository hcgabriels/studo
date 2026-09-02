CREATE TABLE public.professores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  chave_pix TEXT,
  cobrar_falta_sem_aviso BOOLEAN NOT NULL DEFAULT true,
  horas_antecedencia_aviso INTEGER NOT NULL DEFAULT 24,
  lembrete_aula_ativo BOOLEAN NOT NULL DEFAULT true,
  lembrete_cobranca_ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own professor" ON public.professores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own professor" ON public.professores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own professor" ON public.professores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own professor" ON public.professores FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_professores_updated_at BEFORE UPDATE ON public.professores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.professores (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();;
