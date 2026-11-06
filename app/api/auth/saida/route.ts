import { NextResponse, type NextRequest } from 'next/server';
import { registrarAcesso, situacaoDe } from '@/lib/db';
import { COOKIE, lerSessao, opcoesCookie, origemPublica } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Para onde vai quem foi bloqueado: apaga a sessão e mostra o aviso no login.
// Só desloga se o banco confirmar o bloqueio (um link de outro site não derruba ninguém).
export async function GET(req: NextRequest) {
  const origem = origemPublica(req.nextUrl.origin);
  const s = await lerSessao(req.cookies.get(COOKIE)?.value);
  const sit = s ? await situacaoDe(s.email) : null;
  if (!s || !sit?.bloqueado) return NextResponse.redirect(new URL(s ? '/' : '/login', origem), 303);
  await registrarAcesso({
    email: s.email,
    nome: s.nome,
    resultado: 'bloqueado',
    ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip'),
    navegador: req.headers.get('user-agent')
  });
  const res = NextResponse.redirect(new URL('/login?erro=bloqueado', origem), 303);
  res.cookies.set(COOKIE, '', opcoesCookie(0));
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
