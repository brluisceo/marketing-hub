import { NextResponse, type NextRequest } from 'next/server';
import { aleatorio, configGoogle, desafioPkce, urlAutorizacao, urlRetorno } from '@/lib/google';
import { COOKIE_OAUTH, agora, assinar, destinoSeguro, opcoesCookie, origemPublica, segredoConfigurado } from '@/lib/session';

export const dynamic = 'force-dynamic';
const VALIDADE_S = 600; // tempo para concluir o login na tela do Google

// Início do login: guarda state/nonce/PKCE num cookie assinado e manda a pessoa para o Google.
export async function GET(req: NextRequest) {
  const destino = destinoSeguro(req.nextUrl.searchParams.get('next'));
  const origem = origemPublica(req.nextUrl.origin);
  const voltar = (url: string) => NextResponse.redirect(new URL(url, origem), 303);

  // O cookie do fluxo precisa nascer no mesmo endereço que recebe o retorno do Google.
  // `r=1` evita ficar em círculo se o servidor nunca enxergar o endereço público.
  if (origem !== req.nextUrl.origin && !req.nextUrl.searchParams.has('r')) {
    return voltar(`/api/auth/google?r=1&next=${encodeURIComponent(destino)}`);
  }

  const cfg = configGoogle();
  if (!cfg || !segredoConfigurado()) return voltar(`/login?erro=config&next=${encodeURIComponent(destino)}`);

  const state = aleatorio();
  const nonce = aleatorio();
  const verificador = aleatorio(48);
  const fluxo = await assinar({ t: 'oauth', exp: agora() + VALIDADE_S, state, nonce, v: verificador, r: destino });

  const res = NextResponse.redirect(
    urlAutorizacao({ clientId: cfg.id, redirectUri: urlRetorno(origem), state, nonce, desafio: await desafioPkce(verificador) }),
    303
  );
  res.cookies.set(COOKIE_OAUTH, fluxo, opcoesCookie(VALIDADE_S, '/api/auth'));
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
