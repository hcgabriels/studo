# Histórico de migrations manuais — Studoo

> **Não execute estes blocos no SQL Editor.** Eles documentam a evolução antiga
> do produto e foram consolidados nas migrations cronológicas em
> `supabase/migrations/`. A fonte de verdade atual é `supabase/`.

---

## Sprint 1 — Dados para recibo

```sql
ALTER TABLE professores
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS endereco text;
```

**Por que:** o componente `ReciboModal` usa `professor.cpf_cnpj` e `professor.endereco` no rodapé do recibo.

---

## Sprint 2 — Reagendamento, aula avulsa, bloqueios, múltiplas aulas

### 1. Status e tipo de aula

Esse bloco **autodetecta** se `aulas.status` é enum ou text+check no seu schema e adapta. Funciona nos dois casos.

```sql
-- Adiciona 'reagendada' ao status (autodetectado: enum ou text+check)
DO $$
DECLARE
  v_data_type text;
  v_udt_name text;
  v_constraint_name text;
BEGIN
  SELECT data_type, udt_name
  INTO v_data_type, v_udt_name
  FROM information_schema.columns
  WHERE table_name = 'aulas' AND column_name = 'status';

  IF v_data_type = 'USER-DEFINED' THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'reagendada');
  ELSIF v_data_type IN ('text', 'character varying') THEN
    SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'aulas'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%';

    IF v_constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE aulas DROP CONSTRAINT %I', v_constraint_name);
    END IF;

    ALTER TABLE aulas ADD CONSTRAINT aulas_status_check
      CHECK (status IN (
        'agendada', 'realizada', 'falta_justificada',
        'falta_sem_aviso', 'cancelada_professor', 'reagendada'
      ));
  END IF;
END $$;

-- Tipo de aula (text + check; mais simples que enum pra evoluir depois)
ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'recorrente',
  ADD COLUMN IF NOT EXISTS reagendada_de uuid REFERENCES aulas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aluno_experimental_nome text;

DO $$ BEGIN
  ALTER TABLE aulas ADD CONSTRAINT aulas_tipo_check
    CHECK (tipo IN ('recorrente', 'avulsa', 'experimental'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- aluno_id passa a aceitar NULL (aula experimental sem cadastro)
ALTER TABLE aulas ALTER COLUMN aluno_id DROP NOT NULL;
```

### 2. Bloqueios de data (feriados/férias)

```sql
CREATE TABLE IF NOT EXISTS bloqueios_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  data date NOT NULL,
  motivo text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (professor_id, data)
);

-- RLS
ALTER TABLE bloqueios_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor gerencia seus bloqueios" ON bloqueios_data;
CREATE POLICY "Professor gerencia seus bloqueios"
  ON bloqueios_data
  USING (
    professor_id IN (
      SELECT id FROM professores WHERE user_id = auth.uid()
    )
  );
```

### 3. Aulas recorrentes (múltiplos horários por aluno)

```sql
CREATE TABLE IF NOT EXISTS aulas_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  horario time NOT NULL,
  duracao_minutos int NOT NULL DEFAULT 60,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE aulas_recorrentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor gerencia suas aulas recorrentes" ON aulas_recorrentes;
CREATE POLICY "Professor gerencia suas aulas recorrentes"
  ON aulas_recorrentes
  USING (
    professor_id IN (
      SELECT id FROM professores WHERE user_id = auth.uid()
    )
  );

-- Popular com dados existentes dos alunos (idempotente — só insere se não houver registro pro aluno)
INSERT INTO aulas_recorrentes (aluno_id, professor_id, dia_semana, horario, duracao_minutos, ativo)
SELECT
  a.id,
  a.professor_id,
  a.dia_semana,
  a.horario,
  a.duracao_minutos,
  true
FROM alunos a
WHERE NOT EXISTS (
  SELECT 1 FROM aulas_recorrentes ar WHERE ar.aluno_id = a.id
);
```

**O que essa migration faz:**
- Cria a tabela.
- Popula com base nos horários já existentes em `alunos.dia_semana/horario/duracao_minutos`.
- **Não deleta** as colunas legadas no `alunos` — o app usa fallback se `aulas_recorrentes` estiver vazia. Mantenha por enquanto pra segurança; podemos limpar numa migration futura.

---

---

## Sprint 3 — Reposições, pacotes, marcador de reposição em aula

### 1. Reposições disponíveis no aluno

```sql
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS reposicoes_disponiveis int NOT NULL DEFAULT 0;
```

### 2. Marcador "é reposição" na aula avulsa

```sql
ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS eh_reposicao boolean NOT NULL DEFAULT false;
```

### 3. Pacotes de aulas

```sql
CREATE TABLE IF NOT EXISTS pacotes_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  total_aulas int NOT NULL CHECK (total_aulas > 0),
  aulas_usadas int NOT NULL DEFAULT 0 CHECK (aulas_usadas >= 0),
  valor_total numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  observacao text,
  data_compra date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE pacotes_aulas ADD CONSTRAINT pacotes_aulas_status_check
    CHECK (status IN ('ativo', 'concluido', 'cancelado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE pacotes_aulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor gerencia seus pacotes" ON pacotes_aulas;
CREATE POLICY "Professor gerencia seus pacotes"
  ON pacotes_aulas
  USING (
    professor_id IN (
      SELECT id FROM professores WHERE user_id = auth.uid()
    )
  );
```

---

## Sprint 4 — Aniversário, validades, histórico de mensagens

### 1. Aniversário do aluno

```sql
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS data_nascimento date;
```

### 2. Validade dos pacotes

```sql
ALTER TABLE pacotes_aulas
  ADD COLUMN IF NOT EXISTS data_validade date;
```

### 3. Histórico de mensagens enviadas (WhatsApp)

```sql
CREATE TABLE IF NOT EXISTS mensagens_enviadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
  aluno_id uuid REFERENCES alunos(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'outro',
  texto text NOT NULL,
  telefone text NOT NULL,
  enviada_em timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE mensagens_enviadas ADD CONSTRAINT mensagens_enviadas_tipo_check
    CHECK (tipo IN ('saudacao', 'lembrete_aula', 'cobranca', 'parabens', 'outro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE mensagens_enviadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professor gerencia suas mensagens" ON mensagens_enviadas;
CREATE POLICY "Professor gerencia suas mensagens"
  ON mensagens_enviadas
  USING (
    professor_id IN (
      SELECT id FROM professores WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS mensagens_enviadas_aluno_idx
  ON mensagens_enviadas (aluno_id, enviada_em DESC);
```

---

## Sprint 5 — Nível e objetivo do aluno

```sql
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS nivel text,
  ADD COLUMN IF NOT EXISTS objetivo text;

-- Garante que só valores válidos entrem em `nivel`
DO $$ BEGIN
  ALTER TABLE alunos ADD CONSTRAINT alunos_nivel_check
    CHECK (nivel IS NULL OR nivel IN ('Iniciante', 'Intermediário', 'Avançado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

---

## Sprint 6 — Onboarding wizard

```sql
ALTER TABLE professores
  ADD COLUMN IF NOT EXISTS onboarding_completo BOOLEAN DEFAULT false;
```

**Por que:** o wizard fullscreen (`/onboarding`) precisa lembrar se o professor já passou pelas 6 etapas pra não mostrar de novo. Quem já tem conta antiga deve assumir `false` por padrão — ao fazer login pela primeira vez após o deploy, vê o wizard uma vez.

> Se quiser pular o wizard pra contas existentes (que já estão produtivas), rode após o ALTER:
> ```sql
> UPDATE professores SET onboarding_completo = true WHERE created_at < now() - interval '1 day';
> ```

---

## Sprint 7 — UNIQUE composto em cobranças

Necessário pro `upsert` com `onConflict: "aluno_id,mes_referencia"` funcionar em `Financeiro.tsx` (gerar cobranças do mês). Sem isso, dá erro críptico `"Cannot resolve onConflict target"`.

```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cobrancas_aluno_mes_unique'
      AND conrelid = 'cobrancas'::regclass
  ) THEN
    ALTER TABLE cobrancas
      ADD CONSTRAINT cobrancas_aluno_mes_unique UNIQUE (aluno_id, mes_referencia);
  END IF;
END $$;
```

**Por que:** Postgres não suporta `ADD CONSTRAINT IF NOT EXISTS`. Checamos o catálogo `pg_constraint` antes de tentar criar. (A versão com `EXCEPTION WHEN duplicate_object` falha porque UNIQUE cria implicitamente um índice e o erro vira `42P07 relation already exists`, não `42710 duplicate_object`.)

---

## Sprint 8 — RPC `increment_reposicao`

Garante atomicidade ao incrementar reposições do aluno (evita race condition quando duas presenças são registradas em paralelo).

```sql
CREATE OR REPLACE FUNCTION increment_reposicao(aluno_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE alunos
    SET reposicoes_disponiveis = reposicoes_disponiveis + 1
    WHERE id = aluno_id_param;
END;
$$ LANGUAGE plpgsql;
```

**Por que:** `Agenda.tsx` (registrar presença como reposição) usa `supabase.rpc("increment_reposicao", ...)`. Sem essa função, cai num fallback manual de leitura+update — que tem race condition se duas presenças forem registradas no mesmo instante.

---

## Sprint 9 — Lição de casa

```sql
ALTER TABLE aulas
  ADD COLUMN IF NOT EXISTS licao_casa text;
```

**Por que:** novo campo no modal de presença pra registrar o que o aluno deve praticar até a próxima aula. Aparece no Diário e é o conteúdo principal do resumo enviado via WhatsApp ao aluno.

### Tipo `resumo_aula` em `mensagens_enviadas`

```sql
ALTER TABLE mensagens_enviadas
  DROP CONSTRAINT IF EXISTS mensagens_enviadas_tipo_check;

ALTER TABLE mensagens_enviadas
  ADD CONSTRAINT mensagens_enviadas_tipo_check
  CHECK (tipo IN ('saudacao', 'lembrete_aula', 'cobranca', 'parabens', 'resumo_aula', 'outro'));
```

**Por que:** o botão "Enviar resumo no WhatsApp" registra a mensagem em `mensagens_enviadas` com `tipo='resumo_aula'`. O CHECK constraint atual rejeita esse valor — recriar incluindo-o.

---

## Como aplicar

1. Abra o SQL Editor no Supabase
2. Cole cada bloco em ordem e clique em **Run**
3. Se já rodou alguma parte antes, os `IF NOT EXISTS` impedem erro

Em caso de erro relacionado a `auth.uid()` ou políticas RLS, confirme que sua tabela `professores` está com RLS ativo e que existe política para os usuários autenticados lerem o próprio registro.
