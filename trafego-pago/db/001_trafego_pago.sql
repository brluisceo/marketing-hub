-- Tráfego Pago · tabelas no Postgres da Optimus
-- Aplicar uma vez (a Optimus roda). Tudo fica no schema "trafego_pago",
-- separado das tabelas do Instagram e das LPs do marketing-hub.

CREATE SCHEMA IF NOT EXISTS trafego_pago;

-- Uma linha por campanha por dia, gravada pelo n8n (fluxo de coleta do Meta).
CREATE TABLE IF NOT EXISTS trafego_pago.campanha_dia (
  data          date        NOT NULL,          -- dia no fuso de Brasília
  campanha_id   text        NOT NULL,
  campanha_nome text        NOT NULL,
  codigo        text,                          -- ex.: 08CEO2026, CCX. NULL = fora do escopo (D2)
  prefixo       text,                          -- ex.: ALC, WCC, IPE
  objetivo      text        NOT NULL CHECK (objetivo IN ('lead','venda','whatsapp','perfil','outro')), -- D3
  investimento  numeric(12,2) NOT NULL DEFAULT 0,
  impressoes    integer     NOT NULL DEFAULT 0,
  cliques       integer     NOT NULL DEFAULT 0,
  leads         integer     NOT NULL DEFAULT 0, -- campo "lead" do Meta
  resultados    integer     NOT NULL DEFAULT 0, -- resultado do objetivo (compra, conversa...)
  frequencia    numeric(6,2),
  coletado_em   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (data, campanha_id)
);
CREATE INDEX IF NOT EXISTS campanha_dia_codigo_idx ON trafego_pago.campanha_dia (codigo, data);

-- Nome do evento ou iniciativa de cada código. O time nomeia pela tela de eventos.
CREATE TABLE IF NOT EXISTS trafego_pago.evento_codigo (
  codigo        text PRIMARY KEY,
  nome          text,
  cidade        text,
  data_evento   date,
  status        text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado','futuro')),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Resultado comercial por dia e por time (PipeRun, origem Mídia Paga). Gravado pelo n8n.
CREATE TABLE IF NOT EXISTS trafego_pago.crm_dia (
  data            date    NOT NULL,
  time            text    NOT NULL CHECK (time IN ('black_belt','outliers')),
  leads           integer NOT NULL DEFAULT 0,
  mql_quentes     integer NOT NULL DEFAULT 0,
  reunioes        integer NOT NULL DEFAULT 0,
  contratos       integer NOT NULL DEFAULT 0,
  valor_contratos numeric(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (data, time)
);

-- Qualificação do 4Forms por dia (D4). Gravado pelo n8n.
CREATE TABLE IF NOT EXISTS trafego_pago.forms_dia (
  data        date PRIMARY KEY,
  leads       integer NOT NULL DEFAULT 0,   -- só nome, telefone e e-mail
  mql         integer NOT NULL DEFAULT 0,   -- dono ou sócio + faturamento no critério
  mql_quentes integer NOT NULL DEFAULT 0
);

-- Metas editáveis pela tela.
CREATE TABLE IF NOT EXISTS trafego_pago.meta_config (
  chave text PRIMARY KEY,
  valor numeric(14,2) NOT NULL
);

-- Leitura do dia escrita pelo Claude, já conferida número a número.
CREATE TABLE IF NOT EXISTS trafego_pago.relatorio (
  data      date PRIMARY KEY,
  leitura   jsonb       NOT NULL,          -- resumo, destaques, alerta, proxima_acao
  origem    text        NOT NULL CHECK (origem IN ('claude','modelo')),
  gerado_em timestamptz NOT NULL DEFAULT now()
);
