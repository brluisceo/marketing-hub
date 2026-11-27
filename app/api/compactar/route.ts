// Compactador de vídeos: lista os vídeos da pessoa e começa um envio novo.
import { NextResponse, type NextRequest } from 'next/server';
import { usuarioAtual } from '@/lib/acesso';
import { PEDACO, conferirFerramentas, iniciar, listarDe } from '@/lib/compactador';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const s = await usuarioAtual();
  if (!s) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  const [trabalhos, ferramentas] = await Promise.all([listarDe(s.email), conferirFerramentas()]);
  return NextResponse.json({ trabalhos, ferramentas, pedaco: PEDACO });
}

export async function POST(req: NextRequest) {
  const s = await usuarioAtual();
  if (!s) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  const tf = await conferirFerramentas();
  if (!tf.ffmpeg) return NextResponse.json({ erro: 'O servidor ainda não tem o ffmpeg instalado.' }, { status: 503 });
  const corpo = (await req.json().catch(() => null)) as { nome?: unknown; tamanho?: unknown } | null;
  const nome = typeof corpo?.nome === 'string' ? corpo.nome : '';
  const tamanho = typeof corpo?.tamanho === 'number' ? corpo.tamanho : 0;
  const r = await iniciar(s.email, nome, tamanho);
  if (typeof r === 'string') return NextResponse.json({ erro: r }, { status: 400 });
  return NextResponse.json({ id: r.id, pedaco: PEDACO });
}
