import Atualizacao from '@/components/Atualizacao';
import { hub } from '@/lib/hub';

// A faixa fala da coleta do Instagram, por isso só aparece nas telas dele (não no calendário nem na administração).
export default async function InstagramLayout({ children }: { children: React.ReactNode }) {
  const ultima = await hub.ultimaColeta();
  return (
    <>
      {ultima ? <Atualizacao ultima={ultima} agora={Date.now()} className="atualizacao-faixa" /> : null}
      {children}
    </>
  );
}
