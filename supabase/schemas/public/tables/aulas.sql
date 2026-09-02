CREATE TABLE "public"."aulas" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "aluno_id"                uuid,
  "professor_id"            uuid                     NOT NULL,
  "data_hora"               timestamp with time zone NOT NULL,
  "duracao_minutos"         integer                  NOT NULL DEFAULT 60,
  "status"                  text                     NOT NULL DEFAULT 'agendada'::text,
  "observacao"              text,
  "repertorio"              text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "tipo"                    text                     NOT NULL DEFAULT 'recorrente'::text,
  "reagendada_de"           uuid,
  "aluno_experimental_nome" text,
  "eh_reposicao"            boolean                  NOT NULL DEFAULT false,
  "licao_casa"              text,
  CONSTRAINT "aulas_aluno_id_fkey" FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE SET NULL,
  CONSTRAINT "aulas_pkey" PRIMARY KEY (id),
  CONSTRAINT "aulas_reagendada_de_fkey" FOREIGN KEY (reagendada_de) REFERENCES public.aulas(id) ON DELETE SET NULL,
  CONSTRAINT "aulas_status_check"
    CHECK ((status = ANY (ARRAY['agendada'::text, 'realizada'::text, 'falta_justificada'::text, 'falta_sem_aviso'::text, 'cancelada_professor'::text, 'reagendada'::text]))),
  CONSTRAINT "aulas_tipo_check" CHECK ((tipo = ANY (ARRAY['recorrente'::text, 'avulsa'::text, 'experimental'::text]))),
  CONSTRAINT "aulas_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE
);

ALTER TABLE "public"."aulas"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_aulas_aluno_id ON public.aulas USING btree (aluno_id);

CREATE INDEX idx_aulas_data_hora ON public.aulas USING btree (data_hora);

CREATE INDEX idx_aulas_professor_id ON public.aulas USING btree (professor_id);

CREATE INDEX idx_aulas_reagendada_de ON public.aulas USING btree (reagendada_de)
  WHERE (reagendada_de IS NOT NULL);

CREATE TRIGGER update_aulas_updated_at
  BEFORE UPDATE ON public.aulas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Professor gerencia suas aulas" ON "public"."aulas"
  FOR ALL
  TO "authenticated"
  USING (((professor_id = private.meu_professor_id()) AND ((aluno_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.alunos aluno
  WHERE ((aluno.id = aulas.aluno_id) AND (aluno.professor_id = private.meu_professor_id())))))))
  WITH CHECK (((professor_id = private.meu_professor_id()) AND ((aluno_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.alunos aluno
  WHERE ((aluno.id = aulas.aluno_id) AND (aluno.professor_id = private.meu_professor_id())))))));

REVOKE ALL ON TABLE "public"."aulas" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."aulas" TO "authenticated";

GRANT ALL ON TABLE "public"."aulas" TO "service_role";
