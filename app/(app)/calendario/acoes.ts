'use server';
import { redirect } from 'next/navigation';
import { usuarioAtual } from '@/lib/acesso';
import {
  FORMATOS, acoesPermitidas, comentarPost, criarPost, editarPost, ehDia, ehId, ehMes, enderecoCalendario, lerPost, mudarEtapa,
  type Acao, type AcaoHistorico, type DadosPost, type Etapa, type Formato, type Visao
} from '@/lib/calendario';

// As regras ficam em lib/calendario.ts (acoesPermitidas) e valem aqui de novo:
// o botão escondido na tela não basta, qualquer um pode montar o pedido na mão.

const FALHA = Symbol('falha');

// Erro do banco vira mensagem na tela; o `redirect` fica fora do try (ele funciona lançando um erro).
async function tentar<T>(oQue: string, fn: () => Promise<T>): Promise<T | typeof FALHA> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[calendario] ${oQue}: ${(e as Error).message}`);
    return FALHA;
  }
}

// Volta para o mesmo mês e a mesma visualização de onde a pessoa clicou.
function origem(form: FormData): { mes?: string; ver: Visao } {
  const mes = String(form.get('mes') || '');
  return { mes: ehMes(mes) ? mes : undefined, ver: form.get('ver') === 'quadro' ? 'quadro' : 'calendario' };
}

// null = vazio; false = passou do limite.
function texto(form: FormData, campo: string, max: number): string | null | false {
  const v = String(form.get(campo) ?? '').replace(/\r\n/g, '\n').trim();
  if (v.length > max) return false;
  return v || null;
}

// Só https (bloqueia javascript: e afins) e sem usuário/senha embutidos.
function linkSeguro(v: string): string | null {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}

function lerDados(form: FormData): DadosPost | string {
  const titulo = texto(form, 'titulo', 200);
  if (!titulo) return 'titulo';
  const formato = String(form.get('formato') || '');
  if (!FORMATOS.includes(formato as Formato)) return 'invalido';
  const data = String(form.get('data') || '');
  if (!ehDia(data)) return 'data';
  const hora = String(form.get('hora') || '');
  if (hora && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora)) return 'invalido';
  const arte = texto(form, 'arte_url', 1000);
  if (arte === false) return 'arte';
  const arteUrl = arte ? linkSeguro(arte) : null;
  if (arte && !arteUrl) return 'arte';
  const legenda = texto(form, 'legenda', 2200);
  const observacoes = texto(form, 'observacoes', 2000);
  if (legenda === false || observacoes === false) return 'invalido';
  return { titulo, formato: formato as Formato, data, hora: hora ? hora.slice(0, 5) : null, legenda, arte_url: arteUrl, observacoes };
}

// Quem está clicando e qual post (conferido no banco agora, não no que a tela mostrava).
// As duas consultas vão juntas (uma ida ao banco em vez de duas).
async function carregar(form: FormData) {
  const volta = origem(form);
  const id = String(form.get('post') || '');
  if (!ehId(id)) redirect(enderecoCalendario({ ...volta, msg: 'nao_encontrado' }));
  const [s, p] = await Promise.all([usuarioAtual(), tentar('leitura', () => lerPost(id))]);
  if (!s) redirect('/login');
  if (p === FALHA) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'banco' }));
  if (!p || p.etapa === 'cancelado') redirect(enderecoCalendario({ ...volta, msg: 'nao_encontrado' }));
  return { ator: { email: s.email.toLowerCase(), papel: s.papel }, volta, id, p };
}

export async function salvarPost(form: FormData) {
  const volta = origem(form);
  const id = String(form.get('post') || '');
  const enviar = form.get('enviar') === '1';
  const dados = lerDados(form);
  if (typeof dados === 'string') redirect(enderecoCalendario({ ...volta, ...(id ? { editar: id } : { novo: '1' }), msg: dados }));
  const comentario = texto(form, 'comentario', 1000);
  if (comentario === false) redirect(enderecoCalendario({ ...volta, ...(id ? { editar: id } : { novo: '1' }), msg: 'invalido' }));

  if (!id) {
    // Qualquer pessoa logada pode criar.
    const s = await usuarioAtual();
    if (!s) redirect('/login');
    const novoId = await tentar('criar', () => criarPost(dados, s.email.toLowerCase(), enviar, comentario));
    if (novoId === FALHA) redirect(enderecoCalendario({ ...volta, novo: dados.data, msg: 'banco' }));
    redirect(enderecoCalendario({ mes: dados.data.slice(0, 7), ver: volta.ver, sel: novoId, msg: enviar ? 'enviado' : 'salvo' }));
  }

  const { ator, p } = await carregar(form);
  const pode = acoesPermitidas(p, ator);
  if (!pode.has('editar')) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'sem_permissao' }));
  const eEnviar = enviar && pode.has('enviar');
  const ok = await tentar('editar', () => editarPost(id, p.etapa, dados, ator.email, eEnviar, comentario));
  if (ok === FALHA) redirect(enderecoCalendario({ ...volta, editar: id, msg: 'banco' }));
  redirect(enderecoCalendario({ mes: dados.data.slice(0, 7), ver: volta.ver, sel: id, msg: !ok ? 'mudou' : eEnviar ? 'enviado' : 'editado' }));
}

async function transicao(form: FormData, acao: Acao, para: Etapa, historico: AcaoHistorico, msgOk: string, textoObrigatorio = false): Promise<never> {
  const { ator, volta, id, p } = await carregar(form);
  if (!acoesPermitidas(p, ator).has(acao)) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'sem_permissao' }));
  const t = texto(form, 'texto', 1000);
  if (t === false || (textoObrigatorio && !t)) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'falta_texto' }));
  const ok = await tentar(acao, () => mudarEtapa(id, p.etapa, para, ator.email, historico, t));
  if (ok === FALHA) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'banco' }));
  // Excluído some da tela: volta para o calendário sem painel aberto.
  redirect(enderecoCalendario({ ...volta, sel: para === 'cancelado' && ok ? undefined : id, msg: ok ? msgOk : 'mudou' }));
}

export async function enviarParaAprovacao(form: FormData) {
  await transicao(form, 'enviar', 'em_aprovacao', 'enviou', 'enviado');
}

export async function aprovarPost(form: FormData) {
  await transicao(form, 'aprovar', 'aprovado', 'aprovou', 'aprovado');
}

export async function pedirAjustes(form: FormData) {
  await transicao(form, 'ajustes', 'ajustes', 'ajustes', 'ajustes', true);
}

export async function marcarPublicado(form: FormData) {
  await transicao(form, 'publicar', 'publicado', 'publicou', 'publicado');
}

export async function excluirPost(form: FormData) {
  await transicao(form, 'excluir', 'cancelado', 'excluiu', 'excluido');
}

export async function comentar(form: FormData) {
  const { ator, volta, id, p } = await carregar(form);
  if (!acoesPermitidas(p, ator).has('comentar')) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'sem_permissao' }));
  const t = texto(form, 'texto', 1000);
  if (!t) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'comentario_vazio' }));
  const ok = await tentar('comentar', () => comentarPost(id, ator.email, t));
  if (ok === FALHA) redirect(enderecoCalendario({ ...volta, sel: id, msg: 'banco' }));
  redirect(enderecoCalendario({ ...volta, sel: id, msg: ok ? 'comentado' : 'nao_encontrado' }));
}
