// Sessão e cookies assinados com HMAC. Só usa WebCrypto, então funciona no middleware e nas rotas.
export const COOKIE = 'mh_sessao';
export const COOKIE_OAUTH = 'mh_oauth';
export const DOMINIO = 'absgroup.com.br';
// 7 dias: quem sai da empresa perde o acesso no máximo nesse prazo (o cookie não sabe da conta Google).
const DURACAO_S = 60 * 60 * 24 * 7;

// Do mais forte ao mais fraco. O papel é lido do banco no login e fica no cookie até expirar.
export const PAPEIS = ['owner', 'admin', 'editor', 'leitor'] as const;
export type Papel = (typeof PAPEIS)[number];

export function papelValido(v: unknown): Papel {
  return PAPEIS.includes(v as Papel) ? (v as Papel) : 'leitor';
}

// Ex.: pode(s.papel, 'admin') é verdadeiro para owner e admin.
export function pode(papel: Papel, minimo: Papel): boolean {
  return PAPEIS.indexOf(papel) <= PAPEIS.indexOf(minimo);
}

export type Sessao = { email: string; nome: string; foto: string; papel: Papel; exp: number };
// O campo `t` impede usar um cookie assinado de um tipo no lugar do outro.
type Assinado = { t: 'sessao' | 'oauth'; exp: number };

const enc = new TextEncoder();
const dec = new TextDecoder();

export function segredoConfigurado(): boolean {
  return (process.env.AUTH_SECRET || '').length >= 32;
}

async function chave(): Promise<CryptoKey> {
  if (!segredoConfigurado()) throw new Error('Defina AUTH_SECRET com pelo menos 32 caracteres.');
  return crypto.subtle.importKey('raw', enc.encode(process.env.AUTH_SECRET as string), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// Endereço público do site. APP_URL vale mais que o endereço do pedido, que atrás de proxy
// ou em 127.0.0.1 pode vir errado (e o Google exige o endereço de retorno exato).
export function origemPublica(origemPedido: string): string {
  try {
    const u = new URL(process.env.APP_URL || '');
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.origin;
  } catch {}
  return origemPedido;
}

export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function deB64url(txt: string): Uint8Array {
  const bin = atob(txt.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (txt.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function deB64urlTexto(txt: string): string {
  return dec.decode(deB64url(txt));
}

export const agora = () => Math.floor(Date.now() / 1000);

export async function assinar(dados: Assinado & Record<string, unknown>): Promise<string> {
  const corpo = b64url(enc.encode(JSON.stringify(dados)));
  const assinatura = new Uint8Array(await crypto.subtle.sign('HMAC', await chave(), enc.encode(corpo)));
  return `${corpo}.${b64url(assinatura)}`;
}

export async function lerAssinado<T extends Assinado>(valor: string | undefined, tipo: T['t']): Promise<T | null> {
  if (!valor || valor.length > 4096 || !/^[\w-]+\.[\w-]+$/.test(valor)) return null;
  const [corpo, assinatura] = valor.split('.');
  try {
    if (!(await crypto.subtle.verify('HMAC', await chave(), deB64url(assinatura), enc.encode(corpo)))) return null;
    const dados = JSON.parse(deB64urlTexto(corpo)) as T;
    if (dados?.t !== tipo || typeof dados.exp !== 'number' || dados.exp < agora()) return null;
    return dados;
  } catch {
    return null;
  }
}

export function emailDoDominio(email: string): boolean {
  return email.toLowerCase().endsWith('@' + DOMINIO);
}

// Só aceita foto servida pelo Google (evita que o cookie aponte o <img> para outro site).
export function fotoSegura(v: unknown): string {
  if (typeof v !== 'string' || v.length > 1024) return '';
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && u.hostname.endsWith('.googleusercontent.com') ? u.toString() : '';
  } catch {
    return '';
  }
}

export async function criarSessao(email: string, nome: string, foto = '', papel: Papel = 'leitor'): Promise<{ valor: string; maxAge: number }> {
  const valor = await assinar({ t: 'sessao', email, nome, foto: fotoSegura(foto), papel: papelValido(papel), exp: agora() + DURACAO_S });
  return { valor, maxAge: DURACAO_S };
}

export async function lerSessao(valor?: string): Promise<Sessao | null> {
  const s = await lerAssinado<Sessao & Assinado>(valor, 'sessao');
  if (!s || typeof s.email !== 'string' || !emailDoDominio(s.email)) return null;
  return { email: s.email, nome: typeof s.nome === 'string' ? s.nome : '', foto: fotoSegura(s.foto), papel: papelValido(s.papel), exp: s.exp };
}

export function opcoesCookie(maxAge: number, path = '/') {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path, maxAge };
}

// Só aceita caminho interno ("/posts?mes=..."): bloqueia "//site.com", "/\site.com" e caracteres de controle.
export function destinoSeguro(v: string | null | undefined): string {
  const s = typeof v === 'string' ? v : '';
  if (s.length > 512 || !/^\/(?![/\\])[^\\\u0000-\u001f\u007f]*$/.test(s)) return '/';
  if (/^\/(login|api\/auth|api\/logout)(\/|\?|$)/.test(s)) return '/';
  return s;
}
