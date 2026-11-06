import { NextResponse } from 'next/server';
import { hub, modoDemo } from '@/lib/hub';

// Busca um link novo da miniatura (os links do Instagram expiram) e redireciona.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{5,25}$/.test(id) || modoDemo) return new NextResponse(null, { status: 404 });
  try {
    const r = await hub.thumb(id);
    if (!r.url || !r.url.startsWith('https://')) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(r.url, { status: 302, headers: { 'Cache-Control': 'private, max-age=3600' } });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
