import Link from 'next/link';
import Bars from '@/components/Bars';
import ErroApi from '@/components/ErroApi';
import MonthSelect from '@/components/MonthSelect';
import Strip from '@/components/Strip';
import Thumb from '@/components/Thumb';
import { hub } from '@/lib/hub';
import { compacto, deltaPct, deltaPp, mesAtual, mesCurto, nomeMes, num, pct } from '@/lib/format';
import type { Overview } from '@/lib/types';

export const metadata = { title: 'Instagram · Marketing HUB' };

function leitura(o: Overview): string {
  const { kpis: k, kpis_mes_anterior: a } = o;
  const partes: string[] = [];
  if (a.posts && a.alcance) {
    const dp = Math.round(((k.posts - a.posts) / a.posts) * 100);
    const da = Math.round(((k.alcance - a.alcance) / a.alcance) * 100);
    const ant = nomeMes(o.mes_anterior, false);
    if (dp > 0 && da < 0) partes.push(`${dp}% mais posts que ${ant}, mas ${Math.abs(da)}% menos alcance.`);
    else if (dp < 0 && da > 0) partes.push(`${Math.abs(dp)}% menos posts que ${ant}, com ${da}% mais alcance.`);
    else partes.push(`Posts ${dp >= 0 ? '+' : ''}${dp}% e alcance ${da >= 0 ? '+' : ''}${da}% em relação a ${ant}.`);
  }
  const f = [...o.por_formato].filter((x) => x.posts >= 3).sort((x, y) => y.alcance_medio - x.alcance_medio);
  if (f.length >= 2 && f[f.length - 1].alcance_medio) {
    const r = (f[0].alcance_medio / f[f.length - 1].alcance_medio).toFixed(1).replace('.', ',');
    partes.push(`${f[0].formato === 'Foto' ? 'Fotos' : f[0].formato + 's'} alcançaram em média ${r}× mais pessoas que ${f[f.length - 1].formato === 'Foto' ? 'fotos' : f[f.length - 1].formato.toLowerCase() + 's'}.`);
  }
  return partes.join(' ');
}

export default async function VisaoGeral({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes || '') ? sp.mes! : mesAtual();
  let o: Overview;
  try {
    o = await hub.overview(mes);
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const { kpis: k, kpis_mes_anterior: a } = o;
  return (
    <>
      <header className="toolbar">
        <h1>Visão geral</h1>
        <span className="muted">@rogerio.fameli</span>
        <span className="spacer" />
        <MonthSelect valor={mes} />
      </header>
      <Strip
        itens={[
          { rotulo: 'Posts', valor: num(k.posts), delta: deltaPct(k.posts, a.posts) },
          { rotulo: 'Alcance', valor: compacto(k.alcance), delta: deltaPct(k.alcance, a.alcance) },
          { rotulo: 'Visualizações', valor: compacto(k.visualizacoes), delta: deltaPct(k.visualizacoes, a.visualizacoes) },
          { rotulo: 'Interações', valor: compacto(k.interacoes), delta: deltaPct(k.interacoes, a.interacoes) },
          { rotulo: 'Engajamento', valor: pct(k.engajamento_pct), delta: deltaPp(k.engajamento_pct, a.engajamento_pct) },
          { rotulo: 'Seguidores', valor: num(o.conta.seguidores) }
        ]}
      />
      <div className="split">
        <div className="content">
          <section className="panel">
            <div className="panel-head"><h2>Posts por mês</h2><span className="muted">últimos 12 meses</span></div>
            <Bars ariaLabel="Posts por mês nos últimos 12 meses" dados={o.serie_12_meses.map((m, i, arr) => ({ rotulo: mesCurto(m.mes), valor: m.posts, destaque: i === arr.length - 1 }))} />
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Alcance por mês</h2><span className="muted">soma dos posts</span></div>
            <Bars ariaLabel="Alcance somado dos posts por mês" dados={o.serie_12_meses.map((m, i, arr) => ({ rotulo: mesCurto(m.mes), valor: m.alcance, texto: compacto(m.alcance), destaque: i === arr.length - 1 }))} />
          </section>
        </div>
        <aside className="aside" aria-label="Resumo do mês">
          <div className="aside-block">
            <h2>Leitura do mês</h2>
            <p>{leitura(o) || 'Sem dados suficientes para comparar com o mês anterior.'}</p>
          </div>
          <div className="aside-block">
            <h2>Por formato</h2>
            <table className="mini-table">
              <thead><tr><th>Formato</th><th className="r">Posts</th><th className="r">Alcance médio</th></tr></thead>
              <tbody>
                {o.por_formato.map((f) => (
                  <tr key={f.formato}><td className="strong">{f.formato}</td><td className="r">{f.posts}</td><td className="r strong">{num(f.alcance_medio)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="aside-block">
            <div className="row-between"><h2>Destaques</h2><Link href={`/instagram/posts?mes=${mes}&ordem=alcance`}>Ver todos</Link></div>
            <ul className="top-list">
              {o.top_posts.map((p) => (
                <li key={p.post_id}>
                  <Link href={`/instagram/posts/${p.post_id}`} className="top-item">
                    <Thumb id={p.post_id} className="thumb-sm" />
                    <span className="ellipsis">{p.legenda || '(sem legenda)'}</span>
                    <span className="strong num">{num(p.alcance)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
