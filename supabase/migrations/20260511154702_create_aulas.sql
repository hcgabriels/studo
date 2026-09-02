CREATE TABLE public.aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'agendada',
  observacao TEXT,
  repertorio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own aulas" ON public.aulas FOR SELECT TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Insert own aulas" ON public.aulas FOR INSERT TO authenticated
  WITH CHECK (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Update own aulas" ON public.aulas FOR UPDATE TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()))
  WITH CHECK (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Delete own aulas" ON public.aulas FOR DELETE TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));

CREATE TRIGGER update_aulas_updated_at BEFORE UPDATE ON public.aulas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_aulas_professor_id ON public.aulas(professor_id);
CREATE INDEX idx_aulas_aluno_id ON public.aulas(aluno_id);
CREATE INDEX idx_aulas_data_hora ON public.aulas(data_hora);;
