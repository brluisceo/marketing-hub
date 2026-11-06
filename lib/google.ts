// Login com Google (OpenID Connect, fluxo "authorization code" com PKCE), sem bibliotecas.
import { DOMINIO, agora, b64url, deB64url, deB64urlTexto, emailDoDominio, fotoSegura } from './session';

const URL_AUTORIZACAO = 'https://accounts.google.com/o/oauth2/v2/auth';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const URL_CHAVES = 'https://www.googleapis.com/oauth2/v3/certs';
const EMISSORES = ['https://accounts.google.com', 'accounts.google.com'];
const TOLERANCIA_S = 120; // diferença de relógio aceita entre servidores

export type CodigoErro = 'dominio' | 'cancelado' | 'expirou' | 'config' | 'falha' | 'bloqueado';

export class ErroLogin extends Error {
  constructor(public codigo: CodigoErro, detalhe: string) {
    super(detalhe);
  }
}

export function configGoogle(): { id: string; segredo: string } | null {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const segredo = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return id && segredo ? { id, segredo } : null;
}

// O Google só aceita endereços de retorno cadastrados; por isso um Host falso não passa daqui.
export function urlRetorno(origem: string): string {
  return `${origem}/api/auth/callback`;
}

export function aleatorio(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function desafioPkce(verificador: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))));
}

export function urlAutorizacao(p: { clientId: string; redirectUri: string; state: string; nonce: string; desafio: string }): string {
  const u = new URL(URL_AUTORIZACAO);
  u.search = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.desafio,
    code_challenge_method: 'S256',
    hd: DOMINIO, // só sugere a conta certa na tela do Google; quem decide é validarIdToken
    prompt: 'select_account'
  }).toString();
  return u.toString();
}

export async function trocarCodigo(p: { code: string; verificador: string; redirectUri: string; clientId: string; segredo: string }): Promise<string> {
  const r = await fetch(URL_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: p.code,
      code_verifier: p.verificador,
      redirect_uri: p.redirectUri,
      client_id: p.clientId,
      client_secret: p.segredo
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000)
  });
  const corpo = (await r.json().catch(() => ({}))) as { id_token?: unknown; error?: unknown };
  if (!r.ok || typeof corpo.id_token !== 'string') {
    throw new ErroLogin('falha', `token HTTP ${r.status} ${typeof corpo.error === 'string' ? corpo.error : ''}`.trim());
  }
  return corpo.id_token;
}

// Chaves públicas do Google (trocam de tempos em tempos). Guardadas por 1 h em memória.
type Jwk = JsonWebKey & { kid?: string };
let chaves: { mapa: Map<string, Jwk>; em: number } | null = null;

async function baixarChaves(): Promise<Map<string, Jwk>> {
  const r = await fetch(URL_CHAVES, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new ErroLogin('falha', `chaves HTTP ${r.status}`);
  const { keys } = (await r.json()) as { keys?: Jwk[] };
  const mapa = new Map((keys || []).filter((k) => k.kid && k.kty === 'RSA').map((k) => [k.kid as string, k] as const));
  chaves = { mapa, em: Date.now() };
  return mapa;
}

async function chavePublica(kid: string): Promise<CryptoKey> {
  let mapa = chaves && Date.now() - chaves.em < 3_600_000 ? chaves.mapa : await baixarChaves();
  // Chave nova (rotação): busca de novo, no máximo uma vez por minuto.
  if (!mapa.has(kid) && chaves && Date.now() - chaves.em > 60_000) mapa = await baixarChaves();
  const jwk = mapa.get(kid);
  if (!jwk) throw new ErroLogin('falha', 'chave do token desconhecida');
  return crypto.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

type Claims = {
  iss?: unknown; aud?: unknown; exp?: unknown; iat?: unknown; nonce?: unknown;
  email?: unknown; email_verified?: unknown; hd?: unknown; name?: unknown; picture?: unknown;
};

export async function validarIdToken(idToken: string, clientId: string, nonceEsperado: string): Promise<{ email: string; nome: string; foto: string }> {
  const partes = idToken.split('.');
  if (partes.length !== 3) throw new ErroLogin('falha', 'token mal formado');
  const [h, p, s] = partes;

  let cabecalho: { alg?: unknown; kid?: unknown };
  let c: Claims;
  try {
    cabecalho = JSON.parse(deB64urlTexto(h));
    c = JSON.parse(deB64urlTexto(p));
  } catch {
    throw new ErroLogin('falha', 'token ilegível');
  }
  if (cabecalho.alg !== 'RS256' || typeof cabecalho.kid !== 'string') throw new ErroLogin('falha', 'algoritmo do token inesperado');

  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', await chavePublica(cabecalho.kid), deB64url(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new ErroLogin('falha', 'assinatura do token inválida');

  const t = agora();
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (typeof c.iss !== 'string' || !EMISSORES.includes(c.iss)) throw new ErroLogin('falha', 'emissor inválido');
  if (!aud.includes(clientId)) throw new ErroLogin('falha', 'token emitido para outro app');
  if (typeof c.exp !== 'number' || c.exp + TOLERANCIA_S < t) throw new ErroLogin('expirou', 'token expirado');
  if (typeof c.iat === 'number' && c.iat - TOLERANCIA_S > t) throw new ErroLogin('falha', 'token emitido no futuro');
  if (typeof c.nonce !== 'string' || c.nonce !== nonceEsperado) throw new ErroLogin('expirou', 'nonce não confere');

  // Duas checagens independentes: `hd` só vem em contas do Google Workspace da empresa
  // (uma conta Google pessoal criada com um e-mail @absgroup.com.br não tem `hd`).
  const email = typeof c.email === 'string' ? c.email.trim().toLowerCase() : '';
  if (c.email_verified !== true && c.email_verified !== 'true') throw new ErroLogin('dominio', 'e-mail não verificado');
  if (c.hd !== DOMINIO || !emailDoDominio(email)) throw new ErroLogin('dominio', `conta fora do domínio (${email.split('@')[1] || '?'})`);

  return { email, nome: typeof c.name === 'string' ? c.name.slice(0, 120) : '', foto: fotoSegura(c.picture) };
}
