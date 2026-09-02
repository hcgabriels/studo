CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
  AS $function$
  BEGIN
    INSERT INTO public.professores (user_id, nome, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', split_part(COALESCE(NEW.email, ''), '@', 1)),
      COALESCE(NEW.email, '')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
  END;
  $function$;

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres", "service_role";
