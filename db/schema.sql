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

-- Calendário e aprovação: posts planejados. Qualquer pessoa logada cria e envia para aprovação;
-- só owner/admin aprovam ou pedem ajustes (regras em lib/calendario.ts).
-- Não há DELETE: excluir = etapa 'cancelado' (some da tela, o histórico fica).
CREATE TABLE IF NOT EXISTS calendario_posts (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titulo         text NOT NULL CHECK (length(titulo) BETWEEN 1 AND 200),
  formato        text NOT NULL CHECK (formato IN ('reels', 'carrossel', 'imagem', 'story')),
  data           date NOT NULL,                  -- dia previsto (America/Sao_Paulo)
  hora           time,                           -- opcional
  legenda        text CHECK (length(legenda) <= 2200),              -- limite do Instagram
  arte_url       text CHECK (arte_url ~ '^https://' AND length(arte_url) <= 1000),
  observacoes    text CHECK (length(observacoes) <= 2000),
  etapa          text NOT NULL DEFAULT 'rascunho'
                 CHECK (etapa IN ('rascunho', 'em_aprovacao', 'ajustes', 'aprovado', 'publicado', 'cancelado')),
  criado_por     text NOT NULL,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_por text,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  aprovado_por   text,
  aprovado_em    timestamptz
);
CREATE INDEX IF NOT EXISTS calendario_posts_data_idx ON calendario_posts (data);
CREATE INDEX IF NOT EXISTS calendario_posts_pendentes_idx ON calendario_posts (data) WHERE etapa IN ('em_aprovacao', 'ajustes');

-- Tudo o que aconteceu com cada post (criou, enviou, aprovou, pediu ajustes...) e os comentários.
CREATE TABLE IF NOT EXISTS calendario_historico (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id bigint NOT NULL REFERENCES calendario_posts (id),
  em      timestamptz NOT NULL DEFAULT now(),
  autor   text NOT NULL,
  acao    text NOT NULL CHECK (acao IN ('criou', 'editou', 'enviou', 'aprovou', 'ajustes', 'publicou', 'excluiu', 'comentou')),
  texto   text CHECK (length(texto) <= 1000)
);
CREATE INDEX IF NOT EXISTS calendario_historico_post_idx ON calendario_historico (post_id, em);

-- O calendário não é assunto da coleta; o site grava, mas não apaga.
REVOKE ALL ON calendario_posts, calendario_historico FROM hub_coleta;
GRANT SELECT, INSERT, UPDATE ON calendario_posts TO hub_site;
GRANT SELECT, INSERT ON calendario_historico TO hub_site;

-- Sites no ar: landing pages do Kastir (lp.contadorceo.com.br), copiadas pelo n8n a cada 5 min
-- (fluxo "[HUB] Kastir — páginas"). O site só lê. situacao: no_ar, fora_do_ar (já foi publicada e
-- voltou a rascunho), rascunho (nunca publicada) ou removida (sumiu da lista do Kastir: foi para a lixeira).
CREATE TABLE IF NOT EXISTS sites_paginas (
  pagina_id      text PRIMARY KEY,
  site           text NOT NULL,                  -- https://lp.contadorceo.com.br
  titulo         text NOT NULL,
  slug           text NOT NULL,
  situacao       text NOT NULL CHECK (situacao IN ('no_ar', 'fora_do_ar', 'rascunho', 'removida')),
  pasta_id       text,
  autor          text,
  inicial        boolean NOT NULL DEFAULT false, -- página inicial do site (endereço sem /slug)
  publicada_em   timestamptz,                    -- última publicação
  situacao_desde timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites_pastas (
  pasta_id      text PRIMARY KEY,
  nome          text NOT NULL,
  cor           text,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Cada mudança de situação de uma página. de = NULL: primeira vez que a coleta viu a página.
CREATE TABLE IF NOT EXISTS sites_historico (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  em        timestamptz NOT NULL DEFAULT now(),
  pagina_id text NOT NULL,
  titulo    text,
  de        text,
  para      text NOT NULL
);
CREATE INDEX IF NOT EXISTS sites_historico_em_idx ON sites_historico (em DESC);

GRANT SELECT, INSERT, UPDATE ON sites_paginas, sites_pastas, sites_historico TO hub_coleta;
GRANT SELECT ON sites_paginas, sites_pastas, sites_historico TO hub_site;
