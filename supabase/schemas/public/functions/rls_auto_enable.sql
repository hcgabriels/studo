CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  ddl_command record;
BEGIN
  FOR ddl_command IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
    IF ddl_command.schema_name = 'public' THEN
      EXECUTE format(
        'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
        ddl_command.object_identity
      );
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres", "service_role";
