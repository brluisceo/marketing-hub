// Quem está usando o site agora, conferido no banco a cada página (só servidor).
// O middleware só confere o cookie; aqui entram o bloqueio e a troca de papel, que valem na hora.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { situacaoDe } from './db';
import { COOKIE, lerSessao, type Sessao } from './session';

// `cache`: layout e página do mesmo pedido fazem uma consulta só.
export const usuarioAtual = cache(async (): Promise<Sessao | null> => {
  const s = await lerSessao((await cookies()).get(COOKIE)?.value);
  if (!s) return null;
  const sit = await situacaoDe(s.email);
  if (sit?.bloqueado) redirect('/api/auth/saida');
  // Banco fora do ar: segue com o papel do cookie para o site não parar.
  return sit ? { ...s, papel: sit.papel } : s;
});
