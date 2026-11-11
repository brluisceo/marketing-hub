'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const Icone = {
  inicio: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /></svg>,
  visao: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  posts: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="12" cy="12" r="4" /></svg>,
  stories: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" strokeDasharray="4 2.6" /><circle cx="12" cy="12" r="4.5" /></svg>,
  conta: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  acessos: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  usuarios: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.8c2.2.6 3.5 2.4 3.5 5.2" /></svg>,
  sobre: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="7.8" r="0.6" fill="currentColor" /></svg>,
  cal: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18" /></svg>,
  sites: <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" /></svg>
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
  // Celular e tablet: o menu fica escondido atrás do botão "Menu" da barra do topo.
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [path]);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('keydown', tecla);
    document.body.classList.add('menu-aberto');
    return () => { document.removeEventListener('keydown', tecla); document.body.classList.remove('menu-aberto'); };
  }, [aberto]);
  // `exato`: a visão geral de um módulo (/instagram) não acende junto com as telas dele (/instagram/posts).
  const ativo = (href: string, exato = false) => path === href || (!exato && href !== '/' && path.startsWith(href + '/'));
  // Cada módulo mostra só as próprias telas; para trocar de módulo, volta-se ao hub (Início).
  const modulo = path.split('/')[1] || '';
  const item = (href: string, label: string, icon: React.ReactNode, extra?: React.ReactNode, exato = false) => (
    <Link href={href} className={'nav-item' + (ativo(href, exato) ? ' is-active' : '')} aria-current={ativo(href, exato) ? 'page' : undefined}>
      <span className="nav-icon">{icon}</span>
      {label}
      {extra}
    </Link>
  );
  return (
    <>
    <header className="topo-movel">
      <Link href="/" className="brand brand-link"><span className="brand-mark">M</span><span>Marketing HUB</span></Link>
      <span className="spacer" />
      <button type="button" className="btn menu-btn" aria-expanded={aberto} aria-controls="menu-principal" onClick={() => setAberto(true)}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        Menu
      </button>
    </header>
    {aberto ? <div className="menu-fundo" aria-hidden="true" onClick={() => setAberto(false)} /> : null}
    <nav id="menu-principal" className={'sidebar' + (aberto ? ' is-aberto' : '')} aria-label="Menu principal">
      <div className="sidebar-topo">
        <Link href="/" className="brand brand-link"><span className="brand-mark">M</span><span>Marketing HUB</span></Link>
        <button type="button" className="btn menu-fechar" onClick={() => setAberto(false)}>
          <span className="sr-only">Fechar menu</span>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      {item('/', 'Início', Icone.inicio)}
      {modulo === 'instagram' ? (
        <>
          <span className="nav-group">Instagram</span>
          {item('/instagram', 'Visão geral', Icone.visao, undefined, true)}
          {item('/instagram/posts', 'Posts', Icone.posts)}
          {item('/instagram/stories', 'Stories', Icone.stories)}
          {item('/instagram/conta', 'Conta', Icone.conta)}
          {item('/instagram/sobre', 'Sobre', Icone.sobre)}
        </>
      ) : null}
      {modulo === 'calendario' ? (
        <>
          <span className="nav-group">Planejamento</span>
          {item('/calendario', 'Calendário e aprovação', Icone.cal)}
        </>
      ) : null}
      {modulo === 'sites' ? (
        <>
          <span className="nav-group">Sites no ar</span>
          {item('/sites', 'Landing pages', Icone.sites)}
        </>
      ) : null}
      {modulo === 'admin' && admin ? (
        <>
          <span className="nav-group">Administração</span>
          {item('/admin/usuarios', 'Usuários', Icone.usuarios)}
          {item('/admin/acessos', 'Acessos', Icone.acessos)}
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
    </>
  );
}
