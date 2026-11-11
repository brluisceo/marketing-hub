'use client';
import { useEffect, useState } from 'react';

// Erro costuma ter mais texto e pede atenção: fica mais tempo na tela.
const DURACAO = { ok: 4000, erro: 8000 };
const SAIDA = 200; // tempo da animação de saída (igual ao do CSS)

// Aviso flutuante no topo (depois de salvar, aprovar, excluir...): fica por cima de tudo, sem empurrar a página,
// some sozinho depois de alguns segundos (espera enquanto o mouse está em cima) e tem X para fechar antes.
export default function Aviso({ texto, tipo }: { texto: string; tipo: 'ok' | 'erro' }) {
  const [fase, setFase] = useState<'aberto' | 'saindo' | 'fechado'>('aberto');
  const [pausado, setPausado] = useState(false);

  // Tira o ?msg= do endereço sem pedir a página de novo: recarregar não mostra o aviso outra vez.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('msg')) return;
    url.searchParams.delete('msg');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => {
    if (fase === 'fechado' || (fase === 'aberto' && pausado)) return;
    const t = setTimeout(() => setFase(fase === 'aberto' ? 'saindo' : 'fechado'), fase === 'aberto' ? DURACAO[tipo] : SAIDA);
    return () => clearTimeout(t);
  }, [fase, pausado, tipo]);

  if (fase === 'fechado') return null;
  return (
    <div
      className={`aviso aviso-${tipo}${fase === 'saindo' ? ' is-saindo' : ''}`}
      role={tipo === 'erro' ? 'alert' : 'status'}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <span className="aviso-icone" aria-hidden="true">
        {tipo === 'ok'
          ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          : '!'}
      </span>
      <p>{texto}</p>
      <button type="button" className="aviso-x" onClick={() => setFase('saindo')} title="Fechar">
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        <span className="sr-only">Fechar aviso</span>
      </button>
    </div>
  );
}
