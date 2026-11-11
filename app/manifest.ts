import type { MetadataRoute } from 'next';

// "Cartão de identidade" do app: é o que o celular e o computador leem ao instalar o HUB (nome, ícone, janela própria).
// Fica fora da trava de login (middleware.ts), porque o navegador pede este arquivo sem a sessão.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Marketing HUB',
    short_name: 'Marketing HUB',
    description: 'Hub do marketing do Grupo ABS: métricas, calendário e aprovação.',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Sem cantos: o Android recorta no formato do aparelho (círculo, gota...).
      { src: '/icons/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
