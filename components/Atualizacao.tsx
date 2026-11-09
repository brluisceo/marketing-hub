'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const CICLO = 5 * 60_000; // coleta de posts e Stories no n8n
const FOLGA = 45_000; // tempo para a coleta terminar e gravar no banco
const ATRASADA = 15 * 60_000; // 3 coletas sem registro

// "Dados atualizados há X min · próxima atualização em Y min". Quando passa da hora da próxima coleta,
// pede a página de novo ao servidor (sem recarregar) até chegar um horário novo.
export default function Atualizacao({ ultima, agora: agoraServidor, className = '' }: { ultima: string; agora: number; className?: string }) {
  const router = useRouter();
  const [agora, setAgora] = useState(agoraServidor);
  const pedidoEm = useRef(0);

  const passou = Math.max(0, agora - new Date(ultima).getTime());
  const falta = CICLO - passou;
  const atrasada = passou > ATRASADA;

  useEffect(() => {
    const tique = () => {
      const t = Date.now();
      setAgora(t);
      const p = t - new Date(ultima).getTime();
      if (document.hidden || p < CICLO + FOLGA) return;
      // Coleta atrasada: tenta a cada 5 min; esperando a próxima: a cada 1 min.
      if (t - pedidoEm.current < (p > ATRASADA ? CICLO : 60_000)) return;
      pedidoEm.current = t;
      router.refresh();
    };
    tique();
    const id = setInterval(tique, 15_000);
    return () => clearInterval(id);
  }, [ultima, router]);

  // Conta a partir de `agora` (e não de Date.now()) para o texto do servidor e do navegador baterem.
  const minutos = Math.floor(passou / 60_000);
  const quando = minutos < 1 ? 'agora há pouco' : minutos < 60 ? `há ${minutos} min` : `há ${Math.round(minutos / 60)} h`;
  let proxima: string;
  if (atrasada) proxima = 'a coleta está atrasada';
  else if (falta <= 0) proxima = 'atualizando…';
  else proxima = `próxima atualização em ${Math.ceil(falta / 60_000)} min`;

  return (
    <p className={`atualizacao ${className}`}>
      <span className={`hub-ponto ${atrasada ? 'hub-ponto-laranja' : 'hub-ponto-verde'}`} aria-hidden="true" />
      <span>
        {atrasada ? 'Última atualização' : 'Dados atualizados'} {quando}
        <span className="atualizacao-sep" aria-hidden="true"> · </span>
        <span className="atualizacao-proxima">{proxima}</span>
      </span>
    </p>
  );
}
