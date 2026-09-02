-- P1-03: an active student can exist before a weekly schedule is defined.
-- The legacy columns remain as a compatibility fallback, but no longer force
-- imports to invent Monday at 09:00.

ALTER TABLE public.alunos
  ALTER COLUMN dia_semana DROP NOT NULL,
  ALTER COLUMN horario DROP NOT NULL;

COMMENT ON COLUMN public.alunos.dia_semana IS
  'Legacy weekly schedule fallback. NULL means that no schedule was defined.';

COMMENT ON COLUMN public.alunos.horario IS
  'Legacy weekly schedule fallback. NULL means that no schedule was defined.';
