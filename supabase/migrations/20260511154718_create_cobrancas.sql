CREATE TABLE public.cobrancas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id UUID NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  mes_referencia DATE NOT NULL,
  vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_pagamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(aluno_id, mes_referencia)
);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own cobrancas" ON public.cobrancas FOR SELECT TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Insert own cobrancas" ON public.cobrancas FOR INSERT TO authenticated
  WITH CHECK (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Update own cobrancas" ON public.cobrancas FOR UPDATE TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()))
  WITH CHECK (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));
CREATE POLICY "Delete own cobrancas" ON public.cobrancas FOR DELETE TO authenticated
  USING (professor_id IN (SELECT id FROM public.professores WHERE user_id = auth.uid()));

CREATE TRIGGER update_cobrancas_updated_at BEFORE UPDATE ON public.cobrancas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cobrancas_professor_id ON public.cobrancas(professor_id);
CREATE INDEX idx_cobrancas_aluno_id ON public.cobrancas(aluno_id);
CREATE INDEX idx_cobrancas_status ON public.cobrancas(status);
CREATE INDEX idx_cobrancas_mes_referencia ON public.cobrancas(mes_referencia);;
