ALTER TABLE public.assinaturas
  ALTER COLUMN status SET DEFAULT 'incomplete',
  ALTER COLUMN plano SET DEFAULT 'mensal';

UPDATE public.assinaturas
SET
  status = 'incomplete',
  plano = 'mensal',
  updated_at = now()
WHERE status = 'beta'
  OR plano = 'beta';
