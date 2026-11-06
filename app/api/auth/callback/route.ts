import { NextResponse, type NextRequest } from 'next/server';
import { ErroLogin, configGoogle, trocarCodigo, urlRetorno, validarIdToken, type CodigoErro } from '@/lib/google';
import { registrarAcesso, situacaoDe } from '@/lib/db';
import { COOKIE, COOKIE_OAUTH, criarSessao, destinoSeguro, lerAssinado, opcoesCookie, origemPublica } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Fluxo = { t: 'oauth'; exp: number; state: string; nonce: string; v: string; r: string };

// Comparação em tempo constante, para não vazar o state por tempo de resposta.
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Retorno do Google: confere o state, troca o código pelo token, valida e cria a sessão.
export async function GET(req: NextRequest) {
  const origem = origemPublica(req.nextUrl.origin);
  const p = req.nextUrl.searchParams;
  const fluxo = await lerAssinado<Fluxo>(req.cookies.get(COOKIE_OAUTH)?.value, 'oauth');
  const destino = destinoSeguro(fluxo?.r);

  const responder = (url: string) => {
    const res = NextResponse.redirect(new URL(url, origem), 303);
    res.cookies.set(COOKIE_OAUTH, '', opcoesCookie(0, '/api/auth')); // o cookie do fluxo vale uma vez só
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };
  const quem = {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip'),
    navegador: req.headers.get('user-agent')
  };
  const falhar = async (codigo: CodigoErro, email?: string, nome?: string) => {
    await registrarAcesso({ email, nome, resultado: codigo, ...quem });
    return responder(`/login?erro=${codigo}&next=${encodeURIComponent(destino)}`);
  };

  const erroGoogle = p.get('error');
  if (erroGoogle) return falhar(erroGoogle === 'access_denied' ? 'cancelado' : 'falha');

  const cfg = configGoogle();
  if (!cfg) return falhar('config');

  const state = p.get('state');
  const code = p.get('code');
  if (!fluxo || !state || !code || !iguais(state, fluxo.state)) return falhar('expirou');

  try {
    const idToken = await trocarCodigo({ code, verificador: fluxo.v, redirectUri: urlRetorno(origem), clientId: cfg.id, segredo: cfg.segredo });
    const { email, nome, foto } = await validarIdToken(idToken, cfg.id, fluxo.nonce);
    // Banco fora do ar não impede o login (entra como leitor); bloqueio confirmado, sim.
    const sit = await situacaoDe(email);
    if (sit?.bloqueado) return falhar('bloqueado', email, nome);
    const { valor, maxAge } = await criarSessao(email, nome, foto, sit?.papel ?? 'leitor');
    await registrarAcesso({ email, nome, resultado: 'ok', ...quem });
    const res = responder(destino);
    res.cookies.set(COOKIE, valor, opcoesCookie(maxAge));
    return res;
  } catch (e) {
    const codigo = e instanceof ErroLogin ? e.codigo : 'falha';
    console.error(`[login] recusado (${codigo}): ${(e as Error).message}`);
    return falhar(codigo);
  }
}
