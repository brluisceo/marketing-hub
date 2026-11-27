import Compactador from '@/components/Compactador';

export const metadata = { title: 'Compactar vídeo · Marketing HUB' };

// Qualquer pessoa logada usa (decisão do usuário em 27/11/2026). Cada um vê só os próprios vídeos.
export default function CompactarVideo() {
  return (
    <>
      <header className="toolbar">
        <h1>Compactar vídeo</h1>
        <span className="muted">Deixa o vídeo bem menor sem perder qualidade visível</span>
      </header>
      <Compactador />
    </>
  );
}
