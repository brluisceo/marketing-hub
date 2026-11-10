'use server';
import { redirect } from 'next/navigation';
import { usuarioAtual } from '@/lib/acesso';
import { salvarUsuario, situacaoDe } from '@/lib/db';
import { PAPEIS, pode, type Papel } from '@/lib/session';

// Regras: só owner/admin mexem; ninguém altera a si mesmo (evita se trancar fora);
// só owner promove alguém a owner ou mexe em quem já é owner.
async function aplicar(form: FormData, mudanca: (atual: Papel) => { papel?: Papel; bloqueado?: boolean } | string): Promise<never> {
  const ator = await usuarioAtual();
  if (!ator || !pode(ator.papel, 'admin')) redirect('/admin/usuarios?msg=sem_permissao');
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (email.length > 320 || !/^[a-z0-9._%+-]+@absgroup\.com\.br$/.test(email)) redirect('/admin/usuarios?msg=email_invalido');
  if (email === ator.email.toLowerCase()) redirect('/admin/usuarios?msg=proprio');
  const alvo = await situacaoDe(email);
  if (!alvo) redirect('/admin/usuarios?msg=banco');
  const m = mudanca(alvo.papel);
  if (typeof m === 'string') redirect(`/admin/usuarios?msg=${m}`);
  if ((alvo.papel === 'owner' || m.papel === 'owner') && ator.papel !== 'owner') redirect('/admin/usuarios?msg=so_owner');
  try {
    await salvarUsuario(email, m, ator.email.toLowerCase());
  } catch (e) {
    console.error(`[usuarios] não salvo: ${(e as Error).message}`);
    redirect('/admin/usuarios?msg=banco');
  }
  redirect('/admin/usuarios?msg=salvo');
}

function papelDoForm(form: FormData): Papel | null {
  const p = String(form.get('papel') || '');
  return PAPEIS.includes(p as Papel) ? (p as Papel) : null;
}

export async function alterarPapel(form: FormData) {
  await aplicar(form, () => {
    const papel = papelDoForm(form);
    return papel ? { papel } : 'papel_invalido';
  });
}

export async function alterarBloqueio(form: FormData) {
  await aplicar(form, () => ({ bloqueado: form.get('bloquear') === '1' }));
}

// Cadastrar antes do primeiro login (ou mudar o papel de quem já existe).
export async function adicionarUsuario(form: FormData) {
  await aplicar(form, () => {
    const papel = papelDoForm(form);
    return papel ? { papel, bloqueado: false } : 'papel_invalido';
  });
}
