'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const Icone = {
  inicio: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /></svg>,
  visao: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  posts: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="12" cy="12" r="4" /></svg>,
  stories: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" strokeDasharray="4 2.6" /><circle cx="12" cy="12" r="4.5" /></svg>,
  conta: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  acessos: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  usuarios: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.8c2.2.6 3.5 2.4 3.5 5.2" /></svg>,
  cal: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18" /></svg>
};

type Usuario = { nome: string; email: string; foto: string };

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : (p[0] || '?').slice(0, 2)).toUpperCase();
}

function Perfil({ u }: { u: Usuario }) {
  const [fotoFalhou, setFotoFalhou] = useState(false);
  const nome = u.nome || u.email.split('@')[0];
  return (
    <div className="perfil">
      <span className="perfil-foto" aria-hidden="true">
        {iniciais(nome)}
        {u.foto && !fotoFalhou ? (
          // no-referrer: o Google às vezes recusa a foto quando recebe o endereço do site.
          <img src={u.foto} alt="" referrerPolicy="no-referrer" onError={() => setFotoFalhou(true)} />
        ) : null}
      </span>
      <span className="perfil-info">
        <span className="perfil-nome ellipsis">{nome}</span>
        <span className="perfil-email ellipsis" title={u.email}>{u.email}</span>
      </span>
    </div>
  );
}

export default function Sidebar({ demo, usuario, admin = false }: { demo: boolean; usuario: Usuario | null; admin?: boolean }) {
  const path = usePathname();
  const ativo = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const item = (href: string, label: string, icon: React.ReactNode, extra?: React.ReactNode) => (
    <Link href={href} className={'nav-item' + (ativo(href) ? ' is-active' : '')} aria-current={ativo(href) ? 'page' : undefined}>
      <span className="nav-icon">{icon}</span>
      {label}
      {extra}
    </Link>
  );
  return (
    <nav className="sidebar" aria-label="Menu principal">
      <Link href="/" className="brand brand-link"><span className="brand-mark">M</span><span>Marketing HUB</span></Link>
      {item('/', 'Início', Icone.inicio)}
      <span className="nav-group">Instagram</span>
      {item('/instagram', 'Visão geral', Icone.visao)}
      {item('/posts', 'Posts', Icone.posts)}
      {item('/stories', 'Stories', Icone.stories)}
      {item('/conta', 'Conta', Icone.conta)}
      <span className="nav-group">Planejamento</span>
      {item('/calendario', 'Calendário e aprovação', Icone.cal, <span className="nav-soon">em breve</span>)}
      {admin ? (
        <>
          <span className="nav-group">Administração</span>
          {item('/usuarios', 'Usuários', Icone.usuarios)}
          {item('/acessos', 'Acessos', Icone.acessos)}
        </>
      ) : null}
      <div className="sidebar-foot">
        {demo ? <span className="demo-tag">Modo demonstração</span> : null}
        {usuario ? <Perfil u={usuario} /> : null}
        <div className="foot-acoes">
          <Link href="/" className="btn hub-btn">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /></svg>
            Hub
          </Link>
        <form method="post" action="/api/logout" className="sair-form">
          <button type="submit" className="btn sair-btn">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></svg>
            Sair
          </button>
        </form>
        </div>
      </div>
    </nav>
  );
}
