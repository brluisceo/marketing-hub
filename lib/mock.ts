import type { ContaResp, Overview, Post, PostResp, PostsResp, StoriesKpis, StoriesResp } from './types';

// Dados de exemplo (retrato real de outubro/2026), usados só quando HUB_MOCK=1.
const posts: Post[] = [
  { post_id: '17946837345075204', plataforma: 'instagram', formato: 'Foto', legenda: 'Com a reforma tributária o contrato é seu conselheiro estratégico.', permalink: 'https://www.instagram.com/p/DeOvEgNpWHr/', publicado_em: '2026-10-08T10:37:41.000Z', mes_ref: '2026-10', alcance: 16048, visualizacoes: 25867, curtidas: 577, comentarios: 1, compartilhamentos: 107, salvamentos: 50, interacoes: 801, engajamento_pct: 5 },
  { post_id: '17898036771610558', plataforma: 'instagram', formato: 'Reel', legenda: 'Reforma não será revogada e sim aprimorada!', permalink: 'https://www.instagram.com/reel/DeLNSjQuDFM/', publicado_em: '2026-10-07T01:45:57.000Z', mes_ref: '2026-10', alcance: 12186, visualizacoes: 17734, curtidas: 605, comentarios: 18, compartilhamentos: 238, salvamentos: 57, interacoes: 980, engajamento_pct: 8 },
  { post_id: '18100106513427230', plataforma: 'instagram', formato: 'Foto', legenda: 'O Brasil que queremos começa com as nossas escolhas!', permalink: 'https://www.instagram.com/p/De6uOGKp8IN/', publicado_em: '2026-10-25T12:38:41.000Z', mes_ref: '2026-10', alcance: 10966, visualizacoes: 19321, curtidas: 313, comentarios: 24, compartilhamentos: 1, salvamentos: 2, interacoes: 347, engajamento_pct: 3.2 },
  { post_id: '18025357367948360', plataforma: 'instagram', formato: 'Carrossel', legenda: 'O crescimento do seu escritório contábil não trava por falta de esforço.', permalink: 'https://www.instagram.com/p/DfH2tgZoHdv/', publicado_em: '2026-10-30T15:00:04.000Z', mes_ref: '2026-10', alcance: 361, visualizacoes: 881, curtidas: 13, comentarios: 4, compartilhamentos: 0, salvamentos: 1, interacoes: 18, engajamento_pct: 5 }
];

const overview: Overview = {
  mes: '2026-10', mes_anterior: '2026-09', gerado_em: '2026-10-30T17:39:10-03:00',
  kpis: { posts: 87, alcance: 203261, visualizacoes: 359929, interacoes: 10596, curtidas: 7424, comentarios: 997, compartilhamentos: 1138, salvamentos: 528, engajamento_pct: 5.2 },
  kpis_mes_anterior: { posts: 62, alcance: 281867, visualizacoes: 448164, interacoes: 11758, curtidas: 6461, comentarios: 1158, compartilhamentos: 2314, salvamentos: 1208, engajamento_pct: 4.2 },
  serie_12_meses: [
    { mes: '2025-11', posts: 26, alcance: 186902 }, { mes: '2025-12', posts: 34, alcance: 228645 }, { mes: '2026-01', posts: 36, alcance: 640696 },
    { mes: '2026-02', posts: 41, alcance: 1560331 }, { mes: '2026-03', posts: 63, alcance: 2003194 }, { mes: '2026-04', posts: 61, alcance: 358349 },
    { mes: '2026-05', posts: 75, alcance: 1316574 }, { mes: '2026-06', posts: 55, alcance: 1180974 }, { mes: '2026-07', posts: 73, alcance: 576825 },
    { mes: '2026-08', posts: 55, alcance: 526896 }, { mes: '2026-09', posts: 62, alcance: 281867 }, { mes: '2026-10', posts: 87, alcance: 203261 }
  ],
  por_formato: [
    { formato: 'Foto', posts: 24, alcance: 108677, interacoes: 4329, alcance_medio: 4528 },
    { formato: 'Reel', posts: 48, alcance: 61702, interacoes: 4269, alcance_medio: 1285 },
    { formato: 'Carrossel', posts: 15, alcance: 32882, interacoes: 1998, alcance_medio: 2192 }
  ],
  top_posts: posts.slice(0, 3).map((p) => ({ post_id: p.post_id, formato: p.formato, legenda: p.legenda, permalink: p.permalink, publicado_em: p.publicado_em, alcance: p.alcance, interacoes: p.interacoes, engajamento_pct: p.engajamento_pct })),
  conta: { seguidores: 120739, seguidores_ganhos_mes: null, dias_com_dados_no_mes: 1, alcance_conta_mes: 6215, visitas_perfil_mes: 375 }
};

const conta: ContaResp = { dias: 30, serie: [{ dia: '2026-10-29', seguidores: 120739, alcance: 6215, visualizacoes: 25009, visitas_perfil: 375 }] };

const semStories: StoriesKpis = { stories: 0, alcance: 0, visualizacoes: 0, respostas: 0, compartilhamentos: 0, interacoes: 0, visitas_perfil: 0, seguidores_ganhos: 0, alcance_medio: 0, saida_pct: 0 };

const stories: StoriesResp = {
  mes: '2026-11', mes_anterior: '2026-10', gerado_em: '2026-11-05T16:22:00-03:00', coleta_desde: '2026-11-05T13:27:15.000Z',
  kpis: { stories: 1, alcance: 317, visualizacoes: 391, respostas: 1, compartilhamentos: 0, interacoes: 10, visitas_perfil: 5, seguidores_ganhos: 0, alcance_medio: 317, saida_pct: 16.1 },
  kpis_mes_anterior: semStories,
  itens: [
    { story_id: '18476075062143221', formato: 'Vídeo', permalink: 'https://www.instagram.com/stories/rogerio.fameli/4023723507350861865', publicado_em: '2026-11-05T13:27:15.000Z', alcance: 317, visualizacoes: 391, respostas: 1, compartilhamentos: 0, interacoes: 10, visitas_perfil: 5, seguidores_ganhos: 0, toques_avancar: 222, toques_voltar: 1, saidas: 63, proximo_story: 46, no_ar: true }
  ]
};

export function mock(params: Record<string, string | undefined>): unknown {
  switch (params.recurso) {
    case 'overview': return overview;
    case 'conta': return conta;
    case 'stories': return stories;
    case 'post': {
      const p = posts.find((x) => x.post_id === params.post_id);
      return (p ? { post: p, historico: [] } : { erro: 'post_nao_encontrado' }) satisfies PostResp;
    }
    case 'posts': {
      let lista = [...posts];
      if (params.formato) lista = lista.filter((p) => p.formato === params.formato);
      if (params.busca) lista = lista.filter((p) => p.legenda.toLowerCase().includes(params.busca!.toLowerCase()));
      const ordem = (params.ordem || 'publicado_em') as keyof Post;
      const dir = params.dir === 'asc' ? 1 : -1;
      lista.sort((a, b) => (ordem === 'publicado_em' ? +new Date(a.publicado_em) - +new Date(b.publicado_em) : Number(a[ordem]) - Number(b[ordem])) * dir);
      return { total: lista.length, pagina: 1, por_pagina: 20, ordem: String(ordem), dir: dir === 1 ? 'asc' : 'desc', itens: lista } satisfies PostsResp;
    }
    default: return { erro: 'recurso_invalido' };
  }
}
