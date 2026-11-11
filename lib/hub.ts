import { unstable_cache } from 'next/cache';
import * as dados from './dados';
import { lerSites, sitesExemplo } from './kastir';
import { mock } from './mock';
import type { ContaResp, Overview, PostResp, PostsResp, SitesResp, StoriesResp } from './types';

// Fonte dos números: Postgres (padrão quando há DATABASE_URL) ou a API do hub no n8n.
// HUB_FONTE=n8n volta para a API antiga sem mexer no código (plano B).
const usaBanco = !!process.env.DATABASE_URL && process.env.HUB_FONTE !== 'n8n';
export const modoDemo = process.env.HUB_MOCK === '1' || (!usaBanco && !process.env.HUB_API_URL);

async function chamar<T>(params: Record<string, string | undefined>, revalidar = 120): Promise<T> {
  if (modoDemo) return mock(params) as T;
  const url = new URL(process.env.HUB_API_URL!);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { 'X-Hub-Key': process.env.HUB_API_KEY || '' },
    next: { revalidate: revalidar }
  });
  if (!res.ok) throw new Error(`A API do hub respondeu ${res.status}. Confira HUB_API_URL, HUB_API_KEY e se o fluxo está ativo no n8n.`);
  return (await res.json()) as T;
}

// Cache de 60 s: a coleta roda a cada 5 min, então mais que isso só atrasaria os números.
const doBanco = <A extends unknown[], R>(nome: string, fn: (...a: A) => Promise<R>) =>
  unstable_cache(async (...a: A) => {
    try {
      return await fn(...a);
    } catch (e) {
      console.error(`[dados] ${nome}: ${(e as Error).message}`);
      throw new Error('Não foi possível ler os dados do banco. Confira DATABASE_URL e se o Neon está no ar.');
    }
  }, ['hub', nome], { revalidate: 60 });

const banco = {
  overview: doBanco('overview', dados.overview),
  posts: doBanco('posts', dados.posts),
  post: doBanco('post', dados.post),
  conta: doBanco('conta', dados.conta),
  stories: doBanco('stories', dados.stories)
};

// Sites no ar: o n8n copia o Kastir para o banco a cada 5 min; aqui fica guardado 60 s.
// Sem nenhuma leitura do n8n ainda, mostra o retrato de exemplo.
const sitesNoBanco = !!process.env.DATABASE_URL && process.env.HUB_MOCK !== '1';
const doBancoSites = unstable_cache(async (): Promise<SitesResp> => {
  try {
    return (await lerSites()) ?? sitesExemplo();
  } catch (e) {
    console.error(`[sites] ${(e as Error).message}`);
    throw new Error('Não foi possível ler as páginas do Kastir no banco. Confira DATABASE_URL e o fluxo [HUB] Kastir — páginas no n8n.');
  }
}, ['hub', 'sites'], { revalidate: 60 });

type FiltroPosts ={ mes?: string; formato?: string; ordem?: string; dir?: string; busca?: string; pagina?: string; por_pagina?: string };

export const hub = {
  overview: (mes?: string) => (usaBanco && !modoDemo ? banco.overview(mes) : chamar<Overview>({ recurso: 'overview', mes })),
  posts: (p: FiltroPosts) => (usaBanco && !modoDemo ? banco.posts(p) : chamar<PostsResp>({ recurso: 'posts', ...p })),
  post: (id: string) => (usaBanco && !modoDemo ? banco.post(id) : chamar<PostResp>({ recurso: 'post', post_id: id })),
  conta: (dias: string) => (usaBanco && !modoDemo ? banco.conta(dias) : chamar<ContaResp>({ recurso: 'conta', dias })),
  stories: (mes?: string) => (usaBanco && !modoDemo ? banco.stories(mes) : chamar<StoriesResp>({ recurso: 'stories', mes })),
  sites: (): Promise<SitesResp> => (sitesNoBanco ? doBancoSites() : Promise.resolve(sitesExemplo())),
  // Sem cache: a faixa "atualizado há..." precisa do horário real. Falha aqui não derruba a página.
  ultimaColeta: (): Promise<string | null> =>
    usaBanco && !modoDemo ? dados.ultimaColeta().catch(() => null) : Promise.resolve(null),
  // Miniatura continua no n8n: precisa do token da Meta, que só existe lá.
  thumb: (id: string): Promise<{ url?: string }> =>
    process.env.HUB_API_URL && process.env.HUB_MOCK !== '1' ? chamar<{ url?: string }>({ recurso: 'thumb', post_id: id }, 3600) : Promise.resolve({})
};
