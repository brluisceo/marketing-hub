import Link from 'next/link';
import Bars from '@/components/Bars';
import ErroApi from '@/components/ErroApi';
import Strip from '@/components/Strip';
import { hub } from '@/lib/hub';
import { compacto, dataCurta, mesAtual, num, pct } from '@/lib/format';
import type { ContaResp, Overview } from '@/lib/types';

export const metadata = { title: 'Conta · Marketing HUB' };

export default async function Conta({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sp = await searchParams;
  const dias = ['7', '30', '90'].includes(sp.dias || '') ? sp.dias! : '30';
  let c: ContaResp, o: Overview;
  try {
    [c, o] = await Promise.all([hub.conta(dias), hub.overview(mesAtual())]);
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const serie = c.serie;
  const ultimo = serie[serie.length - 1];
  const primeiro = serie[0];
  const ganho = serie.length > 1 ? ultimo.seguidores - primeiro.seguidores : null;
  const hoje = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', day: 'numeric' }).format(new Date()));
  const ritmo = hoje ? o.kpis.posts / hoje : 0;
  const ritmoAnt = o.kpis_mes_anterior.posts / 30;
  const taxaVisita = ultimo && ultimo.alcance ? (ultimo.visitas_perfil / ultimo.alcance) * 100 : 0;
  return (
    <>
      <header className="toolbar">
        <span className="avatar">RF</span>
        <h1>@rogerio.fameli</h1>
        <span className="muted">Instagram · conta profissional</span>
        <span className="spacer" />
        <nav className="seg" aria-label="Período">
          {['7', '30', '90'].map((d) => (
            <Link key={d} href={`/conta?dias=${d}`} className={d === dias ? 'is-on' : ''} aria-current={d === dias ? 'page' : undefined}>{d} dias</Link>
          ))}
        </nav>
      </header>
      <Strip
        itens={[
          { rotulo: 'Seguidores', valor: num(ultimo?.seguidores), sub: ultimo ? `em ${dataCurta(ultimo.dia + 'T12:00:00-03:00')}` : 'sem dados ainda' },
          { rotulo: `Ganho em ${dias} dias`, valor: ganho === null ? '—' : (ganho >= 0 ? '+' : '') + num(ganho), sub: ganho === null ? 'precisa de 2 dias de dados' : `${serie.length} dias com dados` },
          { rotulo: 'Alcance', valor: num(ultimo?.alcance), sub: 'contas no último dia' },
          { rotulo: 'Visualizações', valor: compacto(ultimo?.visualizacoes), sub: 'no último dia' },
          { rotulo: 'Visitas ao perfil', valor: num(ultimo?.visitas_perfil), sub: 'no último dia' }
        ]}
      />
      <div className="split">
        <div className="content">
          {serie.length < 2 ? (
            <p className="notice">A série diária da conta começou a ser gravada recentemente e vai se preenchendo a cada dia, às 6h15.</p>
          ) : null}
          <section className="panel">
            <div className="panel-head"><h2>Seguidores</h2><span className="muted">últimos {dias} dias</span></div>
            {serie.length ? <Bars ariaLabel="Seguidores por dia" mostrarValores={false} dados={serie.map((d, i, a) => ({ rotulo: i % Math.ceil(a.length / 10) === 0 ? dataCurta(d.dia + 'T12:00:00-03:00') : '', valor: d.seguidores - Math.min(...a.map((x) => x.seguidores)) + 1, destaque: i === a.length - 1 }))} /> : <p className="muted">Sem dados ainda.</p>}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Alcance diário da conta</h2><span className="muted">pessoas únicas por dia</span></div>
            {serie.length ? <Bars ariaLabel="Alcance diário da conta" mostrarValores={false} dados={serie.map((d, i, a) => ({ rotulo: i % Math.ceil(a.length / 10) === 0 ? dataCurta(d.dia + 'T12:00:00-03:00') : '', valor: d.alcance, destaque: i === a.length - 1 }))} /> : <p className="muted">Sem dados ainda.</p>}
          </section>
        </div>
        <aside className="aside" aria-label="Sobre os números">
          <div className="aside-block">
            <h2>Ritmo de publicação</h2>
            <span className="big">{ritmo.toFixed(1).replace('.', ',')} <span className="muted">posts por dia neste mês</span></span>
            <span className="muted">Mês anterior: {ritmoAnt.toFixed(1).replace('.', ',')} por dia</span>
          </div>
          {ultimo ? (
            <div className="aside-block">
              <h2>Funil do perfil (último dia)</h2>
              <div className="vs"><div className="row-between"><span>Contas alcançadas</span><span className="strong num">{num(ultimo.alcance)}</span></div><div className="meter"><div style={{ width: '100%' }} /></div></div>
              <div className="vs"><div className="row-between"><span>Visitas ao perfil</span><span className="strong num">{num(ultimo.visitas_perfil)}</span></div><div className="meter"><div style={{ width: `${Math.max(2, taxaVisita)}%` }} /></div></div>
              <span className="muted small">{pct(taxaVisita)} de quem foi alcançado visitou o perfil.</span>
            </div>
          ) : null}
          <div className="aside-block">
            <h2>Como ler</h2>
            <p>O alcance da conta conta cada pessoa uma vez por dia, mesmo que ela tenha visto vários posts. Por isso é menor que a soma do alcance dos posts.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
