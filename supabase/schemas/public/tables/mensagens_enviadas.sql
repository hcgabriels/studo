CREATE TABLE "public"."mensagens_enviadas" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "professor_id" uuid                     NOT NULL,
  "aluno_id"     uuid,
  "tipo"         text                     NOT NULL DEFAULT 'outro'::text,
  "texto"        text                     NOT NULL,
  "telefone"     text                     NOT NULL,
  "enviada_em"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "mensagens_enviadas_aluno_id_fkey" FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE SET NULL,
  CONSTRAINT "mensagens_enviadas_pkey" PRIMARY KEY (id),
  CONSTRAINT "mensagens_enviadas_tipo_check"
    CHECK ((tipo = ANY (ARRAY['saudacao'::text, 'lembrete_aula'::text, 'cobranca'::text, 'parabens'::text, 'resumo_aula'::text, 'outro'::text]))),
  CONSTRAINT "mensagens_enviadas_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE
);

ALTER TABLE "public"."mensagens_enviadas"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_mensagens_enviadas_professor_id ON public.mensagens_enviadas USING btree (professor_id);

CREATE INDEX mensagens_enviadas_aluno_idx ON public.mensagens_enviadas USING btree (aluno_id, enviada_em DESC);

CREATE POLICY "Professor gerencia suas mensagens" ON "public"."mensagens_enviadas"
  FOR ALL
  TO "authenticated"
  USING (((professor_id = private.meu_professor_id()) AND ((aluno_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.alunos aluno
  WHERE ((aluno.id = mensagens_enviadas.aluno_id) AND (aluno.professor_id = private.meu_professor_id())))))))
  WITH CHECK (((professor_id = private.meu_professor_id()) AND ((aluno_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.alunos aluno
  WHERE ((aluno.id = mensagens_enviadas.aluno_id) AND (aluno.professor_id = private.meu_professor_id())))))));

REVOKE ALL ON TABLE "public"."mensagens_enviadas" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."mensagens_enviadas" TO "authenticated";

GRANT ALL ON TABLE "public"."mensagens_enviadas" TO "service_role";
