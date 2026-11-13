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
  // Só na lista de posts lida do banco (tabela posts_pilares). null = sem pilar.
  // pilar_origem: 'sugestao' (classificação automática pela legenda) ou 'manual' (marcado no hub).
  pilar?: string | null;
  pilar_origem?: string | null;
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

// Análises (quando e o que postar). Valores = média ou mediana (escolha na tela); engajamento em %.
// `maior` = maior alcance de um post do grupo. Entram só posts com 7 dias ou mais.
// Faixas de horário: 0 = até 9h, 1 = 9h–12h ... 5 = 21h em diante.
export type Grupo = { n: number; alcance: number; engajamento: number; maior: number };
export type GrupoCompleto = Grupo & { salvamentos: number; compartilhamentos: number; comentarios: number };
export type AnalisesResp = {
  gerado_em: string; meses: number;
  total: Grupo;
  grade: (Grupo & { dia: number; faixa: number })[];        // dia: 1 = segunda ... 7 = domingo
  horas: (Grupo & { hora: number })[];
  dias: (Grupo & { dia: number })[];
  formatos: (GrupoCompleto & { formato: string })[];
  pilares: (GrupoCompleto & { pilar: string | null })[];
  // Semanas completas do período, por quantidade de posts (todos os posts, sem os filtros de formato e pilar).
  frequencia: { de: number; ate: number; semanas: number; alcance_post: number; alcance_semana: number }[];
  sem_pilar: number;                                         // posts do período (de qualquer idade) ainda sem pilar
  stories: {
    total: number; dias: number; desde: string | null;
    faixas: { faixa: number; n: number; visualizacoes: number; alcance: number }[];
    // Posição do Story na sequência do dia (8 = do 8º em diante): quanto do alcance do 1º continua e % que saiu ali.
    sequencia: { pos: number; dias: number; continuam_pct: number; saida_pct: number }[];
  };
  exemplo?: boolean;
};
