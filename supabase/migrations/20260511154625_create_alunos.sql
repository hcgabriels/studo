CREATE TABLE public.alunos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  instrumento TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  email_notificacao TEXT,
  nome_responsavel TEXT,
  dia_semana INTEGER NOT NULL DEFAULT 1,
  horario TIME NOT NULL DEFAULT '14:00',
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  valor_mensalidade NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own alunos" ON public.alunos FOR SELECT TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Insert own alunos" ON public.alunos FOR INSERT TO authenticated
  WITH CHECK (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Update own alunos" ON public.alunos FOR UPDATE TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()))
  WITH CHECK (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Delete own alunos" ON public.alunos FOR DELETE TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));

CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_alunos_professor_id ON public.alunos(professor_id);
CREATE INDEX idx_alunos_status ON public.alunos(status);;
