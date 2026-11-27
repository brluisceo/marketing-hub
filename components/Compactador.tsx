'use client';
// Tela do compactador: envia o vídeo em pedaços e acompanha a fila até poder baixar.
import { useCallback, useEffect, useRef, useState } from 'react';
import { pct, tamanhoArquivo } from '@/lib/format';
import type { Etapa, Ferramentas, Trabalho } from '@/lib/compactador';

const ETAPA: Record<Etapa, string> = {
  enviando: 'Enviando',
  na_fila: 'Na fila',
  testando: 'Testando a compressão',
  codificando: 'Compactando',
  conferindo: 'Conferindo a qualidade',
  pronto: 'Pronto',
  erro: 'Erro'
};
const ATIVAS: Etapa[] = ['enviando', 'na_fila', 'testando', 'codificando', 'conferindo'];

type Lista = { trabalhos: Trabalho[]; ferramentas: Ferramentas };
type Envio = { nome: string; enviado: number; total: number } | null;

function selo(vmaf: number | null) {
  if (vmaf === null) return 'qualidade não medida';
  if (vmaf >= 95) return 'indistinguível do original';
  if (vmaf >= 93) return 'excelente';
  return 'boa';
}

export default function Compactador() {
  const [dados, setDados] = useState<Lista | null>(null);
  const [envio, setEnvio] = useState<Envio>(null);
  const [erro, setErro] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const atualizar = useCallback(async () => {
    const r = await fetch('/api/compactar', { cache: 'no-store' });
    if (r.ok) setDados((await r.json()) as Lista);
  }, []);

  useEffect(() => { void atualizar(); }, [atualizar]);

  // Enquanto algo estiver na fila ou sendo feito, confere a cada 3 s.
  const algoAndando = !!envio || !!dados?.trabalhos.some((t) => ATIVAS.includes(t.etapa));
  useEffect(() => {
    if (!algoAndando) return;
    const i = setInterval(() => void atualizar(), 3000);
    return () => clearInterval(i);
  }, [algoAndando, atualizar]);

  async function enviar(arquivo: File) {
    setErro('');
    setEnvio({ nome: arquivo.name, enviado: 0, total: arquivo.size });
    try {
      const r = await fetch('/api/compactar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: arquivo.name, tamanho: arquivo.size }) });
      const j = (await r.json()) as { id?: string; pedaco?: number; erro?: string };
      if (!r.ok || !j.id || !j.pedaco) throw new Error(j.erro || 'Não foi possível começar o envio.');
      void atualizar();
      for (let parte = 0, ini = 0; ini < arquivo.size; parte++, ini += j.pedaco) {
        const corpo = arquivo.slice(ini, ini + j.pedaco);
        let ok = false;
        // Rede oscilou: tenta o mesmo pedaço mais 2 vezes antes de desistir.
        for (let tentativa = 0; tentativa < 3 && !ok; tentativa++) {
          const p = await fetch(`/api/compactar/${j.id}?parte=${parte}`, { method: 'PUT', body: corpo }).catch(() => null);
          ok = !!p?.ok;
          if (p && !p.ok && p.status !== 409 && p.status < 500) throw new Error(((await p.json().catch(() => ({}))) as { erro?: string }).erro || 'Falha no envio.');
        }
        if (!ok) throw new Error('A conexão caiu durante o envio. Tente de novo.');
        setEnvio({ nome: arquivo.name, enviado: Math.min(arquivo.size, ini + j.pedaco), total: arquivo.size });
      }
      const c = await fetch(`/api/compactar/${j.id}`, { method: 'POST' });
      if (!c.ok) throw new Error(((await c.json().catch(() => ({}))) as { erro?: string }).erro || 'Falha ao fechar o envio.');
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnvio(null);
      if (entrada.current) entrada.current.value = '';
      void atualizar();
    }
  }

  function escolher(lista: FileList | null) {
    const f = lista?.[0];
    if (f && !envio) void enviar(f);
  }

  const semFfmpeg = dados && !dados.ferramentas.ffmpeg;
  const bloqueado = !!envio || !!semFfmpeg;

  return (
    <div className="content compactar">
      {semFfmpeg ? <p className="notice">O servidor ainda não tem o ffmpeg instalado. Peça à equipe de hospedagem para instalar (com libvmaf).</p> : null}
      {dados?.ferramentas.ffmpeg && !dados.ferramentas.vmaf ? <p className="notice">O ffmpeg do servidor não tem o medidor de qualidade (libvmaf): os vídeos saem num nível seguro, mas a qualidade não é medida.</p> : null}
      {erro ? <p className="notice" role="alert">{erro}</p> : null}

      <label
        className={'compactar-area' + (arrastando ? ' is-arrastando' : '') + (bloqueado ? ' is-bloqueado' : '')}
        onDragOver={(e) => { e.preventDefault(); if (!bloqueado) setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); if (!bloqueado) escolher(e.dataTransfer.files); }}
      >
        <input ref={entrada} type="file" accept="video/*,.mts,.m2ts,.mxf,.mkv" className="sr-only" disabled={bloqueado} onChange={(e) => escolher(e.target.files)} />
        {envio ? (
          <>
            <span className="strong ellipsis">Enviando {envio.nome}</span>
            <span className="meter compactar-meter"><div style={{ width: `${Math.round((envio.enviado / envio.total) * 100)}%` }} /></span>
            <span className="muted small num">{tamanhoArquivo(envio.enviado)} de {tamanhoArquivo(envio.total)} · não feche esta tela até terminar o envio</span>
          </>
        ) : (
          <>
            <span className="strong">Arraste o vídeo aqui ou clique para escolher</span>
            <span className="muted small">Até 4 GB. Sai em MP4 (H.264), que abre em qualquer aparelho, com a qualidade conferida. Fica disponível por 24 horas.</span>
          </>
        )}
      </label>

      {dados && dados.trabalhos.length ? (
        <div className="table-wrap">
          <table className="table table-adapta">
            <thead>
              <tr><th>Vídeo</th><th>Situação</th><th className="r">Tamanho</th><th className="r"><span className="sr-only">Baixar</span></th></tr>
            </thead>
            <tbody>
              {dados.trabalhos.map((t) => (
                <tr key={t.id}>
                  <td data-rotulo="Vídeo"><span className="ellipsis compactar-nome" title={t.nome}>{t.nome}</span></td>
                  <td data-rotulo="Situação">
                    {t.etapa === 'pronto' ? (
                      <span>Pronto · <span className="muted">{t.vmaf !== null ? `qualidade ${t.vmaf.toFixed(1).replace('.', ',')} · ` : ''}{selo(t.vmaf)}</span></span>
                    ) : t.etapa === 'erro' ? (
                      <span className="compactar-erro">Erro · {t.erro}</span>
                    ) : (
                      <span className="compactar-andamento">
                        <span>{ETAPA[t.etapa]}{['testando', 'codificando'].includes(t.etapa) ? ` · ${Math.round(t.progresso * 100)}%` : ''}</span>
                        {['testando', 'codificando', 'conferindo'].includes(t.etapa) ? <span className="meter"><div style={{ width: `${Math.round(t.progresso * 100)}%` }} /></span> : null}
                      </span>
                    )}
                  </td>
                  <td data-rotulo="Tamanho" className="r num">
                    {t.tamanho_final ? <>{tamanhoArquivo(t.tamanho)} → <span className="strong">{tamanhoArquivo(t.tamanho_final)}</span> <span className="muted">({pct((t.tamanho_final / t.tamanho) * 100)})</span></> : tamanhoArquivo(t.tamanho)}
                  </td>
                  <td className="r">{t.etapa === 'pronto' ? <a className="btn btn-primary" href={`/api/compactar/${t.id}`} download>Baixar</a> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
