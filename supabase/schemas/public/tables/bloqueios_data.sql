CREATE TABLE "public"."bloqueios_data" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "professor_id" uuid                     NOT NULL,
  "data"         date                     NOT NULL,
  "motivo"       text,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "bloqueios_data_pkey" PRIMARY KEY (id),
  CONSTRAINT "bloqueios_data_professor_id_data_key" UNIQUE (professor_id, DATA),
  CONSTRAINT "bloqueios_data_professor_id_fkey" FOREIGN KEY (professor_id) REFERENCES public.professores(id) ON DELETE CASCADE
);

ALTER TABLE "public"."bloqueios_data"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor gerencia seus bloqueios" ON "public"."bloqueios_data"
  FOR ALL
  TO "authenticated"
  USING ((professor_id = private.meu_professor_id()))
  WITH CHECK ((professor_id = private.meu_professor_id()));

REVOKE ALL ON TABLE "public"."bloqueios_data" FROM "anon", "authenticated";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."bloqueios_data" TO "authenticated";

GRANT ALL ON TABLE "public"."bloqueios_data" TO "service_role";
