import Link from 'next/link';
import {
  ACAO_ROTULO, ETAPAS_VISIVEIS, ETAPA_ROTULO, FORMATOS, FORMATO_ROTULO,
  type Acao, type Endereco, type LinhaHistoricoPost, type PostPlanejado, type Visao
} from '@/lib/calendario';
import { dataHora, diaExtenso, diaMes, diaSemana, haQuanto } from '@/lib/format';
import { aprovarPost, comentar, enviarParaAprovacao, excluirPost, marcarPublicado, pedirAjustes, salvarPost } from './acoes';

type MontaLink = (e?: Endereco) => string;
type Nome = (email: string) => string;

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

const EXPLICA: Record<string, string> = {
  rascunho: 'ainda sendo preparado.',
  em_aprovacao: 'esperando Owner ou Admin.',
  ajustes: 'voltou com comentários para corrigir.',
  aprovado: 'pronto para publicar no dia marcado.',
  publicado: 'já saiu no Instagram.'
};

function Etiqueta({ p, sel, link }: { p: PostPlanejado; sel: string | null; link: MontaLink }) {
  const ativo = sel === p.id;
  return (
    <Link
      href={link({ sel: p.id })}
      scroll={false}
      className={`cal-item etapa-${p.etapa}` + (ativo ? ' is-selected' : '')}
      aria-current={ativo ? 'true' : undefined}
      title={`${p.titulo} · ${FORMATO_ROTULO[p.formato]} · ${ETAPA_ROTULO[p.etapa]}`}
    >
      <span className="cal-ponto" />
      <span className="cal-item-titulo">{p.hora ? <span className="cal-item-hora num">{p.hora} </span> : null}{p.titulo}</span>
      <span className="cal-item-extra">{FORMATO_ROTULO[p.formato]} · {ETAPA_ROTULO[p.etapa]}</span>
    </Link>
  );
}

// Grade do mês (segunda a domingo). Em blocos estreitos vira lista com só os dias que têm post (ver globals.css).
export function Grade({ dias, posts, hoje, sel, link, vazio }: { dias: { dia: string; doMes: boolean }[]; posts: PostPlanejado[]; hoje: string; sel: string | null; link: MontaLink; vazio: boolean }) {
  const porDia = new Map<string, PostPlanejado[]>();
  for (const p of posts) porDia.set(p.data, [...(porDia.get(p.data) || []), p]);
  return (
    <div className="cal">
      {vazio ? <p className="cal-vazio muted">Nenhum post planejado neste mês. Use “Novo post” para começar.</p> : null}
      <div className="cal-semana" aria-hidden="true">{SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
      <ol className="cal-grade">
        {dias.map(({ dia, doMes }) => {
          const itens = porDia.get(dia) || [];
          const cls = ['cal-dia', doMes ? '' : 'cal-fora', dia === hoje ? 'is-hoje' : '', itens.length ? 'tem-posts' : ''].filter(Boolean).join(' ');
          return (
            <li key={dia} className={cls}>
              <div className="cal-dia-topo">
                <Link href={link({ novo: dia })} scroll={false} className="cal-novo" title="Novo post neste dia">
                  <span aria-hidden="true">+</span><span className="sr-only">Novo post em {diaExtenso(dia)}</span>
                </Link>
                <span className="cal-dia-nome">{diaExtenso(dia)}{dia === hoje ? ' · hoje' : ''}</span>
                <span className="cal-num num" aria-hidden="true">{Number(dia.slice(8))}</span>
              </div>
              {itens.length ? (
                <ul className="cal-itens">{itens.map((p) => <li key={p.id}><Etiqueta p={p} sel={sel} link={link} /></li>)}</ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Quadro por etapa (kanban), só com os posts do mês.
export function Quadro({ posts, sel, link, nome }: { posts: PostPlanejado[]; sel: string | null; link: MontaLink; nome: Nome }) {
  return (
    <div className="quadro">
      {ETAPAS_VISIVEIS.map((e) => {
        const itens = posts.filter((p) => p.etapa === e);
        return (
          <section key={e} className={`quadro-col etapa-${e}`} aria-label={ETAPA_ROTULO[e]}>
            <h2><span className="cal-ponto" />{ETAPA_ROTULO[e]}<span className="muted num">{itens.length}</span></h2>
            {itens.length ? (
              <ul>
                {itens.map((p) => (
                  <li key={p.id}>
                    <Link href={link({ sel: p.id })} scroll={false} className={'quadro-card' + (sel === p.id ? ' is-selected' : '')} aria-current={sel === p.id ? 'true' : undefined}>
                      <span className="muted small">{FORMATO_ROTULO[p.formato]} · {diaSemana(p.data)} {diaMes(p.data)}{p.hora ? ` · ${p.hora}` : ''}</span>
                      <span className="strong">{p.titulo}</span>
                      <span className="muted small">{nome(p.criado_por)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="muted small quadro-vazio">Nenhum post.</p>}
          </section>
        );
      })}
    </div>
  );
}

// Campos escondidos que todo formulário do painel manda: qual post e para onde voltar.
// O campo do post não pode se chamar "id": `form.id` passaria a ser esse campo e o React
// deixaria de mandar qual botão foi clicado (o "Enviar para aprovação" virava rascunho).
function Ocultos({ id, mes, ver }: { id?: string; mes: string; ver: Visao }) {
  return (
    <>
      <input type="hidden" name="post" value={id ?? ''} />
      <input type="hidden" name="mes" value={mes} />
      <input type="hidden" name="ver" value={ver} />
    </>
  );
}

export function PainelPost({ p, acoes, aprovador, historico, nome, mes, ver, link }: {
  p: PostPlanejado; acoes: Set<Acao>; aprovador: boolean; historico: LinhaHistoricoPost[]; nome: Nome; mes: string; ver: Visao; link: MontaLink;
}) {
  const ocultos = <Ocultos id={p.id} mes={mes} ver={ver} />;
  const decide = acoes.has('aprovar') || acoes.has('ajustes');
  return (
    <>
      <div className="aside-block">
        <div className="pills">
          <span className={`pill pill-etapa etapa-${p.etapa}`}>{ETAPA_ROTULO[p.etapa]}</span>
          <span className="pill">{FORMATO_ROTULO[p.formato]}</span>
        </div>
        <h2 className="cal-titulo">{p.titulo}</h2>
        <span className="muted">{diaExtenso(p.data)}{p.hora ? ` às ${p.hora}` : ' · sem horário definido'}</span>
      </div>

      <div className="aside-actions">
        {p.arte_url ? (
          <a href={p.arte_url} target="_blank" rel="noreferrer noopener" className="btn">Abrir arte ↗</a>
        ) : <span className="muted small">Ainda sem link da arte.</span>}
      </div>

      {p.legenda ? <div className="aside-block"><h2>Legenda</h2><p className="cal-texto">{p.legenda}</p></div> : null}
      {p.observacoes ? <div className="aside-block"><h2>Observações</h2><p className="cal-texto">{p.observacoes}</p></div> : null}

      <p className="muted small">
        Criado por {nome(p.criado_por)} {haQuanto(p.criado_em)}
        {p.aprovado_por && p.aprovado_em ? ` · aprovado por ${nome(p.aprovado_por)} em ${dataHora(p.aprovado_em)}` : ''}
      </p>

      {decide ? (
        <form className="cal-form cal-decisao">
          {ocultos}
          <label className="campo">
            Comentário para quem criou
            <textarea name="texto" rows={3} maxLength={1000} placeholder={acoes.has('aprovar') ? 'Opcional para aprovar; obrigatório para pedir ajustes.' : 'O que precisa mudar?'} />
          </label>
          <div className="aside-actions">
            {acoes.has('aprovar') ? <button type="submit" formAction={aprovarPost} className="btn btn-primary">Aprovar</button> : null}
            <button type="submit" formAction={pedirAjustes} className="btn">Pedir ajustes</button>
          </div>
        </form>
      ) : p.etapa === 'em_aprovacao' && !aprovador ? (
        <p className="muted small">Aguardando Owner ou Admin aprovar.</p>
      ) : null}

      <div className="aside-actions">
        {acoes.has('enviar') ? <form action={enviarParaAprovacao}>{ocultos}<button type="submit" className="btn btn-primary">Enviar para aprovação</button></form> : null}
        {acoes.has('publicar') ? <form action={marcarPublicado}>{ocultos}<button type="submit" className="btn btn-primary">Marcar como publicado</button></form> : null}
        {acoes.has('editar') ? <Link href={link({ editar: p.id })} scroll={false} className="btn">Editar</Link> : null}
        {acoes.has('excluir') ? (
          <details className="cal-excluir">
            <summary className="btn">Excluir</summary>
            <form action={excluirPost} className="cal-confirma">
              {ocultos}
              <p className="small">O post sai do calendário. O histórico fica guardado.</p>
              <button type="submit" className="btn sair-btn btn-auto">Excluir post</button>
            </form>
          </details>
        ) : null}
      </div>

      <div className="aside-block">
        <h2>Comentários e histórico</h2>
        <ol className="cal-hist">
          {historico.map((h) => (
            <li key={h.id}>
              <span><span className="strong">{nome(h.autor)}</span> <span className="muted">{ACAO_ROTULO[h.acao] ?? h.acao}</span></span>
              <span className="muted small num">{dataHora(h.em)}</span>
              {h.texto ? <p>{h.texto}</p> : null}
            </li>
          ))}
        </ol>
        {acoes.has('comentar') ? (
          <form action={comentar} className="cal-form">
            {ocultos}
            <label className="campo">
              <span className="sr-only">Comentário</span>
              <textarea name="texto" rows={2} required maxLength={1000} placeholder="Escreva um comentário" />
            </label>
            <div className="aside-actions"><button type="submit" className="btn">Comentar</button></div>
          </form>
        ) : null}
      </div>
    </>
  );
}

// Ícones das propriedades da janela do post (16 px, traço fino, como no Notion).
const svg = (d: React.ReactNode) => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const IconeProp = {
  data: svg(<><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></>),
  formato: svg(<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  etapa: svg(<><circle cx="12" cy="12" r="9" strokeDasharray="3 2.6" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  arte: svg(<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>),
  obs: svg(<path d="M4 6h16M4 12h16M4 18h10" />),
  pessoa: svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>)
};

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : (p[0] || '?').slice(0, 2)).toUpperCase();
}

// Janela para criar ou editar um post, por cima do calendário (no estilo de uma página do Notion):
// título grande, propriedades em linhas, comentários e, abaixo da linha, a legenda como corpo da página.
// Clicar fora não fecha: sem salvamento automático, um clique errado perderia o que foi escrito.
export function JanelaPost({ p, dia, mes, ver, fechar, eu, historico, nome }: {
  p: PostPlanejado | null; dia: string; mes: string; ver: Visao; fechar: string; eu: { nome: string; email: string };
  historico: LinhaHistoricoPost[]; nome: Nome;
}) {
  // Post em aprovação ou aprovado só é salvo (continua onde está); rascunho e ajustes podem ir para aprovação.
  const podeEnviar = !p || p.etapa === 'rascunho' || p.etapa === 'ajustes';
  const comentarios = historico.filter((h) => h.texto);
  const meuNome = eu.nome || eu.email.split('@')[0];
  return (
    <>
      <div className="janela-fundo" aria-hidden="true" />
      <div className="janela" role="dialog" aria-modal="true" aria-label={p ? 'Editar post' : 'Novo post'}>
        <form action={salvarPost} className="janela-caixa">
          <Ocultos id={p?.id} mes={mes} ver={ver} />
          <div className="janela-topo">
            <Link href={fechar} scroll={false} className="janela-x" title="Fechar sem salvar">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              <span className="sr-only">Fechar sem salvar</span>
            </Link>
            <span className="janela-onde muted small">Calendário · {p ? 'Editar post' : 'Novo post'}</span>
            <span className="spacer" />
            {/* O primeiro botão é o do Enter: salvar sem enviar é o mais seguro. */}
            <button type="submit" name="enviar" value="0" className={podeEnviar ? 'btn' : 'btn btn-primary'}>{p ? 'Salvar' : 'Salvar rascunho'}</button>
            {podeEnviar ? <button type="submit" name="enviar" value="1" className="btn btn-primary">{p ? 'Salvar e enviar' : 'Enviar para aprovação'}</button> : null}
          </div>

          <div className="janela-corpo">
            <input className="janela-titulo" name="titulo" required maxLength={200} defaultValue={p?.titulo ?? ''} placeholder="Título do post" aria-label="Título do post" autoFocus={!p} />

            <div className="props">
              <div className="prop">
                <span className="prop-nome">{IconeProp.data}Data</span>
                <div className="prop-valor prop-datas">
                  <input type="date" name="data" required defaultValue={p?.data ?? dia} aria-label="Dia" />
                  <input type="time" name="hora" defaultValue={p?.hora ?? ''} aria-label="Hora (opcional)" />
                </div>
              </div>
              <label className="prop">
                <span className="prop-nome">{IconeProp.formato}Formato</span>
                <select name="formato" defaultValue={p?.formato ?? 'reels'}>{FORMATOS.map((f) => <option key={f} value={f}>{FORMATO_ROTULO[f]}</option>)}</select>
              </label>
              <div className="prop">
                <span className="prop-nome">{IconeProp.etapa}Etapa</span>
                <span className="prop-valor prop-fixo"><span className={`pill pill-etapa etapa-${p?.etapa ?? 'rascunho'}`}>{ETAPA_ROTULO[p?.etapa ?? 'rascunho']}</span></span>
              </div>
              <label className="prop">
                <span className="prop-nome">{IconeProp.arte}Arte</span>
                <input type="url" name="arte_url" inputMode="url" maxLength={1000} pattern="https://.+" title="Cole o link começando com https:// (ex.: do Google Drive)" placeholder="Cole o link do Google Drive" defaultValue={p?.arte_url ?? ''} />
              </label>
              <label className="prop">
                <span className="prop-nome">{IconeProp.obs}Observações</span>
                <textarea name="observacoes" rows={1} maxLength={2000} placeholder="Briefing, referências, quem vai publicar..." defaultValue={p?.observacoes ?? ''} />
              </label>
              <div className="prop">
                <span className="prop-nome">{IconeProp.pessoa}Criado por</span>
                <span className="prop-valor prop-fixo">{p ? `${nome(p.criado_por)} · ${haQuanto(p.criado_em)}` : meuNome}</span>
              </div>
            </div>

            <div className="janela-coments">
              <h3>Comentários</h3>
              {comentarios.length ? (
                <ol className="janela-coments-lista">
                  {comentarios.map((h) => (
                    <li key={h.id}>
                      <span className="avatar-mini" aria-hidden="true">{iniciais(nome(h.autor))}</span>
                      <div>
                        <span className="strong">{nome(h.autor)}</span> <span className="muted small">{h.acao === 'comentou' ? '' : `${ACAO_ROTULO[h.acao]} · `}{dataHora(h.em)}</span>
                        <p>{h.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
              <label className="janela-comentar">
                <span className="avatar-mini" aria-hidden="true">{iniciais(meuNome)}</span>
                <span className="sr-only">Comentário</span>
                <textarea name="comentario" rows={1} maxLength={1000} placeholder="Adicionar um comentário..." />
              </label>
            </div>

            <label className="sr-only" htmlFor="janela-legenda">Legenda</label>
            <textarea id="janela-legenda" name="legenda" className="janela-legenda" maxLength={2200} placeholder="Escreva aqui a legenda do post..." defaultValue={p?.legenda ?? ''} />
          </div>
        </form>
      </div>
    </>
  );
}

// Painel quando nenhum post está aberto: a fila de aprovação (de todos os meses) e as etapas.
export function Resumo({ pendentes, aprovador, link }: { pendentes: PostPlanejado[]; aprovador: boolean; link: MontaLink }) {
  const emAprovacao = pendentes.filter((p) => p.etapa === 'em_aprovacao');
  const ajustes = pendentes.filter((p) => p.etapa === 'ajustes');
  const lista = (itens: PostPlanejado[]) => (
    <ul className="top-list">
      {itens.map((p) => (
        <li key={p.id}>
          <Link href={link({ mes: p.data.slice(0, 7), sel: p.id })} scroll={false} className={`top-item etapa-${p.etapa}`}>
            <span className="cal-ponto" />
            <span className="ellipsis">{p.titulo}</span>
            <span className="muted small num">{diaMes(p.data)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <div className="aside-block">
        <h2>Aguardando aprovação</h2>
        {emAprovacao.length ? lista(emAprovacao) : <p className="muted">Nenhum post esperando aprovação.</p>}
        <p className="muted small">{aprovador ? 'Abra o post para aprovar ou pedir ajustes.' : 'Quem aprova: Owner e Admin.'}</p>
      </div>
      {ajustes.length ? <div className="aside-block"><h2>Com ajustes pedidos</h2>{lista(ajustes)}</div> : null}
      <div className="aside-block">
        <h2>Etapas</h2>
        <ul className="cal-etapas">
          {ETAPAS_VISIVEIS.map((e) => (
            <li key={e} className={`etapa-${e}`}><span className="cal-ponto" /><span><span className="strong">{ETAPA_ROTULO[e]}:</span> {EXPLICA[e]}</span></li>
          ))}
        </ul>
      </div>
    </>
  );
}
