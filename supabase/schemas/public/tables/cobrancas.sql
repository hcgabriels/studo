CREATE TABLE "public"."cobrancas" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "professor_id"   uuid                     NOT NULL,
  "aluno_id"       uuid                     NOT NULL,
  "valor"          numeric                  NOT NULL DEFAULT 0,
  "mes_referencia" date                     NOT NULL,
  "vencimento"     date                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'pendente'::text,
  "data_pagamento" timestamp with time zone,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cobrancas_aluno_id_fkey" FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE,
  CONSTRAINT "cobrancas_aluno_id_mes_referencia_key" UNIQUE (aluno_id, mes_referencia),
  CONSTRAINT "cobrancas_pkey" PRIMARY KEY (id),
  CONSTRAINT "cobrancas_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE
);

ALTER TABLE "public"."cobrancas"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cobrancas_aluno_id ON public.cobrancas USING btree (aluno_id);

CREATE INDEX idx_cobrancas_mes_referencia ON public.cobrancas USING btree (mes_referencia);

CREATE INDEX idx_cobrancas_professor_id ON public.cobrancas USING btree (professor_id);

CREATE INDEX idx_cobrancas_status ON public.cobrancas USING btree (status);

CREATE TRIGGER update_cobrancas_updated_at
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Professor gerencia suas cobrancas" ON "public"."cobrancas"
  FOR ALL
  TO "authenticated"
  USING (((professor_id = private.meu_professor_id()) AND (EXISTS ( SELECT 1
   FROM public.alunos aluno
  WHERE ((aluno.id = cobrancas.aluno_id) AND (aluno.professor_id = private.meu_professor_id()))))))
  WITH CHECK (((professor_id = private.meu_professor_id()) AND (EXISTS ( SELECT 1
   FROM public.alunos aluno
  WHERE ((aluno.id = cobrancas.aluno_id) AND (aluno.professor_id = private.meu_professor_id()))))));

REVOKE ALL ON TABLE "public"."cobrancas" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."cobrancas" TO "authenticated";

GRANT ALL ON TABLE "public"."cobrancas" TO "service_role";
