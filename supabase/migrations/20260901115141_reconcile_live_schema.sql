-- Reconcile schema changes that existed in the linked project but were only
-- documented in MIGRATIONS.md / ad-hoc SQL. This migration is intentionally
-- idempotent because those objects already exist in production.

-- Professor profile and onboarding settings.
ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS onboarding_completo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dia_vencimento smallint DEFAULT 10;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.professores'::regclass
       AND conname = 'professores_dia_vencimento_check'
  ) THEN
    ALTER TABLE public.professores
      ADD CONSTRAINT professores_dia_vencimento_check
      CHECK (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31);
  END IF;
END
$$;

-- Student profile additions.
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS reposicoes_disponiveis integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS nivel text,
  ADD COLUMN IF NOT EXISTS objetivo text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.alunos'::regclass
       AND conname = 'alunos_nivel_check'
  ) THEN
    ALTER TABLE public.alunos
      ADD CONSTRAINT alunos_nivel_check
      CHECK (nivel IS NULL OR nivel IN ('Iniciante', 'Intermediário', 'Avançado'));
  END IF;
END
$$;

-- One-off, experimental and rescheduled lessons.
ALTER TABLE public.aulas
  ALTER COLUMN aluno_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'recorrente',
  ADD COLUMN IF NOT EXISTS reagendada_de uuid REFERENCES public.aulas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aluno_experimental_nome text,
  ADD COLUMN IF NOT EXISTS eh_reposicao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS licao_casa text;

DO $$
DECLARE
  current_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO current_definition
    FROM pg_constraint
   WHERE conrelid = 'public.aulas'::regclass
     AND conname = 'aulas_status_check';

  IF current_definition IS NULL OR current_definition NOT LIKE '%reagendada%' THEN
    ALTER TABLE public.aulas DROP CONSTRAINT IF EXISTS aulas_status_check;
    ALTER TABLE public.aulas
      ADD CONSTRAINT aulas_status_check
      CHECK (status IN (
        'agendada',
        'realizada',
        'falta_justificada',
        'falta_sem_aviso',
        'cancelada_professor',
        'reagendada'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.aulas'::regclass
       AND conname = 'aulas_tipo_check'
  ) THEN
    ALTER TABLE public.aulas
      ADD CONSTRAINT aulas_tipo_check
      CHECK (tipo IN ('recorrente', 'avulsa', 'experimental'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_aulas_reagendada_de
  ON public.aulas (reagendada_de)
  WHERE reagendada_de IS NOT NULL;

-- Calendar exceptions.
CREATE TABLE IF NOT EXISTS public.bloqueios_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  data date NOT NULL,
  motivo text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT bloqueios_data_professor_id_data_key UNIQUE (professor_id, data)
);

ALTER TABLE public.bloqueios_data ENABLE ROW LEVEL SECURITY;

-- Multiple weekly schedules per student.
CREATE TABLE IF NOT EXISTS public.aulas_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  horario time NOT NULL,
  duracao_minutos integer NOT NULL DEFAULT 60,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  data_inicio date
);

ALTER TABLE public.aulas_recorrentes
  ADD COLUMN IF NOT EXISTS data_inicio date;

ALTER TABLE public.aulas_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_aulas_recorrentes_aluno_id
  ON public.aulas_recorrentes (aluno_id);

CREATE INDEX IF NOT EXISTS idx_aulas_recorrentes_professor_id
  ON public.aulas_recorrentes (professor_id);

-- Preserve valid legacy schedules, without inventing one for imported students.
INSERT INTO public.aulas_recorrentes (
  aluno_id,
  professor_id,
  dia_semana,
  horario,
  duracao_minutos,
  ativo,
  data_inicio
)
SELECT
  aluno.id,
  aluno.professor_id,
  aluno.dia_semana,
  aluno.horario,
  aluno.duracao_minutos,
  true,
  aluno.created_at::date
FROM public.alunos AS aluno
WHERE aluno.dia_semana IS NOT NULL
  AND aluno.horario IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
      FROM public.aulas_recorrentes AS recorrente
     WHERE recorrente.aluno_id = aluno.id
  );

UPDATE public.aulas_recorrentes AS recorrente
   SET data_inicio = aluno.created_at::date
  FROM public.alunos AS aluno
 WHERE aluno.id = recorrente.aluno_id
   AND recorrente.data_inicio IS NULL;

-- Prepaid lesson packages.
CREATE TABLE IF NOT EXISTS public.pacotes_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  total_aulas integer NOT NULL CHECK (total_aulas > 0),
  aulas_usadas integer NOT NULL DEFAULT 0 CHECK (aulas_usadas >= 0),
  valor_total numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  observacao text,
  data_compra date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  data_validade date,
  CONSTRAINT pacotes_aulas_status_check
    CHECK (status IN ('ativo', 'concluido', 'cancelado'))
);

ALTER TABLE public.pacotes_aulas
  ADD COLUMN IF NOT EXISTS data_validade date;

ALTER TABLE public.pacotes_aulas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pacotes_aulas_aluno_id
  ON public.pacotes_aulas (aluno_id);

CREATE INDEX IF NOT EXISTS idx_pacotes_aulas_professor_id
  ON public.pacotes_aulas (professor_id);

-- WhatsApp/message audit trail.
CREATE TABLE IF NOT EXISTS public.mensagens_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'outro',
  texto text NOT NULL,
  telefone text NOT NULL,
  enviada_em timestamptz DEFAULT now(),
  CONSTRAINT mensagens_enviadas_tipo_check
    CHECK (tipo IN (
      'saudacao',
      'lembrete_aula',
      'cobranca',
      'parabens',
      'resumo_aula',
      'outro'
    ))
);

ALTER TABLE public.mensagens_enviadas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  current_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid)
    INTO current_definition
    FROM pg_constraint
   WHERE conrelid = 'public.mensagens_enviadas'::regclass
     AND conname = 'mensagens_enviadas_tipo_check';

  IF current_definition IS NULL OR current_definition NOT LIKE '%resumo_aula%' THEN
    ALTER TABLE public.mensagens_enviadas
      DROP CONSTRAINT IF EXISTS mensagens_enviadas_tipo_check;
    ALTER TABLE public.mensagens_enviadas
      ADD CONSTRAINT mensagens_enviadas_tipo_check
      CHECK (tipo IN (
        'saudacao',
        'lembrete_aula',
        'cobranca',
        'parabens',
        'resumo_aula',
        'outro'
      ));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_mensagens_enviadas_professor_id
  ON public.mensagens_enviadas (professor_id);

CREATE INDEX IF NOT EXISTS mensagens_enviadas_aluno_idx
  ON public.mensagens_enviadas (aluno_id, enviada_em DESC);

-- Align historical foreign-key deletion behavior.
ALTER TABLE public.aulas
  DROP CONSTRAINT IF EXISTS aulas_aluno_id_fkey;
ALTER TABLE public.aulas
  ADD CONSTRAINT aulas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE SET NULL;

ALTER TABLE public.aulas_recorrentes
  DROP CONSTRAINT IF EXISTS aulas_recorrentes_aluno_id_fkey;
ALTER TABLE public.aulas_recorrentes
  ADD CONSTRAINT aulas_recorrentes_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE;

ALTER TABLE public.cobrancas
  DROP CONSTRAINT IF EXISTS cobrancas_aluno_id_fkey;
ALTER TABLE public.cobrancas
  ADD CONSTRAINT cobrancas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE;

ALTER TABLE public.pacotes_aulas
  DROP CONSTRAINT IF EXISTS pacotes_aulas_aluno_id_fkey;
ALTER TABLE public.pacotes_aulas
  ADD CONSTRAINT pacotes_aulas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE CASCADE;

ALTER TABLE public.mensagens_enviadas
  DROP CONSTRAINT IF EXISTS mensagens_enviadas_aluno_id_fkey;
ALTER TABLE public.mensagens_enviadas
  ADD CONSTRAINT mensagens_enviadas_aluno_id_fkey
  FOREIGN KEY (aluno_id) REFERENCES public.alunos(id) ON DELETE SET NULL;

-- Transactional RPCs used by the frontend. Ownership is enforced by RLS and
-- further tightened in the following hardening migration.
DROP FUNCTION IF EXISTS public.salvar_horarios_aluno(uuid, uuid, jsonb);
CREATE FUNCTION public.salvar_horarios_aluno(
  p_aluno_id uuid,
  p_professor_id uuid,
  p_horarios jsonb
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.aulas_recorrentes
   WHERE aluno_id = p_aluno_id
     AND professor_id = p_professor_id;

  INSERT INTO public.aulas_recorrentes (
    aluno_id,
    professor_id,
    dia_semana,
    horario,
    duracao_minutos,
    ativo,
    data_inicio
  )
  SELECT
    p_aluno_id,
    p_professor_id,
    (horario->>'dia_semana')::integer,
    (horario->>'horario')::time,
    COALESCE((horario->>'duracao_minutos')::integer, 60),
    true,
    COALESCE(NULLIF(horario->>'data_inicio', '')::date, CURRENT_DATE)
  FROM jsonb_array_elements(p_horarios) AS horario;
END;
$$;

DROP FUNCTION IF EXISTS public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer);
CREATE FUNCTION public.reagendar_aula(
  p_aula_id uuid,
  p_professor_id uuid,
  p_aluno_id uuid,
  p_nova_data timestamptz,
  p_duracao integer
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  nova_aula_id uuid;
BEGIN
  IF p_aula_id IS NOT NULL THEN
    UPDATE public.aulas
       SET status = 'reagendada', updated_at = now()
     WHERE id = p_aula_id
       AND professor_id = p_professor_id;
  END IF;

  INSERT INTO public.aulas (
    aluno_id,
    professor_id,
    data_hora,
    duracao_minutos,
    status,
    tipo,
    reagendada_de
  )
  VALUES (
    p_aluno_id,
    p_professor_id,
    p_nova_data,
    COALESCE(p_duracao, 60),
    'agendada',
    'avulsa',
    p_aula_id
  )
  RETURNING id INTO nova_aula_id;

  RETURN nova_aula_id;
END;
$$;

DROP FUNCTION IF EXISTS public.increment_reposicao(uuid);
CREATE FUNCTION public.increment_reposicao(p_aluno_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.alunos
     SET reposicoes_disponiveis = COALESCE(reposicoes_disponiveis, 0) + 1,
         updated_at = now()
   WHERE id = p_aluno_id;
$$;

DROP FUNCTION IF EXISTS public.decrement_reposicao(uuid);
CREATE FUNCTION public.decrement_reposicao(p_aluno_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.alunos
     SET reposicoes_disponiveis = GREATEST(COALESCE(reposicoes_disponiveis, 0) - 1, 0),
         updated_at = now()
   WHERE id = p_aluno_id;
$$;

DROP FUNCTION IF EXISTS public.usar_aula_pacote(uuid);
CREATE FUNCTION public.usar_aula_pacote(p_pacote_id uuid)
RETURNS TABLE (out_aulas_usadas integer, out_status text)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.pacotes_aulas AS pacote
     SET aulas_usadas = pacote.aulas_usadas + 1,
         status = CASE
           WHEN pacote.aulas_usadas + 1 >= pacote.total_aulas THEN 'concluido'
           ELSE pacote.status
         END,
         updated_at = now()
   WHERE pacote.id = p_pacote_id
     AND pacote.aulas_usadas < pacote.total_aulas
     AND pacote.status = 'ativo'
  RETURNING pacote.aulas_usadas::integer, pacote.status::text;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_horarios_aluno(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_reposicao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decrement_reposicao(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.usar_aula_pacote(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.salvar_horarios_aluno(uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reagendar_aula(uuid, uuid, uuid, timestamptz, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_reposicao(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_reposicao(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.usar_aula_pacote(uuid) TO authenticated, service_role;
