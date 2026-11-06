-- Estrutura do banco do Marketing HUB (PostgreSQL 16+).
-- Espelha as Data Tables HUB_* do n8n. Pode ser rodado de novo sem estragar nada (IF NOT EXISTS).
-- Horários em timestamptz (UTC por dentro); "dia" e "mês" já vêm calculados no fuso America/Sao_Paulo.

CREATE TABLE IF NOT EXISTS posts (
  post_id           text PRIMARY KEY,
  plataforma        text NOT NULL DEFAULT 'instagram',
  conta_id          text NOT NULL,
  formato           text,
  legenda           text,
  permalink         text,
  thumbnail_url     text,
  publicado_em      timestamptz NOT NULL,
  mes_ref           char(7) NOT NULL,            -- yyyy-MM do mês de publicação
  alcance           integer NOT NULL DEFAULT 0,
  visualizacoes     integer NOT NULL DEFAULT 0,
  curtidas          integer NOT NULL DEFAULT 0,
  comentarios       integer NOT NULL DEFAULT 0,
  compartilhamentos integer NOT NULL DEFAULT 0,
  salvamentos       integer NOT NULL DEFAULT 0,
  interacoes        integer NOT NULL DEFAULT 0,
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_mes_ref_idx ON posts (mes_ref);
CREATE INDEX IF NOT EXISTS posts_publicado_em_idx ON posts (publicado_em DESC);

CREATE TABLE IF NOT EXISTS metricas_snapshots (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id           text NOT NULL,
  plataforma        text NOT NULL DEFAULT 'instagram',
  coletado_em       timestamptz NOT NULL,
  alcance           integer NOT NULL DEFAULT 0,
  visualizacoes     integer NOT NULL DEFAULT 0,
  curtidas          integer NOT NULL DEFAULT 0,
  comentarios       integer NOT NULL DEFAULT 0,
  compartilhamentos integer NOT NULL DEFAULT 0,
  salvamentos       integer NOT NULL DEFAULT 0,
  interacoes        integer NOT NULL DEFAULT 0,
  UNIQUE (post_id, coletado_em)                  -- evita duplicar o mesmo retrato
);

CREATE TABLE IF NOT EXISTS contas_diario (
  conta_id       text NOT NULL,
  plataforma     text NOT NULL DEFAULT 'instagram',
  data           date NOT NULL,                  -- dia em America/Sao_Paulo
  seguidores     integer,
  alcance        integer,
  visualizacoes  integer,
  visitas_perfil integer,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conta_id, plataforma, data)
);

CREATE TABLE IF NOT EXISTS stories (
  story_id          text PRIMARY KEY,
  conta_id          text NOT NULL,
  formato           text,
  permalink         text,
  thumbnail_url     text,
  publicado_em      timestamptz NOT NULL,
  mes_ref           char(7) NOT NULL,
  alcance           integer NOT NULL DEFAULT 0,
  visualizacoes     integer NOT NULL DEFAULT 0,
  respostas         integer NOT NULL DEFAULT 0,
  compartilhamentos integer NOT NULL DEFAULT 0,
  interacoes        integer NOT NULL DEFAULT 0,
  visitas_perfil    integer NOT NULL DEFAULT 0,
  seguidores_ganhos integer NOT NULL DEFAULT 0,
  toques_avancar    integer NOT NULL DEFAULT 0,
  toques_voltar     integer NOT NULL DEFAULT 0,
  saidas            integer NOT NULL DEFAULT 0,
  proximo_story     integer NOT NULL DEFAULT 0,
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stories_mes_ref_idx ON stories (mes_ref);

CREATE TABLE IF NOT EXISTS sync_log (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fluxo             text NOT NULL,
  iniciado_em       timestamptz NOT NULL DEFAULT now(),
  status            text NOT NULL,
  posts_processados integer,
  erro              text,
  UNIQUE (fluxo, iniciado_em)
);
CREATE INDEX IF NOT EXISTS sync_log_iniciado_em_idx ON sync_log (iniciado_em DESC);

-- Registro de entradas e saídas do site (auditoria). resultado: 'ok' (entrou), 'saida' ou o código do erro.
CREATE TABLE IF NOT EXISTS acessos (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  em        timestamptz NOT NULL DEFAULT now(),
  email     text,
  nome      text,
  resultado text NOT NULL,                       -- 'ok' ou o código do erro (dominio, expirou...)
  ip        text,
  navegador text
);
CREATE INDEX IF NOT EXISTS acessos_em_idx ON acessos (em DESC);

-- Papéis de quem usa o site. Quem tem e-mail @absgroup.com.br e não está aqui entra como 'leitor'.
-- Ordem de poder: owner > admin > editor > leitor. `bloqueado` tira o acesso na hora (o site confere a cada página).
-- O site altera esta tabela pela tela Usuários (só owner/admin); não há DELETE: tirar acesso = bloquear.
CREATE TABLE IF NOT EXISTS usuarios (
  email         text PRIMARY KEY CHECK (email = lower(email) AND email LIKE '%@absgroup.com.br'),
  papel         text NOT NULL CHECK (papel IN ('owner', 'admin', 'editor', 'leitor')),
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado    boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS alterado_por text;
-- O padrão do banco daria escrita ao n8n; papéis não são assunto da coleta.
REVOKE ALL ON usuarios FROM hub_coleta;
GRANT SELECT, INSERT, UPDATE ON usuarios TO hub_site;

INSERT INTO usuarios (email, papel) VALUES
  ('marketing@absgroup.com.br', 'owner'),
  ('luis.eduardo@absgroup.com.br', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Histórico de alterações feitas na tela Usuários (quem mudou o quê de quem).
CREATE TABLE IF NOT EXISTS usuarios_log (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  em      timestamptz NOT NULL DEFAULT now(),
  autor   text NOT NULL,
  alvo    text NOT NULL,
  acao    text NOT NULL,                          -- papel, bloqueio, liberacao
  detalhe text
);
CREATE INDEX IF NOT EXISTS usuarios_log_em_idx ON usuarios_log (em DESC);
REVOKE ALL ON usuarios_log FROM hub_coleta;
GRANT SELECT, INSERT ON usuarios_log TO hub_site;
