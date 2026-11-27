import Link from 'next/link';
import { hub, modoDemo } from '@/lib/hub';
import { compacto, dataExtensa, deltaPct, deltaPp, mesAtual, nomeMes, num, pct, saudacao, type Delta } from '@/lib/format';
import { COLETAS, STATUS_ROTULO, avisos, type Aviso, type Status } from '@/lib/modulos';
import { usuarioAtual } from '@/lib/acesso';
import { pode } from '@/lib/session';
import type { Overview, SitesResp } from '@/lib/types';

export const metadata = { title: 'Início · Marketing HUB' };

const Icone = {
  instagram: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>,
  trafego: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3 3 10.5l7 2.5 2.5 7L21 3z" /><path d="m10 13 4-4" /></svg>,
  sites: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" /></svg>,
  calendario: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>,
  entregaveis: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>,
  video: <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="14" height="14" rx="2.5" /><path d="m16.5 10 5-3v10l-5-3" /><path d="m7 10 2.5 2.5L7 15" /></svg>,
  busca: <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
};

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : (p[0] || '?').slice(0, 2)).toUpperCase();
}

function Selo({ status }: { status: Status | 'erro' }) {
  return <span className={`hub-selo hub-selo-${status}`}>{status === 'erro' ? 'Sem conexão' : STATUS_ROTULO[status]}</span>;
}

function Variacao({ d }: { d: Delta }) {
  return d.texto ? <span className={`delta delta-${d.tom}`}>{d.texto}</span> : null;
}

function CardModulo({ cor, icone, titulo, status, href, children }: { cor: string; icone: React.ReactNode; titulo: string; status: Status | 'erro'; href?: string; children: React.ReactNode }) {
  const cabeca = (
    <div className="hub-card-head">
      <span className={`hub-icone hub-icone-${cor}`}>{icone}</span>
      <h2>{titulo}</h2>
      <span className="spacer" />
      <Selo status={status} />
    </div>
  );
  return (
    <section className={'hub-card' + (href ? ' hub-card-clicavel' : '')}>
      {href ? <Link href={href} className="hub-card-link hub-esticado">{cabeca}</Link> : cabeca}
      {children}
    </section>
  );
}

function CardInstagram({ o, erro }: { o: Overview | null; erro: string }) {
  if (!o) {
    return (
      <section className="hub-card hub-card-ig hub-card-clicavel">
        <div className="hub-card-head">
          <span className="hub-icone hub-icone-ig">{Icone.instagram}</span>
          <div className="hub-card-titulo"><h2>Instagram</h2><span className="muted">@rogerio.fameli · métricas dos posts</span></div>
          <span className="spacer" />
          <Selo status="erro" />
        </div>
        <p className="hub-texto">Não foi possível carregar os números agora. {erro}</p>
        <Link href="/instagram" className="hub-mais hub-esticado">Abrir métricas do Instagram ›</Link>
      </section>
    );
  }
  const { kpis: k, kpis_mes_anterior: a } = o;
  const serie = o.serie_12_meses;
  const max = Math.max(1, ...serie.map((m) => m.posts));
  // Mês em andamento contra mês fechado sempre parece queda; nas somas só comparamos meses completos.
  const parcial = o.mes === mesAtual();
  const semDelta: Delta = { texto: '', tom: 'neutro' };
  return (
    <section className="hub-card hub-card-ig hub-card-clicavel">
      <div className="hub-card-head">
        <span className="hub-icone hub-icone-ig">{Icone.instagram}</span>
        <div className="hub-card-titulo"><h2>Instagram</h2><span className="muted">@rogerio.fameli · métricas dos posts</span></div>
        <span className="spacer" />
        <Selo status="ativo" />
      </div>
      <div className="hub-ig-corpo">
        <dl className="hub-kpis">
          <div><dt>Posts em {nomeMes(o.mes, false)}</dt><dd className="num">{num(k.posts)} <Variacao d={parcial ? semDelta : deltaPct(k.posts, a.posts)} /></dd></div>
          <div><dt>Alcance</dt><dd className="num">{compacto(k.alcance)} <Variacao d={parcial ? semDelta : deltaPct(k.alcance, a.alcance)} /></dd></div>
          <div><dt>Engajamento</dt><dd className="num">{pct(k.engajamento_pct)} <Variacao d={deltaPp(k.engajamento_pct, a.engajamento_pct)} /></dd></div>
          <div><dt>Seguidores</dt><dd className="num">{num(o.conta.seguidores)}</dd></div>
        </dl>
        <div className="hub-mini-barras" role="img" aria-label="Posts por mês nos últimos 12 meses">
          {serie.map((m, i) => (
            <span key={m.mes} className={i === serie.length - 1 ? 'is-hi' : ''} style={{ height: `${Math.max(8, Math.round((m.posts / max) * 100))}%` }} />
          ))}
        </div>
      </div>
      <Link href="/instagram" className="hub-mais hub-esticado">Abrir métricas do Instagram ›</Link>
    </section>
  );
}

function CardSites({ r }: { r: SitesResp | null }) {
  return (
    <CardModulo cor="verde" icone={Icone.sites} titulo="Sites no ar" status={r ? 'ativo' : 'erro'} href="/sites">
      <p className="hub-texto">As landing pages no ar e de qual campanha é cada uma.</p>
      <ul className="hub-sites">
        <li>
          <span className={`hub-ponto ${r ? 'hub-ponto-verde' : 'hub-ponto-cinza'}`} />
          <span className="ellipsis">{r ? r.site.replace(/^https?:\/\//, '') : 'lp.contadorceo.com.br'}</span>
          <span className="spacer" />
          <span className="muted small">{r ? `${num(r.paginas.length)} páginas no ar` : 'sem conexão'}</span>
        </li>
      </ul>
    </CardModulo>
  );
}

export default async function Inicio() {
  const s = await usuarioAtual();
  const nome = s?.nome || s?.email.split('@')[0] || '';
  const primeiroNome = nome.split(/\s+/)[0];
  const mes = mesAtual();

  // Instagram e Kastir juntos: se um falhar, o cartão dele mostra "Sem conexão" e o resto abre igual.
  const [ig, st] = await Promise.allSettled([hub.overview(mes), hub.sites()]);
  const o: Overview | null = ig.status === 'fulfilled' ? ig.value : null;
  const erro = ig.status === 'rejected' ? (ig.reason as Error).message : '';
  const sites: SitesResp | null = st.status === 'fulfilled' ? st.value : null;

  const lista: Aviso[] = [];
  if (modoDemo) lista.push({ titulo: 'Modo demonstração ligado', texto: 'Os números do Instagram são de exemplo. Configure a API do HUB para ver os dados reais.', tom: 'laranja' });
  else if (!o) lista.push({ titulo: 'API do HUB sem resposta', texto: 'O fluxo [HUB] API do hub no n8n pode estar desativado ou com a chave diferente.', tom: 'laranja' });
  if (sites?.exemplo) lista.push({ titulo: 'Sites no ar com dados de exemplo', texto: 'Falta a chave de leitura do Kastir. Até ela chegar, o módulo mostra um retrato de 11/11/2026.', tom: 'laranja' });
  else if (!sites) lista.push({ titulo: 'Kastir sem resposta', texto: 'Não foi possível ler as landing pages agora. Confira a chave do Kastir no servidor.', tom: 'laranja' });
  lista.push(...avisos(nomeMes(mes, false)));

  return (
    <div className="hub">
      <span className="login-bolha login-bolha-1" aria-hidden="true" />
      <span className="login-bolha login-bolha-2" aria-hidden="true" />
      <span className="login-bolha login-bolha-3" aria-hidden="true" />

      <header className="hub-topo">
        <div className="hub-largura hub-topo-dentro">
          <Link href="/" className="brand hub-brand"><span className="brand-mark">M</span><span>Marketing HUB</span></Link>
          <span className="spacer" />
          {/* Por enquanto a busca procura nas legendas dos posts. */}
          <form action="/instagram/posts" method="get" className="hub-busca" role="search">
            {Icone.busca}
            <label className="sr-only" htmlFor="hub-busca">Buscar</label>
            <input id="hub-busca" type="search" name="busca" placeholder="Buscar posts, campanhas, sites..." />
          </form>
          <details className="hub-conta">
            <summary aria-label="Minha conta">
              <span className="hub-avatar">
                {iniciais(nome)}
                {s?.foto ? <img src={s.foto} alt="" referrerPolicy="no-referrer" /> : null}
              </span>
            </summary>
            <div className="hub-conta-menu">
              <span className="strong ellipsis">{nome}</span>
              <span className="muted small ellipsis">{s?.email}</span>
              {s && pode(s.papel, 'admin') ? <Link href="/admin/usuarios" className="btn hub-conta-link">Administração</Link> : null}
              <form method="post" action="/api/logout"><button type="submit" className="btn sair-btn">Sair</button></form>
            </div>
          </details>
        </div>
      </header>

      <div className="hub-largura hub-corpo">
        <div className="hub-ola">
          <span className="hub-data">{dataExtensa()}</span>
          <h1>{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ''}.</h1>
          <p>Tudo do marketing do Grupo ABS, num só lugar.</p>
        </div>

        <div className="hub-grade">
          <div className="hub-principal">
            <CardInstagram o={o} erro={erro} />
            <div className="hub-par">
              <CardModulo cor="laranja" icone={Icone.trafego} titulo="Tráfego pago" status="implantacao">
                <p className="hub-texto">Investimento no Meta Ads e o que ele virou no funil: leads, reuniões, vendas e retorno.</p>
              </CardModulo>
              <CardSites r={sites} />
              <CardModulo cor="vermelho" icone={Icone.calendario} titulo="Calendário e aprovação" status="ativo" href="/calendario">
                <p className="hub-texto">Planejar os posts do mês, aprovar e receber o aviso para publicar pelo app.</p>
              </CardModulo>
              <CardModulo cor="roxo" icone={Icone.entregaveis} titulo="Entregáveis" status="em_breve">
                <p className="hub-texto">As peças da equipe: o que foi pedido, o que está em produção e o que já foi entregue.</p>
              </CardModulo>
              <CardModulo cor="azul" icone={Icone.video} titulo="Compactar vídeo" status="ativo" href="/compactar">
                <p className="hub-texto">Deixa o vídeo bem menor sem perder qualidade visível, em MP4 que abre em qualquer aparelho.</p>
              </CardModulo>
            </div>
          </div>

          <aside className="hub-lateral">
            <section className="hub-card hub-card-lista">
              <h2>Precisa da sua atenção</h2>
              <ul className="hub-avisos">
                {lista.map((x) => (
                  <li key={x.titulo}>
                    <span className={`hub-ponto hub-ponto-${x.tom}`} />
                    <div><span className="strong">{x.titulo}</span><p>{x.texto}</p></div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="hub-card hub-card-lista">
              <h2>Coletas de dados</h2>
              <ul className="hub-coletas">
                {COLETAS.map((c) => (
                  <li key={c.nome}>
                    <span className={`hub-ponto ${c.ligada && (c.fonte === 'sites' ? sites && !sites.exemplo : o) ? 'hub-ponto-verde' : 'hub-ponto-cinza'}`} />
                    <span>{c.nome}</span>
                    <span className="spacer" />
                    <span className="muted small">{c.frequencia}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
