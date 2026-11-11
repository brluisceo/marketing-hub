export type Kpis = {
  posts: number; alcance: number; visualizacoes: number; interacoes: number;
  curtidas: number; comentarios: number; compartilhamentos: number; salvamentos: number;
  engajamento_pct: number;
};

export type PostResumo = {
  post_id: string; formato: string; legenda: string; permalink: string; thumbnail_url?: string;
  publicado_em: string; alcance: number; interacoes: number; engajamento_pct: number;
};

export type Overview = {
  mes: string; mes_anterior: string; gerado_em: string;
  kpis: Kpis; kpis_mes_anterior: Kpis;
  serie_12_meses: { mes: string; posts: number; alcance: number }[];
  por_formato: { formato: string; posts: number; alcance: number; interacoes: number; alcance_medio: number }[];
  top_posts: PostResumo[];
  conta: { seguidores: number | null; seguidores_ganhos_mes: number | null; dias_com_dados_no_mes: number; alcance_conta_mes: number; visitas_perfil_mes: number };
};

export type Post = {
  post_id: string; plataforma: string; formato: string; legenda: string; permalink: string;
  thumbnail_url?: string; publicado_em: string; mes_ref: string;
  alcance: number; visualizacoes: number; curtidas: number; comentarios: number;
  compartilhamentos: number; salvamentos: number; interacoes: number; engajamento_pct: number;
  atualizado_em?: string;
};

export type PostsResp = { total: number; pagina: number; por_pagina: number; ordem: string; dir: string; itens: Post[] };

export type PostResp = {
  erro?: string;
  post?: Post;
  historico?: { coletado_em: string; alcance: number; visualizacoes: number; interacoes: number }[];
};

export type ContaResp = {
  dias: number;
  serie: { dia: string; seguidores: number; alcance: number; visualizacoes: number; visitas_perfil: number }[];
};

export type StoriesKpis = {
  stories: number; alcance: number; visualizacoes: number; respostas: number; compartilhamentos: number;
  interacoes: number; visitas_perfil: number; seguidores_ganhos: number; alcance_medio: number; saida_pct: number;
};

export type Story = {
  story_id: string; formato: string; permalink: string; publicado_em: string;
  alcance: number; visualizacoes: number; respostas: number; compartilhamentos: number; interacoes: number;
  visitas_perfil: number; seguidores_ganhos: number;
  toques_avancar: number; toques_voltar: number; saidas: number; proximo_story: number;
  no_ar: boolean; atualizado_em?: string;
};

export type StoriesResp = {
  mes: string; mes_anterior: string; gerado_em: string; coleta_desde: string | null;
  kpis: StoriesKpis; kpis_mes_anterior: StoriesKpis; itens: Story[];
};

// Sites no ar: landing pages do Kastir que estão no ar (lib/kastir.ts lê do banco, onde o n8n grava).
export type PaginaSite = { id: string; titulo: string; url: string; pasta_id: string | null; publicada_em: string | null };
export type PastaSite = { id: string; nome: string; cor: string | null };
// gerado_em = última leitura do Kastir pelo n8n. exemplo = retrato de lib/mock-sites.ts (o n8n ainda não leu).
export type SitesResp = { site: string; paginas: PaginaSite[]; pastas: PastaSite[]; gerado_em: string; exemplo?: boolean };
