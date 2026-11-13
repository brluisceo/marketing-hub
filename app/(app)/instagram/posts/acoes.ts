'use server';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { usuarioAtual } from '@/lib/acesso';
import { exigirBanco } from '@/lib/db';
import { PAPEL_MARCAR_PILAR, ehPilar } from '@/lib/pilares';
import { pode } from '@/lib/session';

// Marca (ou troca, ou tira) o pilar de um post. A permissão é conferida de novo aqui, no banco:
// esconder o botão na tela não basta, qualquer um pode montar o pedido na mão.
export async function marcarPilar(form: FormData): Promise<void> {
  // Volta para a mesma lista (filtros e post aberto). Só endereços da própria tela (nada de redirecionar para fora).
  const volta = String(form.get('volta') || '');
  const destino = new URL(/^\/instagram\/posts(\?|$)/.test(volta) ? volta : '/instagram/posts', 'http://hub.local');
  const post = String(form.get('post') || '');
  const valor = String(form.get('pilar') || '');

  let msg = 'pilar_salvo';
  const s = await usuarioAtual();
  if (!s || !pode(s.papel, PAPEL_MARCAR_PILAR)) msg = 'sem_permissao';
  else if (!/^\d{5,30}$/.test(post) || (valor && !ehPilar(valor))) msg = 'invalido';
  else {
    try {
      // Um comando só: grava se o post existe; se já tinha pilar, troca (e passa a contar como marcado à mão).
      const r = await exigirBanco().query(
        `INSERT INTO posts_pilares (post_id, pilar, origem, marcado_por, marcado_em)
         SELECT post_id, $2, 'manual', $3, now() FROM posts WHERE post_id = $1
         ON CONFLICT (post_id) DO UPDATE SET pilar = EXCLUDED.pilar, origem = 'manual', marcado_por = EXCLUDED.marcado_por, marcado_em = now()`,
        [post, valor || null, s.email]
      );
      if (!r.rowCount) msg = 'nao_encontrado';
      else revalidateTag('pilares');
    } catch (e) {
      console.error(`[pilares] ${post}: ${(e as Error).message}`);
      msg = 'erro';
    }
  }
  destino.searchParams.set('msg', msg);
  redirect(destino.pathname + destino.search);
}
