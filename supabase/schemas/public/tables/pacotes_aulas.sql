CREATE TABLE "public"."pacotes_aulas" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "aluno_id"      uuid                     NOT NULL,
  "professor_id"  uuid                     NOT NULL,
  "total_aulas"   integer                  NOT NULL,
  "aulas_usadas"  integer                  NOT NULL DEFAULT 0,
  "valor_total"   numeric(10,2)            NOT NULL DEFAULT 0,
  "status"        text                     NOT NULL DEFAULT 'ativo'::text,
  "observacao"    text,
  "data_compra"   date                     NOT NULL DEFAULT CURRENT_DATE,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  "data_validade" date,
  CONSTRAINT "pacotes_aulas_aluno_id_fkey" FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE,
  CONSTRAINT "pacotes_aulas_aulas_usadas_check" CHECK ((aulas_usadas >= 0)),
  CONSTRAINT "pacotes_aulas_pkey" PRIMARY KEY (id),
  CONSTRAINT "pacotes_aulas_status_check" CHECK ((status = ANY (ARRAY['ativo'::text, 'concluido'::text, 'cancelado'::text]))),
  CONSTRAINT "pacotes_aulas_total_aulas_check" CHECK ((total_aulas > 0)),
  CONSTRAINT "pacotes_aulas_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE
);

ALTER TABLE "public"."pacotes_aulas"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pacotes_aulas_aluno_id ON public.pacotes_aulas USING btree (aluno_id);

CREATE INDEX idx_pacotes_aulas_professor_id ON public.pacotes_aulas USING btree (professor_id);

CREATE POLICY "Professor gerencia seus pacotes" ON "public"."pacotes_aulas"
  FOR ALL
  TO "authenticated"
  USING (((professor_id = private.meu_professor_id()) AND (EXISTS ( SELECT 1
   FROM public.alunos a
  WHERE ((a.id = pacotes_aulas.aluno_id) AND (a.professor_id = private.meu_professor_id()))))))
  WITH CHECK (((professor_id = private.meu_professor_id()) AND (EXISTS ( SELECT 1
   FROM public.alunos a
  WHERE ((a.id = pacotes_aulas.aluno_id) AND (a.professor_id = private.meu_professor_id()))))));

REVOKE ALL ON TABLE "public"."pacotes_aulas" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."pacotes_aulas" TO "authenticated";

GRANT ALL ON TABLE "public"."pacotes_aulas" TO "service_role";
