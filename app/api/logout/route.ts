import { NextResponse, type NextRequest } from 'next/server';
import { registrarAcesso } from '@/lib/db';
import { COOKIE, lerSessao, opcoesCookie, origemPublica } from '@/lib/session';

export async function POST(req: NextRequest) {
  // Só aceita o "Sair" vindo do próprio site (outro site não consegue deslogar a pessoa).
  const origem = origemPublica(req.nextUrl.origin);
  const veioDe = req.headers.get('origin');
  if (veioDe && veioDe !== origem && veioDe !== req.nextUrl.origin) return new NextResponse(null, { status: 403 });
  const s = await lerSessao(req.cookies.get(COOKIE)?.value);
  if (s) {
    await registrarAcesso({
      email: s.email,
      nome: s.nome,
      resultado: 'saida',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip'),
      navegador: req.headers.get('user-agent')
    });
  }
  const res = NextResponse.redirect(new URL('/login?saiu=1', origem), 303);
  res.cookies.set(COOKIE, '', opcoesCookie(0));
  return res;
}
