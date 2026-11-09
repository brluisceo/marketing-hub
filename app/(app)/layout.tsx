import { Suspense } from 'react';
import Atualizacao from '@/components/Atualizacao';
import Sidebar from '@/components/Sidebar';
import { hub, modoDemo } from '@/lib/hub';
import { usuarioAtual } from '@/lib/acesso';
import { pode } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O middleware já garante a sessão; aqui entra o bloqueio (tira a pessoa na hora) e o papel atual.
  const [s, ultima] = await Promise.all([usuarioAtual(), hub.ultimaColeta()]);
  const usuario = s ? { nome: s.nome, email: s.email, foto: s.foto } : null;
  return (
    <div className="app">
      <Sidebar demo={modoDemo} usuario={usuario} admin={!!s && pode(s.papel, 'admin')} />
      <main className="main">
        {ultima ? <Atualizacao ultima={ultima} agora={Date.now()} className="atualizacao-faixa" /> : null}
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
