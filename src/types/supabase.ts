export interface Professor {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  chave_pix: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  cobrar_falta_sem_aviso: boolean;
  horas_antecedencia_aviso: number;
  /** Dia do mês usado como vencimento ao gerar as cobranças (1-31). Default 10. */
  dia_vencimento: number | null;
  lembrete_aula_ativo: boolean;
  lembrete_cobranca_ativo: boolean;
  onboarding_completo: boolean;
  created_at: string;
  updated_at: string;
}

export type AlunoNivel = "Iniciante" | "Intermediário" | "Avançado";

export interface Aluno {
  id: string;
  professor_id: string;
  nome: string;
  instrumento: string;
  nivel: AlunoNivel | null;
  objetivo: string | null;
  telefone: string | null;
  email_notificacao: string | null;
  nome_responsavel: string | null;
  dia_semana: number | null;
  horario: string | null;
  duracao_minutos: number;
  valor_mensalidade: number;
  status: "ativo" | "inativo";
  observacoes: string | null;
  reposicoes_disponiveis: number;
  data_nascimento: string | null;
  created_at: string;
  updated_at: string;
}

export type AulaStatus =
  | "agendada"
  | "realizada"
  | "falta_justificada"
  | "falta_sem_aviso"
  | "cancelada_professor"
  | "reagendada";

export type AulaTipo = "recorrente" | "avulsa" | "experimental";

export interface Aula {
  id: string;
  aluno_id: string | null;
  professor_id: string;
  data_hora: string;
  duracao_minutos: number;
  status: AulaStatus;
  tipo: AulaTipo;
  reagendada_de: string | null;
  aluno_experimental_nome: string | null;
  eh_reposicao: boolean;
  observacao: string | null;
  repertorio: string | null;
  licao_casa: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloqueioData {
  id: string;
  professor_id: string;
  data: string;
  motivo: string | null;
  created_at: string;
}

export interface AulaRecorrente {
  id: string;
  aluno_id: string;
  professor_id: string;
  dia_semana: number;
  horario: string;
  duracao_minutos: number;
  ativo: boolean;
  /** YYYY-MM-DD. A recorrência só gera slots a partir desta data. */
  data_inicio: string | null;
  created_at: string;
  updated_at: string;
}

export interface MensagemEnviada {
  id: string;
  professor_id: string;
  aluno_id: string | null;
  tipo:
    | "saudacao"
    | "lembrete_aula"
    | "cobranca"
    | "parabens"
    | "resumo_aula"
    | "outro";
  texto: string;
  telefone: string;
  enviada_em: string;
}

export interface PacoteAulas {
  id: string;
  aluno_id: string;
  professor_id: string;
  total_aulas: number;
  aulas_usadas: number;
  valor_total: number;
  status: "ativo" | "concluido" | "cancelado";
  observacao: string | null;
  data_compra: string;
  data_validade: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cobranca {
  id: string;
  professor_id: string;
  aluno_id: string;
  valor: number;
  mes_referencia: string;
  vencimento: string;
  status: "pendente" | "pago" | "atrasado";
  data_pagamento: string | null;
  created_at: string;
  updated_at: string;
}
