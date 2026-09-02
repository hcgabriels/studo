CREATE TABLE "public"."aulas_recorrentes" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "aluno_id"        uuid                     NOT NULL,
  "professor_id"    uuid                     NOT NULL,
  "dia_semana"      smallint                 NOT NULL,
  "horario"         time without time zone   NOT NULL,
  "duracao_minutos" integer                  NOT NULL DEFAULT 60,
  "ativo"           boolean                  DEFAULT true,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "data_inicio"     date,
  CONSTRAINT "aulas_recorrentes_aluno_id_fkey" FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE,
  CONSTRAINT "aulas_recorrentes_dia_semana_check" CHECK (((dia_semana >= 0) AND (dia_semana <= 6))),
  CONSTRAINT "aulas_recorrentes_pkey" PRIMARY KEY (id),
  CONSTRAINT "aulas_recorrentes_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE
);

ALTER TABLE "public"."aulas_recorrentes"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_aulas_recorrentes_aluno_id ON public.aulas_recorrentes USING btree (aluno_id);

CREATE INDEX idx_aulas_recorrentes_professor_id ON public.aulas_recorrentes USING btree (professor_id);

CREATE POLICY "Professor gerencia suas aulas recorrentes" ON "public"."aulas_recorrentes"
  FOR ALL
  TO "authenticated"
  USING (((professor_id = private.meu_professor_id()) AND (EXISTS ( SELECT 1
   FROM public.alunos a
  WHERE ((a.id = aulas_recorrentes.aluno_id) AND (a.professor_id = private.meu_professor_id()))))))
  WITH CHECK (((professor_id = private.meu_professor_id()) AND (EXISTS ( SELECT 1
   FROM public.alunos a
  WHERE ((a.id = aulas_recorrentes.aluno_id) AND (a.professor_id = private.meu_professor_id()))))));

REVOKE ALL ON TABLE "public"."aulas_recorrentes" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."aulas_recorrentes" TO "authenticated";

GRANT ALL ON TABLE "public"."aulas_recorrentes" TO "service_role";
