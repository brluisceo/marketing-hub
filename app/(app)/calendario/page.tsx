import Link from 'next/link';
import Aviso from '@/components/Aviso';
import ErroApi from '@/components/ErroApi';
import { usuarioAtual } from '@/lib/acesso';
import {
  acoesPermitidas, diasDaGrade, ehDia, ehId, ehMes, enderecoCalendario, historicoDoPost, lerPost, listarPendentes, listarPosts, nomesDasPessoas,
  type Acao, type Endereco, type Etapa, type LinhaHistoricoPost, type PostPlanejado, type Visao
} from '@/lib/calendario';
import { diaAtual, mesAtual, mesVizinho, nomeMes } from '@/lib/format';
import { Grade, JanelaPost, PainelPost, Quadro, Resumo } from './partes';

export const metadata = { title: 'Calendário e aprovação · Marketing HUB' };

type SP = { mes?: string; ver?: string; sel?: string; novo?: string; editar?: string; msg?: string };

const MENSAGENS: Record<string, [string, 'ok' | 'erro']> = {
  salvo: ['Rascunho salvo.', 'ok'],
  editado: ['Alterações salvas.', 'ok'],
  enviado: ['Enviado para aprovação.', 'ok'],
  aprovado: ['Post aprovado.', 'ok'],
  ajustes: ['Ajustes pedidos. O post voltou para quem criou.', 'ok'],
  publicado: ['Marcado como publicado.', 'ok'],
  excluido: ['Post excluído do calendário.', 'ok'],
  comentado: ['Comentário enviado.', 'ok'],
  sem_permissao: ['Você não tem permissão para isso. Editar ou excluir post de outra pessoa é com Owner e Admin.', 'erro'],
  nao_encontrado: ['Post não encontrado. Ele pode ter sido excluído.', 'erro'],
  mudou: ['Alguém mexeu neste post agora há pouco. Confira a etapa atual e tente de novo.', 'erro'],
  falta_texto: ['Escreva no comentário o que precisa mudar para pedir ajustes.', 'erro'],
  comentario_vazio: ['Escreva o comentário antes de enviar.', 'erro'],
  titulo: ['Dê um título ao post (até 200 caracteres).', 'erro'],
  data: ['Escolha um dia válido.', 'erro'],
  arte: ['O link da arte precisa começar com https:// (ex.: link do Google Drive).', 'erro'],
  invalido: ['Algum campo ficou fora do formato. Confira e tente de novo.', 'erro'],
  banco: ['Não foi possível salvar agora. Tente de novo em instantes.', 'erro']
};

export default async function Calendario({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // Tudo de uma vez (uma rodada só): o banco está longe e cada ida em sequência soma ~140 ms.
  const quemPromessa = usuarioAtual();
  const mes = ehMes(sp.mes) ? sp.mes : mesAtual();
  const ver: Visao = sp.ver === 'quadro' ? 'quadro' : 'calendario';
  const hoje = diaAtual();
  const dias = diasDaGrade(mes);
  const link = (e: Endereco = {}) => enderecoCalendario({ mes, ver, ...e });
  const idAberto = ehId(sp.editar) ? sp.editar : ehId(sp.sel) ? sp.sel : null;

  const dadosPromessa = Promise.all([
    // A grade mostra também os dias vizinhos (fim do mês anterior, começo do seguinte).
    listarPosts(dias[0].dia, dias[dias.length - 1].dia),
    listarPendentes(),
    idAberto ? lerPost(idAberto) : Promise.resolve(null),
    idAberto ? historicoDoPost(idAberto) : Promise.resolve([]),
    nomesDasPessoas()
  ] as const);
  dadosPromessa.catch(() => {}); // o erro é tratado abaixo; isto só evita o aviso de "erro sem tratamento" enquanto espera o usuário
  // Fora do try: se a pessoa estiver bloqueada, usuarioAtual() redireciona (e o try engoliria isso).
  const eu = await quemPromessa;
  let posts: PostPlanejado[], pendentes: PostPlanejado[], aberto: PostPlanejado | null, historico: LinhaHistoricoPost[], nomes: Map<string, string>;
  try {
    [posts, pendentes, aberto, historico, nomes] = await dadosPromessa;
    if (aberto?.etapa === 'cancelado') aberto = null;
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const nome = (email: string) => nomes.get(email) || email.split('@')[0];

  const quem = eu ? { email: eu.email.toLowerCase(), papel: eu.papel } : null;
  const acoes: Set<Acao> = aberto && quem ? acoesPermitidas(aberto, quem) : new Set();
  // Novo post: dia escolhido na grade; sem dia, hoje (se o mês for o atual) ou o dia 1 do mês que está na tela.
  const diaNovo = ehDia(sp.novo) ? sp.novo : mes === hoje.slice(0, 7) ? hoje : `${mes}-01`;
  // Criar e editar abrem numa janela por cima de tudo; atrás dela fica o painel do post aberto ou o resumo.
  const janela = sp.novo ? 'novo' : aberto && sp.editar && acoes.has('editar') ? 'editar' : null;
  const painel = aberto ? 'ver' : 'resumo';
  const sel = aberto?.id ?? null;

  const msgChave = sp.msg && Object.hasOwn(MENSAGENS, sp.msg) ? sp.msg : idAberto && !aberto ? 'nao_encontrado' : null;
  const msg = msgChave ? MENSAGENS[msgChave] : null;
  // A chave nova a cada resposta do servidor faz o aviso aparecer de novo quando a mesma mensagem se repete
  // (ex.: dois comentários seguidos), mesmo que o anterior ainda esteja na tela.
  const aviso = msg ? <Aviso key={Date.now()} texto={msg[0]} tipo={msg[1]} /> : null;

  const doMes = posts.filter((p) => p.data.startsWith(mes));
  const conta = (e: Etapa) => doMes.filter((p) => p.etapa === e).length;
  const resumo = [
    `${doMes.length} ${doMes.length === 1 ? 'post' : 'posts'}`,
    conta('em_aprovacao') ? `${conta('em_aprovacao')} aguardando aprovação` : '',
    conta('ajustes') ? `${conta('ajustes')} com ajustes pedidos` : ''
  ].filter(Boolean).join(' · ');

  const fechar = link();
  return (
    <>
      <header className="toolbar">
        <h1>{nomeMes(mes)}</h1>
        <span className="muted">{resumo}</span>
        <span className="spacer" />
        <nav className="seg" aria-label="Visualização">
          <Link href={enderecoCalendario({ mes })} className={ver === 'calendario' ? 'is-on' : ''} aria-current={ver === 'calendario' ? 'page' : undefined}>Calendário</Link>
          <Link href={enderecoCalendario({ mes, ver: 'quadro' })} className={ver === 'quadro' ? 'is-on' : ''} aria-current={ver === 'quadro' ? 'page' : undefined}>Quadro</Link>
        </nav>
        <nav className="cal-nav" aria-label="Trocar de mês">
          <Link href={link({ mes: mesVizinho(mes, -1) })} className="btn cal-seta" title="Mês anterior"><span aria-hidden="true">‹</span><span className="sr-only">Mês anterior</span></Link>
          <Link href={link({ mes: mesAtual() })} className="btn">Hoje</Link>
          <Link href={link({ mes: mesVizinho(mes, 1) })} className="btn cal-seta" title="Próximo mês"><span aria-hidden="true">›</span><span className="sr-only">Próximo mês</span></Link>
        </nav>
        <Link href={link({ novo: diaNovo })} scroll={false} className="btn btn-primary btn-novo">
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Novo post
        </Link>
      </header>
      <div className={'split split-cal' + (painel === 'resumo' ? ' split-resumo' : '')}>
        <div className="content content-flush">
          {ver === 'calendario'
            ? <Grade dias={dias} posts={posts} hoje={hoje} sel={sel} link={link} vazio={doMes.length === 0} />
            : <Quadro posts={doMes} sel={sel} link={link} nome={nome} />}
        </div>
        {painel === 'ver' && aberto ? (
          // No celular este painel abre por cima do calendário (ver .aside-sel em globals.css).
          <aside className="aside aside-sel aside-cal is-aberto" aria-label="Post do calendário">
            <div className="aside-fechar"><Link href={fechar} scroll={false} className="btn">Fechar</Link></div>
            <PainelPost p={aberto} acoes={acoes} historico={historico} nome={nome} mes={mes} ver={ver} link={link} />
          </aside>
        ) : ver === 'calendario' ? (
          // No Quadro a fila de aprovação já é a coluna "Em aprovação": as colunas ficam com a largura toda.
          <aside className="aside" aria-label="Resumo do calendário">
            <Resumo pendentes={pendentes} link={link} />
          </aside>
        ) : null}
      </div>
      {janela ? (
        <JanelaPost
          p={janela === 'editar' ? aberto : null}
          dia={diaNovo}
          mes={mes}
          ver={ver}
          fechar={janela === 'editar' && aberto ? link({ sel: aberto.id }) : fechar}
          eu={{ nome: eu?.nome ?? '', email: eu?.email ?? '' }}
          historico={janela === 'editar' ? historico : []}
          nome={nome}
        />
      ) : null}
      {aviso}
    </>
  );
}
