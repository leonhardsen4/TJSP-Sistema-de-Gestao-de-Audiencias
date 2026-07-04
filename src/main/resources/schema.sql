-- Esquema do banco SQLite do Sistema de Gestão de Audiências.
-- Executado a cada inicialização (CREATE TABLE IF NOT EXISTS é idempotente).
-- Datas em TEXT ISO (yyyy-MM-dd), horários em TEXT (HH:mm), booleanos em INTEGER (0/1).

CREATE TABLE IF NOT EXISTS vara (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    comarca     TEXT,
    endereco    TEXT,
    telefone    TEXT,
    email       TEXT,
    -- Cor de exibição das pautas desta vara no calendário (hex, ex.: #4F46E5)
    cor         TEXT,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS juiz (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    telefone    TEXT,
    email       TEXT,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS promotor (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    telefone    TEXT,
    email       TEXT,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS advogado (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    oab         TEXT NOT NULL,
    telefone    TEXT,
    email       TEXT,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS pessoa (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL,
    cpf         TEXT,
    telefone    TEXT,
    email       TEXT,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS usuario (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo        TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    telefone             TEXT,
    matricula            TEXT NOT NULL UNIQUE,
    senha                TEXT NOT NULL,
    ativo                INTEGER NOT NULL DEFAULT 1,
    primeiro_acesso      INTEGER NOT NULL DEFAULT 1,
    data_cadastro        TEXT,
    ultimo_acesso        TEXT,
    data_alteracao_senha TEXT
);

-- Pauta de audiências: agrupa as audiências de um dia em uma vara, com um
-- mesmo juiz e promotor. Toda audiência pertence a exatamente uma pauta.
CREATE TABLE IF NOT EXISTS pauta (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    data        TEXT NOT NULL,
    vara_id     INTEGER NOT NULL REFERENCES vara (id),
    juiz_id     INTEGER NOT NULL REFERENCES juiz (id),
    promotor_id INTEGER NOT NULL REFERENCES promotor (id),
    observacoes TEXT,
    criacao     TEXT,
    atualizacao TEXT
);

CREATE TABLE IF NOT EXISTS audiencia (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_processo     TEXT NOT NULL,
    -- Pauta à qual a audiência pertence (excluir a pauta exclui as audiências)
    pauta_id            INTEGER REFERENCES pauta (id) ON DELETE CASCADE,
    vara_id             INTEGER NOT NULL REFERENCES vara (id),
    data_audiencia      TEXT NOT NULL,
    horario_inicio      TEXT NOT NULL,
    duracao             INTEGER NOT NULL,
    horario_fim         TEXT,
    dia_semana          TEXT,
    tipo_audiencia      TEXT NOT NULL,
    formato             TEXT NOT NULL,
    competencia         TEXT NOT NULL,
    status              TEXT NOT NULL,
    artigo              TEXT,
    observacoes         TEXT,
    -- Peças importantes do processo: marcação + folha onde se encontram
    defesa_previa       INTEGER NOT NULL DEFAULT 0,
    defesa_previa_folha TEXT,
    fa_cdc              INTEGER NOT NULL DEFAULT 0,
    fa_cdc_folha        TEXT,
    laudo               INTEGER NOT NULL DEFAULT 0,
    laudo_folha         TEXT,
    -- Derivado automaticamente: 1 quando algum participante está preso
    reu_preso           INTEGER NOT NULL DEFAULT 0,
    agendamento_teams   INTEGER NOT NULL DEFAULT 0,
    reconhecimento      INTEGER NOT NULL DEFAULT 0,
    depoimento_especial INTEGER NOT NULL DEFAULT 0,
    juiz_id             INTEGER REFERENCES juiz (id),
    promotor_id         INTEGER REFERENCES promotor (id),
    criacao             TEXT,
    atualizacao         TEXT
);

CREATE TABLE IF NOT EXISTS participacao_audiencia (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    audiencia_id    INTEGER NOT NULL REFERENCES audiencia (id) ON DELETE CASCADE,
    pessoa_id       INTEGER NOT NULL REFERENCES pessoa (id),
    tipo            TEXT NOT NULL,
    intimado        INTEGER NOT NULL DEFAULT 0,
    -- Situação do mandado de intimação (enum StatusMandado: PENDENTE, POSITIVO, NEGATIVO, DISPENSADO)
    status_mandado  TEXT NOT NULL DEFAULT 'PENDENTE',
    -- Folha do processo onde consta a intimação/mandado
    folha_intimacao TEXT,
    -- Participante preso: marcação + local de prisão (reflete no RP da audiência)
    preso           INTEGER NOT NULL DEFAULT 0,
    local_prisao    TEXT,
    observacoes     TEXT
);

CREATE TABLE IF NOT EXISTS representacao_advogado (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    audiencia_id INTEGER NOT NULL REFERENCES audiencia (id) ON DELETE CASCADE,
    advogado_id  INTEGER NOT NULL REFERENCES advogado (id),
    cliente_id   INTEGER NOT NULL REFERENCES pessoa (id),
    tipo         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audiencia_data ON audiencia (data_audiencia);
CREATE INDEX IF NOT EXISTS idx_audiencia_vara ON audiencia (vara_id);
-- O índice de audiencia.pauta_id é criado em Database.executarMigracoes,
-- depois que a coluna existe também em bancos criados por versões antigas.
CREATE INDEX IF NOT EXISTS idx_pauta_data ON pauta (data);
CREATE INDEX IF NOT EXISTS idx_participacao_audiencia ON participacao_audiencia (audiencia_id);
CREATE INDEX IF NOT EXISTS idx_representacao_audiencia ON representacao_advogado (audiencia_id);
