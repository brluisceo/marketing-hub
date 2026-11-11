import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, lerSessao } from './lib/session';

export async function middleware(req: NextRequest) {
  if (await lerSessao(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Ícones e manifesto do app ficam livres: o celular os pede sem a sessão (na tela de login e ao instalar).
  matcher: ['/((?!login|api/auth/|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|apple-touch-icon|icons/).*)']
};
