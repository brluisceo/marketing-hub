import { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import { modoDemo } from '@/lib/hub';
import { usuarioAtual } from '@/lib/acesso';
import { pode } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O middleware já garante a sessão; aqui entra o bloqueio (tira a pessoa na hora) e o papel atual.
  const s = await usuarioAtual();
  const usuario = s ? { nome: s.nome, email: s.email, foto: s.foto } : null;
  return (
    <div className="app">
      <Sidebar demo={modoDemo} usuario={usuario} admin={!!s && pode(s.papel, 'admin')} />
      <main className="main">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
