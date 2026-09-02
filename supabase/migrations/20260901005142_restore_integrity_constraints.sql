-- P0-01: restore invariants required by Cadastro and Financeiro.
--
-- This migration never deletes or merges user data. If duplicates already
-- exist, it aborts with a diagnostic so they can be reviewed explicitly.

DO $$
DECLARE
  duplicate_professor_groups bigint;
  duplicate_cobranca_groups bigint;
  has_professor_unique_index boolean;
  has_cobranca_unique_index boolean;
BEGIN
  IF to_regclass('public.professores') IS NULL THEN
    RAISE EXCEPTION
      'Tabela public.professores ausente. O schema base precisa ser importado antes deste hotfix.';
  END IF;

  SELECT count(*)
    INTO duplicate_professor_groups
    FROM (
      SELECT user_id
        FROM public.professores
       WHERE user_id IS NOT NULL
       GROUP BY user_id
      HAVING count(*) > 1
    ) duplicates;

  IF duplicate_professor_groups > 0 THEN
    RAISE EXCEPTION
      USING
        MESSAGE = format(
          'Não foi possível garantir um perfil por usuário: %s user_id(s) duplicado(s).',
          duplicate_professor_groups
        ),
        HINT = 'Revise os perfis duplicados antes de reaplicar a migração; nenhum registro foi alterado.';
  END IF;

  IF to_regclass('public.cobrancas') IS NULL THEN
    RAISE EXCEPTION
      'Tabela public.cobrancas ausente. O schema base precisa ser importado antes deste hotfix.';
  END IF;

  SELECT count(*)
    INTO duplicate_cobranca_groups
    FROM (
      SELECT aluno_id, mes_referencia
        FROM public.cobrancas
       WHERE aluno_id IS NOT NULL
         AND mes_referencia IS NOT NULL
       GROUP BY aluno_id, mes_referencia
      HAVING count(*) > 1
    ) duplicates;

  IF duplicate_cobranca_groups > 0 THEN
    RAISE EXCEPTION
      USING
        MESSAGE = format(
          'Não foi possível garantir uma cobrança por aluno/mês: %s par(es) duplicado(s).',
          duplicate_cobranca_groups
        ),
        HINT = 'Revise as cobranças duplicadas antes de reaplicar a migração; nenhum registro foi alterado.';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_index index_info
     WHERE index_info.indrelid = 'public.professores'::regclass
       AND index_info.indisunique
       AND index_info.indisvalid
       AND index_info.indisready
       AND index_info.indpred IS NULL
       AND index_info.indexprs IS NULL
       AND (
         SELECT array_agg(attribute_info.attname::text ORDER BY key_info.ordinality)
           FROM unnest(index_info.indkey) WITH ORDINALITY
             AS key_info(attnum, ordinality)
           JOIN pg_attribute attribute_info
             ON attribute_info.attrelid = index_info.indrelid
            AND attribute_info.attnum = key_info.attnum
          WHERE key_info.ordinality <= index_info.indnkeyatts
       ) = ARRAY['user_id']::text[]
  ) INTO has_professor_unique_index;

  IF NOT has_professor_unique_index THEN
    ALTER TABLE public.professores
      ADD CONSTRAINT professores_user_id_unique UNIQUE (user_id);
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_index index_info
     WHERE index_info.indrelid = 'public.cobrancas'::regclass
       AND index_info.indisunique
       AND index_info.indisvalid
       AND index_info.indisready
       AND index_info.indpred IS NULL
       AND index_info.indexprs IS NULL
       AND (
         SELECT array_agg(attribute_info.attname::text ORDER BY key_info.ordinality)
           FROM unnest(index_info.indkey) WITH ORDINALITY
             AS key_info(attnum, ordinality)
           JOIN pg_attribute attribute_info
             ON attribute_info.attrelid = index_info.indrelid
            AND attribute_info.attnum = key_info.attnum
          WHERE key_info.ordinality <= index_info.indnkeyatts
       ) = ARRAY['aluno_id', 'mes_referencia']::text[]
  ) INTO has_cobranca_unique_index;

  IF NOT has_cobranca_unique_index THEN
    ALTER TABLE public.cobrancas
      ADD CONSTRAINT cobrancas_aluno_mes_unique
      UNIQUE (aluno_id, mes_referencia);
  END IF;
END
$$;
