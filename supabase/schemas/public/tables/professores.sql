CREATE TABLE "public"."professores" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                  uuid                     NOT NULL,
  "nome"                     text                     NOT NULL DEFAULT ''::text,
  "email"                    text                     NOT NULL DEFAULT ''::text,
  "chave_pix"                text,
  "cobrar_falta_sem_aviso"   boolean                  NOT NULL DEFAULT true,
  "horas_antecedencia_aviso" integer                  NOT NULL DEFAULT 24,
  "lembrete_aula_ativo"      boolean                  NOT NULL DEFAULT true,
  "lembrete_cobranca_ativo"  boolean                  NOT NULL DEFAULT true,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "cpf_cnpj"                 text,
  "endereco"                 text,
  "onboarding_completo"      boolean                  DEFAULT false,
  "dia_vencimento"           smallint                 DEFAULT 10,
  CONSTRAINT "professores_dia_vencimento_check" CHECK (((dia_vencimento IS NULL) OR ((dia_vencimento >= 1) AND (dia_vencimento <= 31)))),
  CONSTRAINT "professores_pkey" PRIMARY KEY (id),
  CONSTRAINT "professores_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "professores_user_id_key" UNIQUE (user_id)
);

ALTER TABLE "public"."professores"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_professores_updated_at
  BEFORE UPDATE ON public.professores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Professor gerencia o proprio perfil" ON "public"."professores"
  FOR ALL
  TO "authenticated"
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

REVOKE ALL ON TABLE "public"."professores" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."professores" TO "authenticated";

GRANT ALL ON TABLE "public"."professores" TO "service_role";
