import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Marketing HUB',
  robots: { index: false, follow: false },
  // Instalado no iPhone: nome e ícone da tela inicial (sem isso o iPhone usa o título da página, ex. "Entrar · Marketing HUB").
  appleWebApp: { capable: true, title: 'Marketing HUB', statusBarStyle: 'default' },
  icons: { apple: '/apple-touch-icon.png' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
