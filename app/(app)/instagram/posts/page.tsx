import Link from 'next/link';
import Aviso from '@/components/Aviso';
import ErroApi from '@/components/ErroApi';
import Strip from '@/components/Strip';
import Thumb from '@/components/Thumb';
import { usuarioAtual } from '@/lib/acesso';
import { hub, modoDemo } from '@/lib/hub';
import { compacto, dataCurta, deltaPct, deltaPp, mesAtual, nomeMes, num, pct, ultimosMeses } from '@/lib/format';
import { LISTA_PILARES, PAPEL_MARCAR_PILAR, PILARES, ehPilar, nomePilar } from '@/lib/pilares';
import { pode } from '@/lib/session';
import type { Overview, PostsResp } from '@/lib/types';
import { marcarPilar } from './acoes';

export const metadata = { title: 'Posts · Marketing HUB' };

type SP = { mes?: string; formato?: string; pilar?: string; ordem?: string; dir?: string; busca?: string; pagina?: string; sel?: string; msg?: string };

const ORDENS: [string, string][] = [['publicado_em', 'Mais recentes'], ['alcance', 'Alcance'], ['engajamento_pct', 'Engajamento'], ['interacoes', 'Interações'], ['compartilhamentos', 'Compartilhamentos'], ['salvamentos', 'Salvamentos']];

const MENSAGENS: Record<string, [string, 'ok' | 'erro']> = {
  pilar_salvo: ['Pilar salvo.', 'ok'],
  sem_permissao: ['Você não tem permissão para marcar o pilar. Peça a um administrador para mudar seu papel para Editor.', 'erro'],
  invalido: ['Pilar inválido. Escolha um da lista.', 'erro'],
  nao_encontrado: ['Post não encontrado.', 'erro'],
  erro: ['Não foi possível salvar agora. Tente de novo em instantes.', 'erro']
};

export default async function Posts({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // "todos" = sem filtro de mês (útil para achar os posts sem pilar de qualquer mês).
  const todos = sp.mes === 'todos';
  const mes = todos ? 'todos' : /^\d{4}-\d{2}$/.test(sp.mes || '') ? sp.mes! : mesAtual();
  const pilar = sp.pilar === 'sem' || ehPilar(sp.pilar) ? sp.pilar : undefined;
  const ordem = ORDENS.some(([v]) => v === sp.ordem) ? sp.ordem! : 'publicado_em';
  let lista: PostsResp, o: Overview | null;
  try {
    [lista, o] = await Promise.all([
      hub.posts({ mes: todos ? undefined : mes, formato: sp.formato, pilar, ordem, dir: 'desc', busca: sp.busca, pagina: sp.pagina, por_pagina: '25' }),
      todos ? Promise.resolve(null) : hub.overview(mes)
    ]);
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const s = await usuarioAtual();
  const podeMarcar = !modoDemo && !!s && pode(s.papel, PAPEL_MARCAR_PILAR);
  const sel = lista.itens.find((p) => p.post_id === sp.sel) || lista.itens[0];
  // No celular o painel do post só abre (por cima da lista) quando a pessoa toca num post.
  const selEscolhido = !!sp.sel && sel?.post_id === sp.sel;
  const qs = (extra: Partial<SP>) => {
    const q = new URLSearchParams();
    const base: SP = { mes, formato: sp.formato, pilar, ordem, busca: sp.busca, pagina: sp.pagina, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    return `/instagram/posts?${q.toString()}`;
  };
  const paginas = Math.max(1, Math.ceil(lista.total / lista.por_pagina));
  const titulo = todos ? (pilar === 'sem' ? 'Posts sem pilar' : 'Posts de todos os meses') : `Posts de ${nomeMes(mes, false)}`;
  const msg = sp.msg && Object.hasOwn(MENSAGENS, sp.msg) ? MENSAGENS[sp.msg] : null;
  return (
    <>
      {msg ? <Aviso key={Date.now()} texto={msg[0]} tipo={msg[1]} /> : null}
      <header className="toolbar">
        <h1>{titulo}</h1>
        <span className="muted">{lista.total} posts</span>
        <span className="spacer" />
        <form className="filters" method="get" action="/instagram/posts">
          <label className="inline-field">Mês
            <select name="mes" defaultValue={mes}>
              {ultimosMeses(12).map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
              <option value="todos">Todos os meses</option>
            </select>
          </label>
          <label className="inline-field">Formato
            <select name="formato" defaultValue={sp.formato || ''}>
              <option value="">Todos</option><option>Foto</option><option>Carrossel</option><option>Reel</option><option>Vídeo</option>
            </select>
          </label>
          <label className="inline-field">Pilar
            <select name="pilar" defaultValue={pilar || ''}>
              <option value="">Todos</option>
              {LISTA_PILARES.map((p) => <option key={p} value={p}>{PILARES[p]}</option>)}
              <option value="sem">Sem pilar</option>
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
      {o ? (
        <Strip
          itens={[
            { rotulo: 'Posts', valor: num(o.kpis.posts), delta: deltaPct(o.kpis.posts, o.kpis_mes_anterior.posts) },
            { rotulo: 'Alcance', valor: compacto(o.kpis.alcance), delta: deltaPct(o.kpis.alcance, o.kpis_mes_anterior.alcance) },
            { rotulo: 'Visualizações', valor: compacto(o.kpis.visualizacoes), delta: deltaPct(o.kpis.visualizacoes, o.kpis_mes_anterior.visualizacoes) },
            { rotulo: 'Interações', valor: compacto(o.kpis.interacoes), delta: deltaPct(o.kpis.interacoes, o.kpis_mes_anterior.interacoes) },
            { rotulo: 'Engajamento', valor: pct(o.kpis.engajamento_pct), delta: deltaPp(o.kpis.engajamento_pct, o.kpis_mes_anterior.engajamento_pct) }
          ]}
        />
      ) : null}
      <div className="split">
        <div className="content content-flush">
          {lista.itens.length === 0 ? (
            <div className="empty"><h2>Nenhum post encontrado</h2><p>Troque o mês, o formato ou limpe a busca.</p><Link href={`/instagram/posts?mes=${mes}`}>Limpar filtros</Link></div>
          ) : (
            <div className="table-wrap">
              <table className={'table table-adapta' + (selEscolhido ? '' : ' sel-padrao')}>
                <thead>
                  <tr><th>Post</th><th className="so-largo">Formato</th><th className="so-largo">Pilar</th><th>Data</th><th className="r">Alcance</th><th className="r so-largo">Interações</th><th className="r so-medio">Engaj.</th></tr>
                </thead>
                <tbody>
                  {lista.itens.map((p) => {
                    const ativo = sel?.post_id === p.post_id;
                    return (
                      <tr key={p.post_id} className={ativo ? 'is-selected' : ''}>
                        <td className="col-legenda">
                          <Link href={qs({ sel: p.post_id })} scroll={false} className="row-link" aria-current={ativo ? 'true' : undefined}>
                            <Thumb id={p.post_id} className="thumb-sm" />
                            <span className="ellipsis">{p.legenda || '(sem legenda)'}</span>
                          </Link>
                        </td>
                        <td className="sub so-largo">{p.formato}</td>
                        <td className="sub so-largo col-pilar">{p.pilar === undefined ? '—' : nomePilar(p.pilar)}</td>
                        <td className="sub">{dataCurta(p.publicado_em)}</td>
                        <td className="r strong num">{num(p.alcance)}</td>
                        <td className="r num so-largo">{num(p.interacoes)}</td>
                        <td className="r num so-medio">{pct(p.engajamento_pct)}</td>
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
          <aside className={'aside aside-sel' + (selEscolhido ? ' is-aberto' : '')} aria-label="Detalhes do post">
            <div className="aside-fechar"><Link href={qs({})} scroll={false} className="btn">Fechar</Link></div>
            <Thumb id={sel.post_id} formato={sel.formato} className="thumb-lg" />
            <div className="aside-block">
              <p className="strong lead">{sel.legenda || '(sem legenda)'}</p>
              <span className="muted">{dataCurta(sel.publicado_em)} · {sel.formato}</span>
            </div>
            {sel.pilar !== undefined ? (
              <div className="aside-block">
                <h2>Pilar</h2>
                {podeMarcar ? (
                  // `key`: ao abrir outro post, a lista volta para o pilar dele (senão ficaria a escolha anterior).
                  <form action={marcarPilar} className="pilar-form" key={sel.post_id}>
                    <input type="hidden" name="post" value={sel.post_id} />
                    <input type="hidden" name="volta" value={qs({ sel: sel.post_id })} />
                    <select name="pilar" defaultValue={sel.pilar ?? ''} aria-label="Pilar do post">
                      <option value="">— Sem pilar —</option>
                      {LISTA_PILARES.map((p) => <option key={p} value={p}>{PILARES[p]}</option>)}
                    </select>
                    <button type="submit" className="btn">Salvar</button>
                  </form>
                ) : <p>{nomePilar(sel.pilar)}</p>}
                <span className="muted small">
                  {sel.pilar_origem === 'sugestao' ? 'Sugerido automaticamente pela legenda. Confira e troque se precisar.' : sel.pilar_origem === 'manual' ? 'Marcado no hub.' : 'Usado para comparar temas na tela Análises.'}
                </span>
              </div>
            ) : null}
            <dl className="metric-grid">
              {[
                ['Alcance', num(sel.alcance)], ['Visualizações', num(sel.visualizacoes)], ['Curtidas', num(sel.curtidas)], ['Comentários', num(sel.comentarios)],
                ['Compartilhamentos', num(sel.compartilhamentos)], ['Salvamentos', num(sel.salvamentos)], ['Interações', num(sel.interacoes)], ['Engajamento', pct(sel.engajamento_pct)]
              ].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
            </dl>
            <div className="aside-actions">
              <Link href={`/instagram/posts/${sel.post_id}`} className="btn btn-primary">Ver detalhes do post</Link>
              <a href={sel.permalink} target="_blank" rel="noreferrer" className="btn">Abrir no Instagram ↗</a>
            </div>
          </aside>
        ) : null}
      </div>
    </>
  );
}
