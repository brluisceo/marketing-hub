import Link from 'next/link';
import { notFound } from 'next/navigation';
import Bars, { type Barra } from '@/components/Bars';
import ErroApi from '@/components/ErroApi';
import Thumb from '@/components/Thumb';
import { hub } from '@/lib/hub';
import { compacto, dataCurta, dataHora, haQuanto, nomeMes, num, pct, vezes } from '@/lib/format';
import type { Overview, Post, PostsResp } from '@/lib/types';

export const metadata = { title: 'Post · Marketing HUB' };

export default async function DetalhePost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{5,25}$/.test(id)) notFound();
  let p: Post | undefined, historico: { coletado_em: string; alcance: number }[] = [];
  let o: Overview, ranking: PostsResp;
  try {
    const r = await hub.post(id);
    if (!r.post) notFound();
    p = r.post;
    historico = r.historico || [];
    [o, ranking] = await Promise.all([hub.overview(p.mes_ref), hub.posts({ mes: p.mes_ref, ordem: 'alcance', dir: 'desc', por_pagina: '100' })]);
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith('NEXT_')) throw e;
    return <ErroApi mensagem={(e as Error).message} />;
  }
  if (!p) notFound();
  // Uma barra por dia, com a última leitura do dia: uma coleta extra no mesmo dia repetia a data no gráfico.
  const porDia = new Map<string, number>();
  for (const h of historico) porDia.set(dataCurta(h.coletado_em), h.alcance);
  const dias = [...porDia];
  const passo = dias.length <= 14 ? 1 : Math.ceil(dias.length / 10); // até 14 dias cabe o número de todos
  const evolucao: Barra[] = dias.map(([dia, alcance], i) => {
    const marcado = i % passo === 0;
    const ultimo = i === dias.length - 1;
    return { rotulo: marcado ? dia : '', valor: alcance, texto: marcado || ultimo ? compacto(alcance) : '', destaque: ultimo };
  });
  const k = o.kpis;
  const media = (campo: keyof typeof k) => (k.posts ? Number(k[campo]) / k.posts : 0);
  const posicao = ranking.itens.findIndex((x) => x.post_id === p!.post_id) + 1;
  const formato = o.por_formato.find((f) => f.formato === p!.formato);
  const cmp = (v: number, m: number) => {
    if (!m) return { t: '', c: 'neutro' };
    const r = v / m;
    return { t: r >= 1 ? `${vezes(v, m)} a média do mês` : `abaixo da média (${num(m)})`, c: r >= 1 ? 'up' : 'down' };
  };
  const metricas: [string, number, number, string?][] = [
    ['Alcance', p.alcance, media('alcance')], ['Visualizações', p.visualizacoes, media('visualizacoes')],
    ['Interações', p.interacoes, media('interacoes')], ['Engajamento', p.engajamento_pct, k.engajamento_pct, 'pct'],
    ['Curtidas', p.curtidas, media('curtidas')], ['Comentários', p.comentarios, media('comentarios')],
    ['Compartilhamentos', p.compartilhamentos, media('compartilhamentos')], ['Salvamentos', p.salvamentos, media('salvamentos')]
  ];
  const leituras: string[] = [];
  if (formato?.alcance_medio) leituras.push(`Alcançou ${vezes(p.alcance, formato.alcance_medio)} a média ${p.formato === 'Foto' ? 'das fotos' : 'dos ' + p.formato.toLowerCase() + 's'} de ${nomeMes(p.mes_ref, false)}.`);
  const fortes = metricas.slice(4).map(([l, v, m]) => [l, m ? v / m : 0] as [string, number]).sort((x, y) => y[1] - x[1]);
  if (fortes[0] && fortes[0][1] >= 1.5) leituras.push(`O ponto mais forte foi ${fortes[0][0].toLowerCase()}: ${fortes[0][1].toFixed(1).replace('.', ',')}× a média por post.`);
  leituras.push(p.engajamento_pct >= k.engajamento_pct ? 'O engajamento ficou acima da média do mês.' : 'O engajamento ficou abaixo da média do mês.');

  return (
    <>
      <header className="toolbar">
        <Link href={`/instagram/posts?mes=${p.mes_ref}`}>‹ Posts</Link>
        <span className="muted">/</span>
        <h1 className="ellipsis title-wide">{p.legenda || '(sem legenda)'}</h1>
        <span className="spacer" />
        <a href={p.permalink} target="_blank" rel="noreferrer" className="btn">Abrir no Instagram ↗</a>
      </header>
      <div className="split">
        <div className="content">
          <div className="post-head">
            <Thumb id={p.post_id} formato={p.formato} className="thumb-xl" />
            <div className="post-meta">
              <div className="pills">
                <span className="pill">{p.formato}</span>
                <span className="pill">{dataHora(p.publicado_em)}</span>
                {posicao ? <span className="pill pill-blue">{posicao}º em alcance em {nomeMes(p.mes_ref, false)}</span> : null}
              </div>
              <p className="caption">{p.legenda || '(sem legenda)'}</p>
              {p.atualizado_em ? <span className="muted">Métricas atualizadas {haQuanto(p.atualizado_em)}</span> : null}
            </div>
          </div>
          <dl className="metric-grid metric-grid-4">
            {metricas.map(([l, v, m, tipo]) => {
              const c = tipo === 'pct'
                ? { t: `${v >= m ? '+' : '−'}${Math.abs(v - m).toFixed(1).replace('.', ',')} p.p. vs. média`, c: v >= m ? 'up' : 'down' }
                : cmp(v, m);
              return (
                <div key={l}>
                  <dt>{l}</dt>
                  <dd>{tipo === 'pct' ? pct(v) : num(v)}</dd>
                  {c.t ? <span className={'delta delta-' + c.c}>{c.t}</span> : null}
                </div>
              );
            })}
          </dl>
          <section className="panel">
            <div className="panel-head"><h2>Evolução do alcance</h2><span className="muted">por dia de coleta</span></div>
            {evolucao.length >= 2 ? (
              <Bars ariaLabel="Evolução do alcance do post" dados={evolucao} />
            ) : (
              <p className="muted">A evolução aparece a partir do segundo dia de coleta deste post. O histórico é gravado todos os dias às 6h.</p>
            )}
          </section>
        </div>
        <aside className="aside" aria-label="Contexto do post">
          <div className="aside-block"><h2>Leitura</h2><p>{leituras.join(' ')}</p></div>
          <div className="aside-block">
            <h2>Contra a média de {nomeMes(p.mes_ref, false)}</h2>
            {[
              ['Alcance', p.alcance, formato?.alcance_medio || 0, `${num(p.alcance)} vs. ${num(formato?.alcance_medio)} de média ${p.formato === 'Foto' ? 'das fotos' : 'do formato'}`],
              ['Compartilhamentos', p.compartilhamentos, media('compartilhamentos'), `${num(p.compartilhamentos)} vs. ${num(media('compartilhamentos'))} por post`],
              ['Salvamentos', p.salvamentos, media('salvamentos'), `${num(p.salvamentos)} vs. ${num(media('salvamentos'))} por post`]
            ].map(([l, v, m, det]) => {
              const r = Number(m) ? Number(v) / Number(m) : 0;
              return (
                <div className="vs" key={String(l)}>
                  <div className="row-between"><span>{l}</span><span className="strong num">{r ? r.toFixed(1).replace('.', ',') + '×' : '—'}</span></div>
                  <div className="meter"><div style={{ width: `${Math.min(100, r * 50)}%` }} /></div>
                  <span className="muted small">{det}</span>
                </div>
              );
            })}
            <span className="muted small">Barra cheia = 2× a média ou mais.</span>
          </div>
        </aside>
      </div>
    </>
  );
}
