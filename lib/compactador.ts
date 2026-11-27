// Compactador de vídeos (só servidor). Mesma lógica do compactar.py testado em 27/11/2026:
// testa níveis de compressão em 3 trechos, mede a qualidade com VMAF e usa o mais compacto
// que ainda fica indistinguível do original (VMAF 95). Sai em H.264 + AAC, que abre em qualquer aparelho.
// Precisa do ffmpeg (com libvmaf) instalado no servidor. Os arquivos ficam no disco, não no banco:
// cada vídeo é uma pasta com estado.json; o original some ao terminar e o resultado some em 24 h.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const PEDACO = 8 * 1024 * 1024; // envio em pedaços de 8 MB (o middleware do Next corta corpos acima de 10 MB)
export const TAMANHO_MAX = 4 * 1024 * 1024 * 1024;
const GUARDAR_MS = 24 * 3600 * 1000;
const ENVIO_ABANDONADO_MS = 6 * 3600 * 1000;
const VMAF_ALVO = 95;
const EXTENSOES = ['.mp4', '.mov', '.m4v', '.mkv', '.avi', '.mts', '.m2ts', '.webm', '.mxf'];

const PASTA = process.env.COMPACTADOR_DIR || path.join(os.tmpdir(), 'marketing-hub-compactador');
const THREADS = Math.max(1, os.cpus().length);

export type Etapa = 'enviando' | 'na_fila' | 'testando' | 'codificando' | 'conferindo' | 'pronto' | 'erro';

export type Trabalho = {
  id: string;
  dono: string;
  nome: string;
  extensao: string;
  tamanho: number;
  criado_em: string;
  etapa: Etapa;
  progresso: number; // 0 a 1 dentro da etapa
  crf: number | null;
  tamanho_final: number | null;
  vmaf: number | null;
  vmaf_pior: number | null;
  erro: string | null;
  terminado_em: string | null;
};

// ---------------------------------------------------------------- disco

const pastaDe = (id: string) => path.join(PASTA, id);
const estadoDe = (id: string) => path.join(pastaDe(id), 'estado.json');
export const originalDe = (t: Trabalho) => path.join(pastaDe(t.id), 'original' + t.extensao);
export const saidaDe = (t: Trabalho) => path.join(pastaDe(t.id), 'saida.mp4');
const idValido = (id: string) => /^[0-9a-f-]{36}$/.test(id);

export async function ler(id: string): Promise<Trabalho | null> {
  if (!idValido(id)) return null;
  try {
    return JSON.parse(await fs.readFile(estadoDe(id), 'utf8')) as Trabalho;
  } catch {
    return null;
  }
}

async function gravar(t: Trabalho) {
  // Nome temporário único: o progresso grava sem esperar, e duas gravações não podem usar o mesmo arquivo.
  const tmp = `${estadoDe(t.id)}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(t));
  await fs.rename(tmp, estadoDe(t.id));
}

async function todos(): Promise<Trabalho[]> {
  let ids: string[] = [];
  try {
    ids = await fs.readdir(PASTA);
  } catch {
    return [];
  }
  const lista = await Promise.all(ids.map(ler));
  return lista.filter((t): t is Trabalho => !!t).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
}

async function apagar(id: string) {
  await fs.rm(pastaDe(id), { recursive: true, force: true });
}

// Tira o que passou de 24 h depois de pronto e envios largados no meio.
async function limpar(lista: Trabalho[]) {
  const agora = Date.now();
  const velhos = lista.filter((t) =>
    (t.terminado_em && agora - Date.parse(t.terminado_em) > GUARDAR_MS) ||
    (t.etapa === 'enviando' && agora - Date.parse(t.criado_em) > ENVIO_ABANDONADO_MS));
  await Promise.all(velhos.map((t) => apagar(t.id)));
  return lista.filter((t) => !velhos.includes(t));
}

export async function listarDe(email: string): Promise<Trabalho[]> {
  const lista = await limpar(await todos());
  garantirFila();
  return lista.filter((t) => t.dono === email);
}

// ---------------------------------------------------------------- envio

export async function iniciar(dono: string, nome: string, tamanho: number): Promise<Trabalho | string> {
  const extensao = path.extname(nome).toLowerCase();
  if (!EXTENSOES.includes(extensao)) return 'Formato não aceito. Envie MP4, MOV, MKV, AVI, MTS, WEBM ou MXF.';
  if (!Number.isFinite(tamanho) || tamanho <= 0) return 'Arquivo vazio.';
  if (tamanho > TAMANHO_MAX) return 'O arquivo passa de 4 GB.';
  const t: Trabalho = {
    id: randomUUID(), dono, nome: path.basename(nome).slice(0, 200), extensao, tamanho,
    criado_em: new Date().toISOString(), etapa: 'enviando', progresso: 0,
    crf: null, tamanho_final: null, vmaf: null, vmaf_pior: null, erro: null, terminado_em: null
  };
  await fs.mkdir(pastaDe(t.id), { recursive: true });
  await fs.writeFile(originalDe(t), '');
  await gravar(t);
  return t;
}

// Os pedaços chegam em ordem; cada um só é aceito se encaixa no fim do que já chegou.
export async function receberPedaco(t: Trabalho, parte: number, dados: Uint8Array): Promise<string | null> {
  if (t.etapa !== 'enviando') return 'Este envio já terminou.';
  const atual = (await fs.stat(originalDe(t))).size;
  if (parte * PEDACO !== atual) return 'Pedaço fora de ordem.';
  if (dados.byteLength > PEDACO || atual + dados.byteLength > t.tamanho) return 'Pedaço maior que o esperado.';
  await fs.appendFile(originalDe(t), dados);
  return null;
}

export async function concluirEnvio(t: Trabalho): Promise<string | null> {
  if (t.etapa !== 'enviando') return null;
  const atual = (await fs.stat(originalDe(t))).size;
  if (atual !== t.tamanho) return 'O arquivo não chegou inteiro. Envie de novo.';
  t.etapa = 'na_fila';
  await gravar(t);
  garantirFila();
  return null;
}

export function arquivoParaBaixar(t: Trabalho) {
  return createReadStream(saidaDe(t));
}

// ---------------------------------------------------------------- ffmpeg

type Resultado = { saida: string; erro: string };

function rodar(cmd: string, args: string[], aoLer?: (linha: string) => void): Promise<Resultado> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    let erro = '';
    let resto = '';
    p.stdout.on('data', (b: Buffer) => {
      const s = b.toString();
      if (!aoLer) { saida += s; return; }
      const linhas = (resto + s).split('\n');
      resto = linhas.pop() ?? '';
      linhas.forEach(aoLer);
    });
    p.stderr.on('data', (b: Buffer) => { erro = (erro + b.toString()).slice(-4000); });
    p.on('error', reject);
    p.on('close', (codigo) => (codigo === 0 ? resolve({ saida, erro }) : reject(new Error(erro.trim().split('\n').slice(-3).join(' ') || `${cmd} saiu com código ${codigo}`))));
  });
}

export type Ferramentas = { ffmpeg: boolean; vmaf: boolean };
let ferramentas: Promise<Ferramentas> | null = null;

// Confere uma vez por processo se o servidor tem ffmpeg e o medidor de qualidade.
export function conferirFerramentas(): Promise<Ferramentas> {
  ferramentas ??= (async () => {
    try {
      const { saida } = await rodar('ffmpeg', ['-hide_banner', '-filters']);
      await rodar('ffprobe', ['-version']);
      return { ffmpeg: true, vmaf: /\blibvmaf\b/.test(saida) };
    } catch {
      ferramentas = null; // tenta de novo na próxima vez (ex.: instalaram depois)
      return { ffmpeg: false, vmaf: false };
    }
  })();
  return ferramentas;
}

type Info = { dur: number; w: number; h: number; audio: { codec: string; bitrate: number } | null };

async function infoDe(arquivo: string): Promise<Info> {
  const { saida } = await rodar('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', arquivo]);
  const d = JSON.parse(saida) as { format: { duration?: string }; streams: { codec_type: string; codec_name: string; width?: number; height?: number; bit_rate?: string; duration?: string }[] };
  const v = d.streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error('O arquivo não tem vídeo.');
  const a = d.streams.find((s) => s.codec_type === 'audio');
  const dur = Number(d.format.duration || v.duration || 0);
  if (!dur) throw new Error('Não foi possível ler a duração do vídeo.');
  return { dur, w: Number(v.width), h: Number(v.height), audio: a ? { codec: a.codec_name, bitrate: Number(a.bit_rate || 0) } : null };
}

function argsVideo(crf: number, altura: number) {
  // Nível 4.1 até 1080p (o teto dos aparelhos antigos); acima disso, 5.1.
  return ['-c:v', 'libx264', '-preset', 'slower', '-crf', String(crf), '-profile:v', 'high',
    '-level:v', altura <= 1080 ? '4.1' : '5.1', '-pix_fmt', 'yuv420p', '-x264-params', 'aq-mode=3'];
}

function argsAudio(info: Info) {
  if (!info.audio) return ['-an'];
  // AAC leve já é compatível com tudo: só copia. O resto vira AAC 160k.
  if (info.audio.codec === 'aac' && info.audio.bitrate > 0 && info.audio.bitrate <= 192_000) return ['-map', '0:a:0', '-c:a', 'copy'];
  return ['-map', '0:a:0', '-c:a', 'aac', '-b:a', '160k'];
}

async function codificar(entrada: string, saida: string, crf: number, info: Info, trecho?: [number, number], aoAvancar?: (fracao: number) => void) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-nostdin'];
  if (trecho) args.push('-ss', trecho[0].toFixed(3));
  args.push('-i', entrada);
  if (trecho) args.push('-t', trecho[1].toFixed(3));
  args.push('-map', '0:v:0', ...(trecho ? ['-an'] : argsAudio(info)), ...argsVideo(crf, info.h),
    '-map_metadata', '0', '-movflags', '+faststart');
  if (aoAvancar) args.push('-progress', 'pipe:1', '-nostats');
  args.push(saida);
  await rodar('ffmpeg', args, aoAvancar ? (linha) => {
    const m = /^out_time_us=(\d+)/.exec(linha);
    if (m) aoAvancar(Math.min(1, Number(m[1]) / 1e6 / info.dur));
  } : undefined);
}

// VMAF do comprimido contra o mesmo trecho do original. Devolve média e o pior 5%.
async function medirVmaf(original: string, comprimido: string, info: Info, trecho?: [number, number], amostragem = 1) {
  const log = path.join(os.tmpdir(), `vmaf-${randomUUID()}.json`);
  const grafo = `[0:v]scale=${info.w}:${info.h}:flags=bicubic,format=yuv420p10le,setpts=PTS-STARTPTS[d];` +
    `[1:v]format=yuv420p10le,setpts=PTS-STARTPTS[r];` +
    `[d][r]libvmaf=log_fmt=json:log_path=${log}:n_threads=${THREADS}:n_subsample=${amostragem}`;
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', comprimido];
  if (trecho) args.push('-ss', trecho[0].toFixed(3));
  args.push('-i', original);
  if (trecho) args.push('-t', trecho[1].toFixed(3));
  args.push('-lavfi', grafo, '-f', 'null', '-');
  try {
    await rodar('ffmpeg', args);
    const d = JSON.parse(await fs.readFile(log, 'utf8')) as { frames: { metrics: { vmaf: number } }[]; pooled_metrics: { vmaf: { mean: number } } };
    const notas = d.frames.map((f) => f.metrics.vmaf).sort((a, b) => a - b);
    const media = d.pooled_metrics.vmaf.mean;
    const pior = notas.length ? notas[Math.max(0, Math.floor(notas.length * 0.05) - 1)] : media;
    return { media, pior };
  } finally {
    await fs.rm(log, { force: true });
  }
}

function trechos(dur: number, tam = 6): [number, number][] {
  if (dur <= tam * 3 + 2) return [[0, dur]];
  return [0.2, 0.5, 0.8].map((p) => [dur * p - tam / 2, tam] as [number, number]);
}

// Busca binária do CRF: o maior (mais compacto) cuja média passa de 95 e cujo pior trecho não cai muito.
async function buscarCrf(t: Trabalho, info: Info) {
  const entrada = originalDe(t);
  const amostras = trechos(info.dur);
  let lo = 16;
  let hi = 32;
  let melhor: number | null = null;
  const passos = Math.ceil(Math.log2(hi - lo + 2));
  let feitos = 0;
  while (lo <= hi) {
    const crf = Math.floor((lo + hi) / 2);
    const medias: number[] = [];
    const piores: number[] = [];
    for (const [i, tr] of amostras.entries()) {
      const out = path.join(pastaDe(t.id), `amostra_${crf}_${i}.mp4`);
      await codificar(entrada, out, crf, info, tr);
      const m = await medirVmaf(entrada, out, info, tr);
      medias.push(m.media);
      piores.push(m.pior);
      await fs.rm(out, { force: true });
    }
    const media = medias.reduce((s, x) => s + x, 0) / medias.length;
    if (media >= VMAF_ALVO && Math.min(...piores) >= VMAF_ALVO - 4) { melhor = crf; lo = crf + 1; } else { hi = crf - 1; }
    t.progresso = Math.min(0.95, ++feitos / passos);
    await gravar(t);
  }
  return melhor ?? 16;
}

async function processar(t: Trabalho) {
  const entrada = originalDe(t);
  const tf = await conferirFerramentas();
  if (!tf.ffmpeg) throw new Error('O servidor ainda não tem o ffmpeg instalado.');
  const info = await infoDe(entrada);

  t.etapa = 'testando';
  t.progresso = 0;
  await gravar(t);
  // Sem o medidor de qualidade, usa um nível seguro e conhecido (CRF 23) e avisa que não mediu.
  t.crf = tf.vmaf ? await buscarCrf(t, info) : 23;

  t.etapa = 'codificando';
  t.progresso = 0;
  await gravar(t);
  let ultimo = 0;
  await codificar(entrada, saidaDe(t), t.crf, info, undefined, (f) => {
    if (f - ultimo < 0.01) return;
    ultimo = f;
    t.progresso = f;
    void gravar(t);
  });
  t.tamanho_final = (await fs.stat(saidaDe(t))).size;

  if (tf.vmaf) {
    t.etapa = 'conferindo';
    t.progresso = 0;
    await gravar(t);
    const m = await medirVmaf(entrada, saidaDe(t), info, undefined, info.dur < 120 ? 1 : 5);
    t.vmaf = Math.round(m.media * 100) / 100;
    t.vmaf_pior = Math.round(m.pior * 100) / 100;
  }
}

// ---------------------------------------------------------------- fila (um vídeo por vez: é pesado para o processador)

const g = globalThis as unknown as { __filaCompactador?: boolean };

export function garantirFila() {
  if (g.__filaCompactador) return;
  g.__filaCompactador = true;
  void (async () => {
    try {
      // Se o servidor reiniciou no meio, o que estava em andamento volta para a fila.
      for (;;) {
        const lista = await todos();
        const proximo = lista
          .filter((t) => ['na_fila', 'testando', 'codificando', 'conferindo'].includes(t.etapa))
          .sort((a, b) => a.criado_em.localeCompare(b.criado_em))[0];
        if (!proximo) break;
        try {
          await processar(proximo);
          proximo.etapa = 'pronto';
        } catch (e) {
          proximo.etapa = 'erro';
          proximo.erro = (e as Error).message.slice(0, 300);
          console.error('[compactador]', proximo.id, proximo.erro);
        }
        proximo.progresso = 1;
        proximo.terminado_em = new Date().toISOString();
        await gravar(proximo);
        await fs.rm(originalDe(proximo), { force: true });
      }
    } finally {
      g.__filaCompactador = false;
    }
  })();
}
