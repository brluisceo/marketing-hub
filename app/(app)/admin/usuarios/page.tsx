import ErroApi from '@/components/ErroApi';
import Restrita from '@/components/Restrita';
import { usuarioAtual } from '@/lib/acesso';
import { listarHistorico, listarUsuarios, type LinhaHistorico, type LinhaUsuario } from '@/lib/db';
import { dataHora, haQuanto } from '@/lib/format';
import { DOMINIO, PAPEIS, pode, type Papel } from '@/lib/session';
import { adicionarUsuario, alterarBloqueio, alterarPapel } from './acoes';

export const metadata = { title: 'Usuários · Marketing HUB' };

const ROTULO_PAPEL: Record<Papel, string> = { owner: 'Owner', admin: 'Admin', editor: 'Editor', leitor: 'Leitor' };

const MENSAGENS: Record<string, [string, 'ok' | 'erro']> = {
  salvo: ['Alteração salva. Vale a partir do próximo clique da pessoa no hub.', 'ok'],
  sem_permissao: ['Só owner e admin podem alterar usuários.', 'erro'],
  email_invalido: [`Use um e-mail @${DOMINIO}.`, 'erro'],
  proprio: ['Você não pode alterar o seu próprio acesso. Peça a outro owner ou admin.', 'erro'],
  so_owner: ['Só um owner pode dar o papel de owner ou alterar outro owner.', 'erro'],
  papel_invalido: ['Papel inválido.', 'erro'],
  banco: ['Não foi possível salvar agora. Tente de novo em instantes.', 'erro']
};

const ACOES: Record<string, string> = { cadastro: 'Cadastrou como', papel: 'Mudou o papel', bloqueio: 'Bloqueou o acesso', liberacao: 'Liberou o acesso' };

const nomeCurto = (email: string) => email.split('@')[0];

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const eu = await usuarioAtual();
  if (!eu || !pode(eu.papel, 'admin')) return <Restrita />;

  const sp = await searchParams;
  const msg = sp.msg && Object.hasOwn(MENSAGENS, sp.msg) ? MENSAGENS[sp.msg] : null;
  let usuarios: LinhaUsuario[], historico: LinhaHistorico[];
  try {
    [usuarios, historico] = await Promise.all([listarUsuarios(), listarHistorico(50)]);
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }
  const souOwner = eu.papel === 'owner';
  const bloqueados = usuarios.filter((u) => u.bloqueado).length;
  // Papéis que eu posso dar: admin não cria owner.
  const papeisPermitidos = PAPEIS.filter((p) => souOwner || p !== 'owner');
  const nomes = new Map(usuarios.map((u) => [u.email, u.nome || nomeCurto(u.email)]));

  return (
    <>
      <header className="toolbar">
        <h1>Usuários</h1>
        <span className="muted">{usuarios.length} pessoas{bloqueados ? ` · ${bloqueados} bloqueadas` : ''}</span>
        <span className="spacer" />
        <form action={adicionarUsuario} className="filters">
          <label className="search">
            <span className="sr-only">E-mail</span>
            <input type="email" name="email" required placeholder={`nome@${DOMINIO}`} pattern={`[^@\\s]+@${DOMINIO.replace(/\./g, '\\.')}`} />
          </label>
          <label className="inline-field">Papel
            <select name="papel" defaultValue="leitor">{papeisPermitidos.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}</select>
          </label>
          <button type="submit" className="btn">Adicionar</button>
        </form>
      </header>
      <div className="content content-flush">
        {msg ? <p className={msg[1] === 'ok' ? 'notice notice-ok' : 'notice'} role="status">{msg[0]}</p> : null}
        <p className="muted small tabela-nota">
          Qualquer pessoa com e-mail @{DOMINIO} entra como Leitor, a não ser que esteja bloqueada. Owner e Admin veem a Administração.
        </p>
        <div className="table-wrap">
          <table className="table table-cartoes">
            <thead>
              <tr><th>Pessoa</th><th>Papel</th><th>Situação</th><th>Último acesso</th><th className="r">Acesso</th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const souEu = u.email === eu.email.toLowerCase();
                const posso = !souEu && (souOwner || u.papel !== 'owner');
                return (
                  <tr key={u.email} className={u.bloqueado ? 'linha-apagada' : ''}>
                    <td>
                      <span className="strong">{u.nome || nomeCurto(u.email)}</span>
                      <span className="muted small"> {u.email}</span>
                      {souEu ? <span className="pill pill-voce">você</span> : null}
                    </td>
                    <td data-rotulo="Papel">
                      {posso ? (
                        <form action={alterarPapel} className="filters">
                          <input type="hidden" name="email" value={u.email} />
                          <label className="inline-field">
                            <span className="sr-only">Papel de {u.email}</span>
                            <select name="papel" defaultValue={u.papel}>{papeisPermitidos.map((p) => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}</select>
                          </label>
                          <button type="submit" className="btn">Salvar</button>
                        </form>
                      ) : ROTULO_PAPEL[u.papel]}
                    </td>
                    <td data-rotulo="Situação">{u.bloqueado ? <span className="pill pill-alerta">Bloqueado</span> : <span className="pill pill-blue">Ativo</span>}</td>
                    <td className="sub" data-rotulo="Último acesso">{u.ultimo_acesso ? haQuanto(u.ultimo_acesso) : 'Nunca entrou'}</td>
                    <td className="r" data-rotulo="Acesso">
                      {posso ? (
                        <form action={alterarBloqueio}>
                          <input type="hidden" name="email" value={u.email} />
                          <input type="hidden" name="bloquear" value={u.bloqueado ? '0' : '1'} />
                          <button type="submit" className={u.bloqueado ? 'btn' : 'btn sair-btn btn-auto'}>{u.bloqueado ? 'Liberar acesso' : 'Bloquear'}</button>
                        </form>
                      ) : <span className="muted small">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h2 className="secao-titulo">Histórico de alterações</h2>
        {historico.length === 0 ? (
          <p className="muted tabela-nota">Nenhuma alteração ainda.</p>
        ) : (
          <div className="table-wrap">
            <table className="table table-cartoes">
              <thead><tr><th>Quando</th><th>Quem fez</th><th>O quê</th><th>Pessoa</th></tr></thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id}>
                    <td className="sub num">{dataHora(h.em)}</td>
                    <td data-rotulo="Quem fez">{nomes.get(h.autor) || nomeCurto(h.autor)}</td>
                    <td data-rotulo="O quê">{ACOES[h.acao] || h.acao}{h.detalhe ? ` ${h.acao === 'cadastro' ? ROTULO_PAPEL[h.detalhe as Papel] || h.detalhe : `(${h.detalhe})`}` : ''}</td>
                    <td data-rotulo="Pessoa"><span>{nomes.get(h.alvo) || nomeCurto(h.alvo)} <span className="muted small">{h.alvo}</span></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
