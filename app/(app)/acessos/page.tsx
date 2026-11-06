import Link from 'next/link';
import ErroApi from '@/components/ErroApi';
import Restrita from '@/components/Restrita';
import Strip from '@/components/Strip';
import { listarAcessos, type FiltroAcesso, type LinhaAcesso, type ResumoAcessos } from '@/lib/db';
import { dataHora, haQuanto, num } from '@/lib/format';
import { usuarioAtual } from '@/lib/acesso';
import { pode } from '@/lib/session';

export const metadata = { title: 'Acessos · Marketing HUB' };

const PERIODOS = [7, 30, 90] as const;
const FILTROS: [FiltroAcesso, string][] = [['todos', 'Todos'], ['ok', 'Entradas'], ['saida', 'Saídas'], ['recusados', 'Recusados']];

const MOTIVOS: Record<string, string> = {
  ok: 'Entrou',
  saida: 'Saiu',
  bloqueado: 'Acesso bloqueado',
  dominio: 'Conta fora da empresa',
  expirou: 'Login expirou',
  cancelado: 'Cancelou no Google',
  config: 'Login não configurado',
  falha: 'Falha no login'
};

// "Chrome no Mac": o suficiente para reconhecer o aparelho, sem mostrar o texto técnico inteiro.
function aparelho(ua: string | null): string {
  if (!ua) return '—';
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  return so ? `${nav} no ${so}` : nav;
}

export default async function Acessos({ searchParams }: { searchParams: Promise<{ dias?: string; filtro?: string }> }) {
  // Confere o papel atual no banco antes de qualquer consulta.
  const s = await usuarioAtual();
  if (!s || !pode(s.papel, 'admin')) return <Restrita />;

  const sp = await searchParams;
  const dias = PERIODOS.find((d) => String(d) === sp.dias) ?? 30;
  const filtro = FILTROS.find(([v]) => v === sp.filtro)?.[0] ?? 'todos';
  let itens: LinhaAcesso[], r: ResumoAcessos;
  try {
    ({ itens, resumo: r } = await listarAcessos(dias, filtro));
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const link = (d: number, f: FiltroAcesso) => `/acessos?dias=${d}&filtro=${f}`;

  return (
    <>
      <header className="toolbar">
        <h1>Acessos</h1>
        <span className="muted">Últimos {dias} dias</span>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="Resultado">
          {FILTROS.map(([v, l]) => <Link key={v} href={link(dias, v)} className={v === filtro ? 'is-on' : ''} aria-current={v === filtro ? 'true' : undefined}>{l}</Link>)}
        </div>
        <div className="seg" role="group" aria-label="Período">
          {PERIODOS.map((d) => <Link key={d} href={link(d, filtro)} className={d === dias ? 'is-on' : ''} aria-current={d === dias ? 'true' : undefined}>{d} dias</Link>)}
        </div>
      </header>
      <Strip
        itens={[
          { rotulo: 'Logins', valor: num(r.logins) },
          { rotulo: 'Pessoas', valor: num(r.pessoas) },
          { rotulo: 'Saídas', valor: num(r.saidas) },
          { rotulo: 'Tentativas recusadas', valor: num(r.recusados) },
          { rotulo: 'Último acesso', valor: r.ultimo ? haQuanto(r.ultimo) : '—' }
        ]}
      />
      <div className="content content-flush">
        {itens.length === 0 ? (
          <div className="empty"><h2>Nenhum acesso neste período</h2><p>Cada entrada e saída do hub, e cada tentativa recusada, aparece aqui na hora.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Quando</th><th>Pessoa</th><th>Papel</th><th>Resultado</th><th>Aparelho</th><th>IP</th></tr>
              </thead>
              <tbody>
                {itens.map((a) => (
                  <tr key={a.id}>
                    <td className="sub num">{dataHora(a.em)}</td>
                    <td>
                      {a.email ? (
                        <>
                          <span className="strong">{a.nome || a.email.split('@')[0]}</span>
                          <span className="muted small"> {a.email}</span>
                        </>
                      ) : <span className="muted">Não identificado</span>}
                    </td>
                    <td>{a.email ? (a.papel || 'leitor') : '—'}</td>
                    <td><span className={a.resultado === 'ok' ? 'pill pill-blue' : a.resultado === 'saida' ? 'pill' : 'pill pill-alerta'}>{MOTIVOS[a.resultado] || a.resultado}</span></td>
                    <td className="sub">{aparelho(a.navegador)}</td>
                    <td className="sub num">{a.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {itens.length === 200 ? <p className="muted small tabela-nota">Mostrando os 200 mais recentes.</p> : null}
      </div>
    </>
  );
}
