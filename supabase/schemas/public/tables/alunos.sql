CREATE TABLE "public"."alunos" (
  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "professor_id"           uuid                     NOT NULL,
  "nome"                   text                     NOT NULL,
  "instrumento"            text                     NOT NULL DEFAULT ''::text,
  "telefone"               text,
  "email_notificacao"      text,
  "nome_responsavel"       text,
  "dia_semana"             integer                  DEFAULT 1,
  "horario"                time without time zone   DEFAULT '14:00:00'::time WITHOUT time zone,
  "duracao_minutos"        integer                  NOT NULL DEFAULT 60,
  "valor_mensalidade"      numeric                  NOT NULL DEFAULT 0,
  "status"                 text                     NOT NULL DEFAULT 'ativo'::text,
  "observacoes"            text,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "reposicoes_disponiveis" integer                  NOT NULL DEFAULT 0,
  "data_nascimento"        date,
  "nivel"                  text,
  "objetivo"               text,
  CONSTRAINT "alunos_nivel_check" CHECK (((nivel IS NULL) OR (nivel = ANY (ARRAY['Iniciante'::text, 'Intermediário'::text, 'Avançado'::text])))),
  CONSTRAINT "alunos_pkey" PRIMARY KEY (id),
  CONSTRAINT "alunos_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE
);

ALTER TABLE "public"."alunos"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_alunos_professor_id ON public.alunos USING btree (professor_id);

CREATE INDEX idx_alunos_status ON public.alunos USING btree (status);

CREATE TRIGGER update_alunos_updated_at
  BEFORE UPDATE ON public.alunos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Professor gerencia seus alunos" ON "public"."alunos"
  FOR ALL
  TO "authenticated"
  USING ((professor_id = private.meu_professor_id()))
  WITH CHECK ((professor_id = private.meu_professor_id()));

COMMENT ON COLUMN "public"."alunos"."dia_semana" IS 'Legacy weekly schedule fallback. NULL means that no schedule was defined.';

COMMENT ON COLUMN "public"."alunos"."horario" IS 'Legacy weekly schedule fallback. NULL means that no schedule was defined.';

REVOKE ALL ON TABLE "public"."alunos" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."alunos" TO "authenticated";

GRANT ALL ON TABLE "public"."alunos" TO "service_role";
