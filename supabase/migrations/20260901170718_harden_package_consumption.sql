-- Consume exactly one package credit or fail explicitly when a stale client
-- tries to use an exhausted/cancelled package.

CREATE OR REPLACE FUNCTION public.usar_aula_pacote(p_pacote_id uuid)
RETURNS TABLE (out_aulas_usadas integer, out_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  next_aulas_usadas integer;
  next_status text;
BEGIN
  UPDATE public.pacotes_aulas AS pacote
     SET aulas_usadas = pacote.aulas_usadas + 1,
         status = CASE
           WHEN pacote.aulas_usadas + 1 >= pacote.total_aulas THEN 'concluido'
           ELSE pacote.status
         END,
         updated_at = now()
   WHERE pacote.id = p_pacote_id
     AND pacote.professor_id = private.meu_professor_id()
     AND pacote.aulas_usadas < pacote.total_aulas
     AND pacote.status = 'ativo'
  RETURNING pacote.aulas_usadas::integer, pacote.status::text
       INTO next_aulas_usadas, next_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pacote indisponível ou sem aulas restantes';
  END IF;

  RETURN QUERY SELECT next_aulas_usadas, next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.usar_aula_pacote(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.usar_aula_pacote(uuid) TO authenticated, service_role;
