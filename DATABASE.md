# Schema do Banco de Dados - SIGAH

Este documento descreve a estrutura do banco de dados PostgreSQL para o sistema SIGAH, utilizando o Supabase.

## Tabelas e Relações

### 1. `alunos`
Armazena os dados cadastrais dos estudantes.
- `id`: uuid (primary key)
- `nome`: text (not null)
- `cpf`: text (unique, not null)
- `data_nascimento`: date
- `matricula`: text (unique, not null) - Ex: 20260001
- `status`: text (default 'ativo') - ['ativo', 'inativo']
- `created_at`: timestamp with time zone (default now())
- `updated_at`: timestamp with time zone (default now())

### 2. `professores`
Armazena os dados dos docentes.
- `id`: uuid (primary key)
- `nome`: text (not null)
- `cpf`: text (unique, not null)
- `especialidade`: text
- `status`: text (default 'ativo')
- `created_at`: timestamp with time zone (default now())
- `updated_at`: timestamp with time zone (default now())

### 3. `funcionarios`
Armazena os dados dos colaboradores administrativos.
- `id`: uuid (primary key)
- `nome`: text (not null)
- `cpf`: text (unique, not null)
- `cargo`: text
- `status`: text (default 'ativo')
- `created_at`: timestamp with time zone (default now())
- `updated_at`: timestamp with time zone (default now())

### 4. `especialidades`
Catálogo de especialidades/matérias disponíveis.
- `id`: uuid (primary key)
- `nome`: text (unique, not null)

### 4. `disciplinas`
Catálogo de matérias oferecidas.
- `id`: uuid (primary key)
- `especialidade`: text (not null)
- `anos_ofertados`: text[] (not null) - Ex: ['1º ano fundamental 1', '2º ano fundamental 1']
- `status`: text (default 'ativo')
- `created_at`: timestamp with time zone (default now())
- `updated_at`: timestamp with time zone (default now())

### 5. `turmas`
Grupos de estudantes divididos por série e seção.
- `id`: uuid (primary key)
- `nome`: text (not null) - Ex: '1º ano fundamental 1 - A'
- `serie`: text (not null)
- `ano_letivo`: integer (not null)
- `semestre`: integer (not null)
- `capacidade_maxima`: integer (not null)
- `status`: text (default 'ativo')
- `created_at`: timestamp with time zone (default now())
- `updated_at`: timestamp with time zone (default now())

### 6. `turma_disciplinas`
Vínculo entre turmas, disciplinas e professores.
- `id`: uuid (primary key)
- `turma_id`: uuid (foreign key -> turmas.id)
- `disciplina_id`: uuid (foreign key -> disciplinas.id)
- `professor_id`: uuid (foreign key -> professores.id)
- `created_at`: timestamp with time zone (default now())
- `updated_at`: timestamp with time zone (default now())

### 7. `matriculas`
Vínculo entre alunos e turmas (grupos).
- `id`: uuid (primary key)
- `aluno_id`: uuid (foreign key -> alunos.id)
- `turma_id`: uuid (foreign key -> turmas.id)
- `data_matricula`: timestamp with time zone (default now())
- `status`: text (default 'ativa')
- `created_at`: timestamp with time zone (default now())
- `updated_at`: timestamp with time zone (default now())

---

## SQL para Criação (Supabase SQL Editor)

```sql
-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela Alunos
CREATE TABLE alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  data_nascimento DATE,
  matricula TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Professores
CREATE TABLE professores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  especialidade TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Funcionários
CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  cargo TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Especialidades
CREATE TABLE especialidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT UNIQUE NOT NULL
);

-- Inserir especialidades iniciais
INSERT INTO especialidades (nome) VALUES 
('Artes'), ('Geografia'), ('História'), ('Ciências'), ('Física'), ('Biologia'), 
('Química'), ('Educação Física'), ('Língua Portuguesa'), ('Inglês'), 
('Espanhol'), ('Matemática'), ('Sociologia'), ('Filosofia'), ('Assistente'), ('Laboratorista')
ON CONFLICT (nome) DO NOTHING;

-- Tabela Disciplinas
CREATE TABLE disciplinas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  especialidade TEXT NOT NULL,
  anos_ofertados TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Turmas
CREATE TABLE turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  semestre INTEGER NOT NULL,
  capacidade_maxima INTEGER NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Turma Disciplinas
CREATE TABLE turma_disciplinas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES professores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Matrículas
CREATE TABLE matriculas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
  data_matricula TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'cancelada', 'concluida')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aluno_id, turma_id)
);

-- Funções para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON alunos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_professores_updated_at BEFORE UPDATE ON professores FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON funcionarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_disciplinas_updated_at BEFORE UPDATE ON disciplinas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON turmas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_turma_disciplinas_updated_at BEFORE UPDATE ON turma_disciplinas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_matriculas_updated_at BEFORE UPDATE ON matriculas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

## Script de Povoamento (Mock Data)

Este script insere dados de teste realistas para validar as funcionalidades do SIGAH. Execute no console do Supabase após criar as tabelas acima.

```sql
-- 1. Especialidades Adicionais
INSERT INTO especialidades (nome) VALUES 
('Robótica'), ('Música'), ('Teatro'), ('Xadrez')
ON CONFLICT (nome) DO NOTHING;

-- 2. Professores
INSERT INTO professores (nome, cpf, especialidade, status) VALUES
('Ricardo Cavalcante', '123.456.789-01', 'Matemática', 'ativo'),
('Mariana Souza', '234.567.890-12', 'Língua Portuguesa', 'ativo'),
('Carlos Eduardo Silva', '345.678.901-23', 'História', 'ativo'),
('Ana Beatriz Lima', '456.789.012-34', 'Ciências', 'ativo'),
('Paulo Roberto Jasse', '567.890.123-45', 'Educação Física', 'ativo'),
('Fernanda Costa', '678.901.234-56', 'Artes', 'ativo');

-- 3. Disciplinas Designadas
INSERT INTO disciplinas (especialidade, anos_ofertados) VALUES
('Matemática', ARRAY['6º ano fundamental 2', '7º ano fundamental 2', '8º ano fundamental 2', '9º ano fundamental 2']),
('Língua Portuguesa', ARRAY['6º ano fundamental 2', '7º ano fundamental 2', '8º ano fundamental 2', '9º ano fundamental 2']),
('História', ARRAY['6º ano fundamental 2', '7º ano fundamental 2', '8º ano fundamental 2', '9º ano fundamental 2']),
('Física', ARRAY['1º ano ensino médio', '2º ano ensino médio', '3º ano ensino médio']),
('Química', ARRAY['1º ano ensino médio', '2º ano ensino médio', '3º ano ensino médio']),
('Robótica', ARRAY['8º ano fundamental 2', '9º ano fundamental 2']);

-- 4. Turmas
INSERT INTO turmas (nome, serie, ano_letivo, semestre, capacidade_maxima) VALUES
('6º Ano A - Manhã', '6º ano fundamental 2', 2026, 1, 35),
('6º Ano B - Tarde', '6º ano fundamental 2', 2026, 1, 35),
('9º Ano A - Manhã', '9º ano fundamental 2', 2026, 1, 30),
('1º EM A - Manhã', '1º ano ensino médio', 2026, 1, 40),
('3º EM A - Manhã', '3º ano ensino médio', 2026, 1, 40);

-- 5. Alunos
INSERT INTO alunos (nome, cpf, data_nascimento, matricula, status) VALUES
('Gabriel Jasse de Moraes', '111.222.333-44', '2012-05-15', '20260001', 'ativo'),
('Beatriz Helena Silva', '222.333.444-55', '2012-08-20', '20260002', 'ativo'),
('Lucas Oliveira Santos', '333.444.555-66', '2009-03-10', '20260003', 'ativo'),
('Julia Costa Ferreira', '444.555.666-77', '2008-11-25', '20260004', 'ativo'),
('Enzo Gabriel Souza', '555.666.777-88', '2012-01-30', '20260005', 'ativo'),
('Sophia Lima Cavalcante', '666.777.888-99', '2006-07-05', '20260006', 'ativo'),
('Pedro Henrique Lima', '777.888.999-00', '2011-12-12', '20260007', 'ativo'),
('Isabella Rocha', '888.999.000-11', '2009-06-18', '20260008', 'ativo');

-- 6. Matrículas em Turmas
-- Associando alunos às turmas baseado nos nomes inseridos acima
INSERT INTO matriculas (aluno_id, turma_id)
SELECT a.id, t.id FROM alunos a, turmas t WHERE a.nome = 'Gabriel Jasse de Moraes' AND t.nome = '6º Ano A - Manhã';

INSERT INTO matriculas (aluno_id, turma_id)
SELECT a.id, t.id FROM alunos a, turmas t WHERE a.nome = 'Beatriz Helena Silva' AND t.nome = '6º Ano A - Manhã';

INSERT INTO matriculas (aluno_id, turma_id)
SELECT a.id, t.id FROM alunos a, turmas t WHERE a.nome = 'Enzo Gabriel Souza' AND t.nome = '6º Ano B - Tarde';

INSERT INTO matriculas (aluno_id, turma_id)
SELECT a.id, t.id FROM alunos a, turmas t WHERE a.nome = 'Lucas Oliveira Santos' AND t.nome = '9º Ano A - Manhã';

INSERT INTO matriculas (aluno_id, turma_id)
SELECT a.id, t.id FROM alunos a, turmas t WHERE a.nome = 'Julia Costa Ferreira' AND t.nome = '1º EM A - Manhã';

INSERT INTO matriculas (aluno_id, turma_id)
SELECT a.id, t.id FROM alunos a, turmas t WHERE a.nome = 'Sophia Lima Cavalcante' AND t.nome = '3º EM A - Manhã';

-- 7. Vínculo Turma-Disciplina-Professor
INSERT INTO turma_disciplinas (turma_id, disciplina_id, professor_id)
SELECT t.id, d.id, p.id 
FROM turmas t, disciplinas d, professores p 
WHERE t.nome = '6º Ano A - Manhã' AND d.especialidade = 'Matemática' AND p.nome = 'Ricardo Cavalcante';

INSERT INTO turma_disciplinas (turma_id, disciplina_id, professor_id)
SELECT t.id, d.id, p.id 
FROM turmas t, disciplinas d, professores p 
WHERE t.nome = '6º Ano A - Manhã' AND d.especialidade = 'Língua Portuguesa' AND p.nome = 'Mariana Souza';

INSERT INTO turma_disciplinas (turma_id, disciplina_id, professor_id)
SELECT t.id, d.id, p.id 
FROM turmas t, disciplinas d, professores p 
WHERE t.nome = '1º EM A - Manhã' AND d.especialidade = 'Física' AND p.nome = 'Ricardo Cavalcante';
```

