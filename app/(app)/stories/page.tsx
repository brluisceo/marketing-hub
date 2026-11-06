import Link from 'next/link';
import ErroApi from '@/components/ErroApi';
import MonthSelect from '@/components/MonthSelect';
import Strip from '@/components/Strip';
import Thumb from '@/components/Thumb';
import { hub } from '@/lib/hub';
import { compacto, dataCurta, dataHora, deltaPct, haQuanto, mesAtual, nomeMes, num, pct } from '@/lib/format';
import type { StoriesResp } from '@/lib/types';

export const metadata = { title: 'Stories · Marketing HUB' };

export default async function Stories({ searchParams }: { searchParams: Promise<{ mes?: string; sel?: string }> }) {
  const sp = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes || '') ? sp.mes! : mesAtual();
  let r: StoriesResp;
  try {
    r = await hub.stories(mes);
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const { kpis: k, kpis_mes_anterior: a, itens } = r;
  const sel = itens.find((s) => s.story_id === sp.sel) || itens[0];
  const noAr = itens.filter((s) => s.no_ar).length;
  const nav = sel ? sel.toques_avancar + sel.toques_voltar + sel.saidas + sel.proximo_story : 0;
  const parte = (v: number) => (nav ? (v / nav) * 100 : 0);
  return (
    <>
      <header className="toolbar">
        <h1>Stories de {nomeMes(mes, false)}</h1>
        <span className="muted">{itens.length} stories{noAr ? ` · ${noAr} no ar agora` : ''}</span>
        <span className="spacer" />
        <MonthSelect valor={mes} />
      </header>
      <Strip
        itens={[
          { rotulo: 'Stories', valor: num(k.stories), delta: deltaPct(k.stories, a.stories) },
          { rotulo: 'Alcance médio', valor: compacto(k.alcance_medio), delta: deltaPct(k.alcance_medio, a.alcance_medio) },
          { rotulo: 'Visualizações', valor: compacto(k.visualizacoes), delta: deltaPct(k.visualizacoes, a.visualizacoes) },
          { rotulo: 'Respostas', valor: num(k.respostas), delta: deltaPct(k.respostas, a.respostas) },
          { rotulo: 'Visitas ao perfil', valor: num(k.visitas_perfil), delta: deltaPct(k.visitas_perfil, a.visitas_perfil) }
        ]}
      />
      <div className="split">
        <div className="content content-flush">
          {r.coleta_desde ? (
            <p className="notice">A coleta de Stories começou em {dataCurta(r.coleta_desde)}. A Meta só entrega os números enquanto o Story está no ar (24 h), por isso não há dados de antes dessa data.</p>
          ) : null}
          {itens.length === 0 ? (
            <div className="empty"><h2>Nenhum story neste mês</h2><p>Os Stories aparecem aqui até 15 minutos depois de publicados.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Story</th><th>Publicado</th><th className="r">Alcance</th><th className="r">Visualizações</th><th className="r">Respostas</th><th className="r">Saídas</th></tr>
                </thead>
                <tbody>
                  {itens.map((s) => {
                    const ativo = sel?.story_id === s.story_id;
                    return (
                      <tr key={s.story_id} className={ativo ? 'is-selected' : ''}>
                        <td>
                          <Link href={`/stories?mes=${mes}&sel=${s.story_id}`} scroll={false} className="row-link" aria-current={ativo ? 'true' : undefined}>
                            <Thumb id={s.story_id} className="thumb-sm" />
                            <span>{s.formato}</span>
                            {s.no_ar ? <span className="pill pill-blue">no ar</span> : null}
                          </Link>
                        </td>
                        <td className="sub">{dataHora(s.publicado_em)}</td>
                        <td className="r strong num">{num(s.alcance)}</td>
                        <td className="r num">{num(s.visualizacoes)}</td>
                        <td className="r num">{num(s.respostas)}</td>
                        <td className="r num">{pct(s.visualizacoes ? (s.saidas / s.visualizacoes) * 100 : 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {sel ? (
          <aside className="aside" aria-label="Detalhes do story">
            <Thumb id={sel.story_id} formato={sel.formato} className="thumb-lg" />
            <div className="aside-block">
              <span className="muted">{dataHora(sel.publicado_em)}{sel.no_ar ? ' · no ar' : ''}</span>
              {sel.atualizado_em ? <span className="muted small">Números de {haQuanto(sel.atualizado_em)}{sel.no_ar ? '' : ' (finais)'}</span> : null}
            </div>
            <dl className="metric-grid">
              {[
                ['Alcance', num(sel.alcance)], ['Visualizações', num(sel.visualizacoes)], ['Respostas', num(sel.respostas)], ['Compartilhamentos', num(sel.compartilhamentos)],
                ['Interações', num(sel.interacoes)], ['Visitas ao perfil', num(sel.visitas_perfil)], ['Novos seguidores', num(sel.seguidores_ganhos)]
              ].map(([l, v]) => <div key={l}><dt>{l}</dt><dd>{v}</dd></div>)}
            </dl>
            {nav ? (
              <div className="aside-block">
                <h2>O que as pessoas fizeram</h2>
                {([['Avançaram para o próximo', sel.toques_avancar], ['Pularam para outra conta', sel.proximo_story], ['Saíram dos Stories', sel.saidas], ['Voltaram', sel.toques_voltar]] as [string, number][]).map(([l, v]) => (
                  <div className="vs" key={l}>
                    <div className="row-between"><span>{l}</span><span className="strong num">{num(v)}</span></div>
                    <div className="meter"><div style={{ width: `${Math.max(2, parte(v))}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="aside-actions">
              {sel.no_ar ? <a href={sel.permalink} target="_blank" rel="noreferrer" className="btn">Abrir no Instagram ↗</a> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </>
  );
}
