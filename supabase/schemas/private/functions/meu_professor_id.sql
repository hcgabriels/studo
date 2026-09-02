CREATE OR REPLACE FUNCTION private.meu_professor_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
  AS $function$
  SELECT id FROM public.professores WHERE user_id = (select auth.uid()) LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION "private"."meu_professor_id"() FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "private"."meu_professor_id"() TO "authenticated", "postgres", "service_role";
