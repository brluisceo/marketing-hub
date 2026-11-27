// Compactador de vídeos: recebe os pedaços do envio (PUT ?parte=N), fecha o envio (POST)
// e entrega o vídeo pronto (GET). Só a pessoa que enviou acessa o próprio vídeo.
import { Readable } from 'node:stream';
import { NextResponse, type NextRequest } from 'next/server';
import { usuarioAtual } from '@/lib/acesso';
import { arquivoParaBaixar, concluirEnvio, ler, receberPedaco, type Trabalho } from '@/lib/compactador';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

async function trabalhoDaPessoa(ctx: Ctx): Promise<Trabalho | NextResponse> {
  const s = await usuarioAtual();
  if (!s) return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  const t = await ler((await ctx.params).id);
  if (!t || t.dono !== s.email) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });
  return t;
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const t = await trabalhoDaPessoa(ctx);
  if (t instanceof NextResponse) return t;
  const parte = Number(req.nextUrl.searchParams.get('parte'));
  if (!Number.isInteger(parte) || parte < 0) return NextResponse.json({ erro: 'parte_invalida' }, { status: 400 });
  const erro = await receberPedaco(t, parte, new Uint8Array(await req.arrayBuffer()));
  return erro ? NextResponse.json({ erro }, { status: 409 }) : NextResponse.json({ ok: true });
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  const t = await trabalhoDaPessoa(ctx);
  if (t instanceof NextResponse) return t;
  const erro = await concluirEnvio(t);
  return erro ? NextResponse.json({ erro }, { status: 409 }) : NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const t = await trabalhoDaPessoa(ctx);
  if (t instanceof NextResponse) return t;
  if (t.etapa !== 'pronto' || !t.tamanho_final) return NextResponse.json({ erro: 'ainda_nao_pronto' }, { status: 409 });
  const base = t.nome.replace(/\.[^.]+$/, '');
  const nome = `${base}_compactado.mp4`;
  const ascii = nome.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return new Response(Readable.toWeb(arquivoParaBaixar(t)) as ReadableStream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(t.tamanho_final),
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      'Cache-Control': 'private, no-store'
    }
  });
}
