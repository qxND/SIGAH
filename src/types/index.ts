export type Status = 'ativo' | 'inativo';

export interface Aluno {
  id: string;
  nome: string;
  cpf: string;
  data_nascimento: string;
  matricula: string;
  status: Status;
  ano_escolar?: string;
  segmento_escolar?: string;
  created_at: string;
  updated_at: string;
}

export interface Professor {
  id: string;
  nome: string;
  cpf: string;
  especialidade: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Disciplina {
  id: string;
  especialidade: string;
  anos_ofertados: string[];
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface Turma {
  id: string;
  nome: string; // Ex: '1º ano fundamental 1 - A'
  serie: string;
  ano_letivo: number;
  semestre: number;
  capacidade_maxima: number;
  status: Status;
  ano_escolar?: string;
  segmento_escolar?: string;
  created_at: string;
  updated_at: string;
  // Joins
  disciplinas_vinculadas?: TurmaDisciplina[];
}

export interface TurmaDisciplina {
  id: string;
  turma_id: string;
  disciplina_id: string;
  professor_id: string;
  created_at: string;
  updated_at: string;
  // Joins
  disciplina?: Disciplina;
  professor?: Professor;
}

export interface Matricula {
  id: string;
  aluno_id: string;
  turma_id: string;
  data_matricula: string;
  status: 'ativa' | 'cancelada' | 'concluida';
  created_at: string;
  updated_at: string;
  // Joins
  aluno?: Aluno;
  turma?: Turma;
}
