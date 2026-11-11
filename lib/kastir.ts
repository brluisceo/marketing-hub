// Sites no ar: landing pages do Kastir (o sistema de lp.contadorceo.com.br). Só no servidor.
// Quem lê o Kastir é o n8n (fluxo "[HUB] Kastir — páginas", a cada 5 min, com o login de uma pessoa);
// o site só lê do banco o que ele gravou. Antes da primeira coleta, mostra o retrato de lib/mock-sites.ts.
import { exigirBanco } from './db';
import { exemploKastir } from './mock-sites';
import type { SitesResp } from './types';

// Formato que o Kastir devolve (só os campos usados no retrato de exemplo).
export type KPagina = { id: string; title: string; slug: string; status: string; folderId: string | null; publishedAt: string | null };
export type KPasta = { id: string; name: string; color: string | null };
export type KBruto = { origem: string; inicialId: string | null; paginas: KPagina[]; pastas: KPasta[] };

const SITE = 'https://lp.contadorceo.com.br';
// A cor vai direto para o CSS da tela: só aceita #rgb/#rrggbb.
const cor = (c: string | null) => (c && /^#[0-9a-f]{3,8}$/i.test(c) ? c : null);

// Só as páginas no ar: rascunho, mesmo que já tenha sido publicado, manda para a página inicial.
export function montar(b: KBruto): SitesResp {
  const paginas = b.paginas
    .filter((p) => p.status === 'PUBLISHED')
    .map((p) => {
      const inicial = p.id === b.inicialId;
      return { id: p.id, titulo: p.title, url: inicial ? `${b.origem}/` : `${b.origem}/${p.slug}`, pasta_id: p.folderId, publicada_em: p.publishedAt };
    });
  const pastas = b.pastas.map((f) => ({ id: f.id, nome: f.name, cor: cor(f.color) }));
  return { site: b.origem, paginas, pastas, gerado_em: new Date().toISOString() };
}

export const sitesExemplo = (): SitesResp => ({ ...montar(exemploKastir), exemplo: true });

type LinhaPagina = { id: string; titulo: string; site: string; slug: string; inicial: boolean; pasta_id: string | null; publicada_em: Date | null };

// null = o n8n ainda não leu o Kastir nenhuma vez.
export async function lerSites(): Promise<SitesResp | null> {
  const db = exigirBanco();
  // Tudo junto: cada consulta leva ~140 ms de ida e volta até o banco.
  const [pags, pastas, ult] = await Promise.all([
    db.query<LinhaPagina>(`SELECT pagina_id AS id, titulo, site, slug, inicial, pasta_id, publicada_em FROM sites_paginas WHERE situacao = 'no_ar'`),
    db.query<{ id: string; nome: string; cor: string | null }>(`SELECT pasta_id AS id, nome, cor FROM sites_pastas`),
    db.query<{ em: Date | null }>(`SELECT max(iniciado_em) AS em FROM sync_log WHERE fluxo = 'kastir_sites' AND status LIKE 'ok%'`)
  ]);
  const em = ult.rows[0]?.em;
  if (!em) return null;
  const site = pags.rows[0]?.site || SITE;
  return {
    site,
    paginas: pags.rows.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      url: p.inicial ? `${p.site}/` : `${p.site}/${p.slug}`,
      pasta_id: p.pasta_id,
      publicada_em: p.publicada_em ? new Date(p.publicada_em).toISOString() : null
    })),
    pastas: pastas.rows.map((f) => ({ id: f.id, nome: f.nome, cor: cor(f.cor) })),
    gerado_em: new Date(em).toISOString()
  };
}
