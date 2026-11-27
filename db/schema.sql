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

-- Pilar (tema) de cada post do Instagram, usado na tela Análises. Sem linha (ou pilar NULL) = sem pilar.
-- origem: 'sugestao' (classificação automática lendo a legenda; a inicial foi em 13/11/2026) ou 'manual' (alguém marcou no hub).
-- O site grava (painel do post na tela Posts); não há DELETE: tirar o pilar = pilar NULL.
CREATE TABLE IF NOT EXISTS posts_pilares (
  post_id     text PRIMARY KEY,
  pilar       text CHECK (pilar IN ('gestao', 'vendas', 'tributario', 'mentalidade', 'bastidores', 'eventos', 'casos', 'opiniao')),
  origem      text NOT NULL DEFAULT 'manual' CHECK (origem IN ('sugestao', 'manual')),
  marcado_por text,
  marcado_em  timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON posts_pilares FROM hub_coleta;
GRANT SELECT, INSERT, UPDATE ON posts_pilares TO hub_site;

-- ============================================================================================
-- Tráfego pago (Contador CEO). Regras e decisões em docs/trafego-pago-decisoes.md.
-- O n8n grava (fluxos "[HUB] Meta Ads — ..." e "[HUB] PipeRun — ..."); o site só lê,
-- menos o resultado preenchido à mão (trafego_resultado_manual) e a configuração (trafego_config).
-- ============================================================================================

-- Meta Ads: uma linha por anúncio por dia (dia no fuso America/Sao_Paulo). A coleta pede um dia por
-- consulta (a quebra diária da Meta, time_increment=1, devolve gasto incompleto) e refaz os últimos
-- 10 dias, porque a Meta corrige os números para trás. Todas as campanhas da conta entram; o agrupamento
-- por família é feito na leitura (nunca filtrar por uma palavra do nome).
CREATE TABLE IF NOT EXISTS meta_anuncios_diario (
  dia               date NOT NULL,
  ad_id             text NOT NULL,
  conta_id          text NOT NULL,                  -- 233916409249136
  campaign_id       text NOT NULL,
  campaign_name     text NOT NULL,
  adset_id          text,
  adset_name        text,
  ad_name           text,
  objetivo          text,                           -- objective da Meta (OUTCOME_LEADS, OUTCOME_SALES...)
  gasto             numeric(12,2) NOT NULL DEFAULT 0,
  impressoes        integer NOT NULL DEFAULT 0,
  cliques           integer NOT NULL DEFAULT 0,     -- todos os cliques (CTR "todos")
  cliques_link      integer NOT NULL DEFAULT 0,     -- inline_link_clicks (CTR do link)
  visitas_pagina    integer NOT NULL DEFAULT 0,     -- landing_page_view
  frequencia        numeric(6,2),
  leads             integer NOT NULL DEFAULT 0,     -- lead (inclui o lead do checkout do Eduzz)
  leads_formulario  integer NOT NULL DEFAULT 0,     -- onsite_conversion.lead_grouped (formulário nativo)
  conversas         integer NOT NULL DEFAULT 0,     -- conversas iniciadas no WhatsApp
  checkouts         integer NOT NULL DEFAULT 0,     -- omni_initiated_checkout
  compras           integer NOT NULL DEFAULT 0,     -- omni_purchase (compras no pixel; não é o total de vendas)
  valor_compras     numeric(14,2) NOT NULL DEFAULT 0,
  atualizado_em     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dia, ad_id)
);
CREATE INDEX IF NOT EXISTS meta_anuncios_diario_campanha_idx ON meta_anuncios_diario (campaign_id, dia);

-- Situação e orçamento de cada campanha (lidos a cada coleta). orcamento_mudou_em alimenta o alerta
-- "orçamento alterado nas últimas 24 horas".
CREATE TABLE IF NOT EXISTS meta_campanhas (
  campaign_id         text PRIMARY KEY,
  conta_id            text NOT NULL,
  nome                text NOT NULL,
  status              text,                         -- effective_status da Meta (ACTIVE, PAUSED...)
  orcamento_dia       numeric(12,2),                -- em reais (a Meta devolve em centavos)
  orcamento_anterior  numeric(12,2),
  orcamento_mudou_em  timestamptz,
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);

-- PipeRun: oportunidades dos funis do Contador CEO. time: black_belt (Funil Closer 101027) ou
-- outliers (Funil Elite 108929, 108930, 108931). Campanha, perfil e faturamento vêm das notas da
-- integração do Meta Lead Ads no histórico do card. origem_grupo segue os grupos do PipeRun
-- (36347 orgânico, 36348 pago, 36349 outbound, 36350 relacionamento, 36351 receptivo, 43897 eventos).
CREATE TABLE IF NOT EXISTS crm_oportunidades (
  deal_id        bigint PRIMARY KEY,
  titulo         text,
  funil_id       integer NOT NULL,
  time           text NOT NULL CHECK (time IN ('black_belt', 'outliers')),
  etapa_id       integer,
  etapa_nome     text,
  status         smallint,                          -- 0 aberta, 1 ganha, 2 perdida
  criado_em      timestamptz,
  fechado_em     timestamptz,
  origem_id      integer,
  origem_nome    text,
  origem_grupo   text,
  campanha       text,
  conjunto       text,
  anuncio        text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  dono           text,                              -- responsável pelo card (vendedor)
  motivo_id      integer,
  motivo_nome    text,
  valor_mrr      numeric(14,2) NOT NULL DEFAULT 0,
  valor_setup    numeric(14,2) NOT NULL DEFAULT 0,
  perfil         text,                              -- resposta "dono ou sócio" do formulário (MQL)
  faturamento    text,
  agendada_em    timestamptz,                       -- primeira entrada em Reunião Agendada
  realizada_em   timestamptz,                       -- primeira entrada em Reunião Realizada
  noshow_em      timestamptz,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_oportunidades_criado_idx ON crm_oportunidades (criado_em);
CREATE INDEX IF NOT EXISTS crm_oportunidades_abertas_idx ON crm_oportunidades (deal_id) WHERE status = 0;

-- Movimentos em tempo real: o PipeRun avisa o n8n (automação de webhook) quando um card entra em
-- reunião agendada, confirmada, realizada, no-show ou venda. Base da tela "Ao vivo".
CREATE TABLE IF NOT EXISTS crm_movimentos (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chave       text NOT NULL UNIQUE,                 -- deal|etapa|minuto: evita duplicar o mesmo aviso
  em          timestamptz NOT NULL DEFAULT now(),
  tipo        text NOT NULL CHECK (tipo IN ('agendada', 'confirmada', 'realizada', 'noshow', 'venda')),
  deal_id     bigint NOT NULL,
  funil_id    integer NOT NULL,
  etapa_id    integer,
  etapa_nome  text,
  titulo      text,
  dono        text
);
CREATE INDEX IF NOT EXISTS crm_movimentos_em_idx ON crm_movimentos (em DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON meta_anuncios_diario, meta_campanhas, crm_oportunidades, crm_movimentos TO hub_coleta;
GRANT SELECT ON meta_anuncios_diario, meta_campanhas, crm_oportunidades, crm_movimentos TO hub_site;

-- Configuração do módulo (metas e nomes), editada no site por owner/admin.
-- Chaves: leads_dia, custo_reuniao, regra_valor (ps ou ps_mais_mrr), familias_json, eventos_json.
CREATE TABLE IF NOT EXISTS trafego_config (
  chave          text PRIMARY KEY,
  valor          text,
  atualizado_por text,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON trafego_config FROM hub_coleta;
GRANT SELECT, INSERT, UPDATE ON trafego_config TO hub_site;

-- Resultado geral preenchido à mão (a Meta não tem esses números): por período, chave "aaaa-mm-dd_aaaa-mm-dd".
CREATE TABLE IF NOT EXISTS trafego_resultado_manual (
  chave          text PRIMARY KEY CHECK (chave ~ '^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$'),
  vendas_total   integer,
  liquido_total  numeric(14,2),
  vendas_mkt     integer,
  liquido_mkt    numeric(14,2),
  preenchido_por text,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON trafego_resultado_manual FROM hub_coleta;
GRANT SELECT, INSERT, UPDATE ON trafego_resultado_manual TO hub_site;
