import Link from 'next/link';
import ErroApi from '@/components/ErroApi';
import Strip from '@/components/Strip';
import Thumb from '@/components/Thumb';
import { hub } from '@/lib/hub';
import { compacto, dataCurta, deltaPct, deltaPp, mesAtual, nomeMes, num, pct, ultimosMeses } from '@/lib/format';
import type { Overview, PostsResp } from '@/lib/types';

export const metadata = { title: 'Posts · Marketing HUB' };

type SP = { mes?: string; formato?: string; ordem?: string; dir?: string; busca?: string; pagina?: string; sel?: string };

const ORDENS: [string, string][] = [['publicado_em', 'Mais recentes'], ['alcance', 'Alcance'], ['engajamento_pct', 'Engajamento'], ['interacoes', 'Interações'], ['compartilhamentos', 'Compartilhamentos'], ['salvamentos', 'Salvamentos']];

export default async function Posts({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes || '') ? sp.mes! : mesAtual();
  const ordem = ORDENS.some(([v]) => v === sp.ordem) ? sp.ordem! : 'publicado_em';
  let lista: PostsResp, o: Overview;
  try {
    [lista, o] = await Promise.all([
      hub.posts({ mes, formato: sp.formato, ordem, dir: 'desc', busca: sp.busca, pagina: sp.pagina, por_pagina: '25' }),
      hub.overview(mes)
    ]);
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const sel = lista.itens.find((p) => p.post_id === sp.sel) || lista.itens[0];
  const qs = (extra: Partial<SP>) => {
    const q = new URLSearchParams();
    const base: SP = { mes, formato: sp.formato, ordem, busca: sp.busca, pagina: sp.pagina, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    return `/posts?${q.toString()}`;
  };
  const paginas = Math.max(1, Math.ceil(lista.total / lista.por_pagina));
  const { kpis: k, kpis_mes_anterior: a } = o;
  return (
    <>
      <header className="toolbar">
        <h1>Posts de {nomeMes(mes, false)}</h1>
        <span className="muted">{lista.total} posts</span>
        <span className="spacer" />
        <form className="filters" method="get" action="/posts">
          <label className="inline-field">Mês
            <select name="mes" defaultValue={mes}>{ultimosMeses(12).map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}</select>
          </label>
          <label className="inline-field">Formato
            <select name="formato" defaultValue={sp.formato || ''}>
              <option value="">Todos</option><option>Foto</option><option>Carrossel</option><option>Reel</option><option>Vídeo</option>
            </select>
          </label>
          <label className="inline-field">Ordenar
            <select name="ordem" defaultValue={ordem}>{ORDENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="search">
            <span className="sr-only">Buscar na legenda</span>
            <input type="search" name="busca" placeholder="Buscar na legenda" defaultValue={sp.busca || ''} />
          </label>
          <button type="submit" className="btn">Aplicar</button>
        </form>
      </header>
      <Strip
        itens={[
          { rotulo: 'Posts', valor: num(k.posts), delta: deltaPct(k.posts, a.posts) },
          { rotulo: 'Alcance', valor: compacto(k.alcance), delta: deltaPct(k.alcance, a.alcance) },
          { rotulo: 'Visualizações', valor: compacto(k.visualizacoes), delta: deltaPct(k.visualizacoes, a.visualizacoes) },
          { rotulo: 'Interações', valor: compacto(k.interacoes), delta: deltaPct(k.interacoes, a.interacoes) },
          { rotulo: 'Engajamento', valor: pct(k.engajamento_pct), delta: deltaPp(k.engajamento_pct, a.engajamento_pct) }
        ]}
      />
      <div className="split">
        <div className="content content-flush">
          {lista.itens.length === 0 ? (
            <div className="empty"><h2>Nenhum post encontrado</h2><p>Troque o mês, o formato ou limpe a busca.</p><Link href={`/posts?mes=${mes}`}>Limpar filtros</Link></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Post</th><th>Formato</th><th>Data</th><th className="r">Alcance</th><th className="r">Interações</th><th className="r">Engaj.</th></tr>
                </thead>
                <tbody>
                  {lista.itens.map((p) => {
                    const ativo = sel?.post_id === p.post_id;
                    return (
                      <tr key={p.post_id} className={ativo ? 'is-selected' : ''}>
                        <td>
                          <Link href={qs({ sel: p.post_id })} scroll={false} className="row-link" aria-current={ativo ? 'true' : undefined}>
                            <Thumb id={p.post_id} className="thumb-sm" />
                            <span className="ellipsis">{p.legenda || '(sem legenda)'}</span>
                          </Link>
                        </td>
                        <td className="sub">{p.formato}</td>
                        <td className="sub">{dataCurta(p.publicado_em)}</td>
                        <td className="r strong num">{num(p.alcance)}</td>
                        <td className="r num">{num(p.interacoes)}</td>
                        <td className="r num">{pct(p.engajamento_pct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {paginas > 1 ? (
            <nav className="pager" aria-label="Páginas">
              <span className="muted">Página {lista.pagina} de {paginas}</span>
              {lista.pagina > 1 ? <Link className="btn" href={qs({ pagina: String(lista.pagina - 1) })}>Anterior</Link> : null}
              {lista.pagina < paginas ? <Link className="btn" href={qs({ pagina: String(lista.pagina + 1) })}>Próxima</Link> : null}
            </nav>
          ) : null}
        </div>
        {sel ? (
          <aside className="aside" aria-label="Detalhes do post">
            <Thumb id={sel.post_id} formato={sel.formato} className="thumb-lg" />
            <div className="aside-block">
              <p className="strong lead">{sel.legenda || '(sem legenda)'}</p>
              <span className="muted">{dataCurta(sel.publicado_em)} · {sel.formato}</span>
            </div>
            <dl className="metric-grid">
              {[
                ['Alcance', num(sel.alcance)], ['Visualizações', num(sel.visualizacoes)], ['Curtidas', num(sel.curtidas)], ['Comentários', num(sel.comentarios)],
                ['Compartilhamentos', num(sel.compartilhamentos)], ['Salvamentos', num(sel.salvamentos)], ['Interações', num(sel.interacoes)], ['Engajamento', pct(sel.engajamento_pct)]
              ].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
            </dl>
            <div className="aside-actions">
              <Link href={`/posts/${sel.post_id}`} className="btn btn-primary">Ver detalhes do post</Link>
              <a href={sel.permalink} target="_blank" rel="noreferrer" className="btn">Abrir no Instagram ↗</a>
            </div>
          </aside>
        ) : null}
      </div>
    </>
  );
}
