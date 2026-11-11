'use client';
import { useEffect, useState } from 'react';

// Pedido de instalação do Chrome no Android: guardado para abrir pelo nosso botão (não vem nos tipos do TypeScript).
type PedidoInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const IconeCompartilhar = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" /></svg>
);

// Convite na tela de login para pôr o HUB na tela inicial do celular. A página só mostra isto no celular
// (pelo navegador informado); aqui ele some quando a pessoa já está dentro do app instalado.
export default function InstalarApp({ plataforma }: { plataforma: 'ios' | 'android' }) {
  const [instalado, setInstalado] = useState(false);
  const [pedido, setPedido] = useState<PedidoInstalacao | null>(null);

  useEffect(() => {
    const noApp = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (noApp) setInstalado(true);
    const aoPoderInstalar = (e: Event) => { e.preventDefault(); setPedido(e as PedidoInstalacao); };
    const aoInstalar = () => setInstalado(true);
    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  async function instalar() {
    if (!pedido) return;
    await pedido.prompt();
    const { outcome } = await pedido.userChoice;
    setPedido(null); // o Chrome só deixa usar o pedido uma vez
    if (outcome === 'accepted') setInstalado(true);
  }

  if (instalado) return null;
  return (
    <section className="login-app" aria-label="Instalar o HUB no celular">
      <span className="login-app-icone" aria-hidden="true">M</span>
      <div className="login-app-texto">
        <strong>Use o HUB como app</strong>
        {plataforma === 'ios' ? (
          <p>Toque em <b>⋯</b> ou em Compartilhar {IconeCompartilhar} e escolha <b>Adicionar à Tela de Início</b>.</p>
        ) : pedido ? (
          <p>Abre direto da tela inicial, em tela cheia.</p>
        ) : (
          <p>No menu <b>⋮</b> do navegador, toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>
        )}
      </div>
      {plataforma === 'android' && pedido && (
        <button type="button" className="login-app-btn" onClick={instalar}>Instalar</button>
      )}
    </section>
  );
}
