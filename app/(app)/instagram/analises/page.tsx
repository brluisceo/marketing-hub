import Link from 'next/link';
import type { ReactNode } from 'react';
import Bars, { type Barra } from '@/components/Bars';
import ErroApi from '@/components/ErroApi';
import FiltroSelect from '@/components/FiltroSelect';
import MapaHorarios, { DIAS_LONGOS } from '@/components/MapaHorarios';
import { FAIXAS, FAIXAS_LONGAS, FORMATOS_ANALISE, PERIODOS, type Estatistica } from '@/lib/analises';
import { compacto, dataCurta, num, pct } from '@/lib/format';
import { hub } from '@/lib/hub';
import { LISTA_PILARES, PILARES, ehPilar, nomePilar } from '@/lib/pilares';
import type { AnalisesResp, Grupo, GrupoCompleto } from '@/lib/types';

export const metadata = { title: 'Análises · Marketing HUB' };

type SP = { aba?: string; periodo?: string; estat?: string; medida?: string; formato?: string; pilar?: string };
type Aba = 'quando' | 'oque' | 'stories' | 'publico';
const ABAS: [Aba, string][] = [['quando', 'Quando postar'], ['oque', 'O que postar'], ['stories', 'Stories'], ['publico', 'Público']];

// Abaixo disso um grupo (horário, dia, combinação, pilar) aparece em cinza e não entra nas conclusões.
const MINIMO = 8;

type Medida = 'alcance' | 'engajamento';
type Item = { texto: ReactNode; cautela?: boolean };
// Palavras que mudam com a estatística escolhida ("alcance médio" x "alcance típico").
type Palavras = { m: string; mp: string; fp: string; nome: string };
const PALAVRAS: Record<Estatistica, Palavras> = {
  media: { m: 'médio', mp: 'médios', fp: 'médias', nome: 'média' },
  mediana: { m: 'típico', mp: 'típicos', fp: 'típicas', nome: 'mediana' }
};
type Ctx = { estat: Estatistica; w: Palavras; medida: Medida };

const plural = (n: number, um: string, varios: string) => `${num(n)} ${n === 1 ? um : varios}`;
const maior = <T,>(lista: T[], v: (x: T) => number) => lista.reduce<T | undefined>((m, x) => (m === undefined || v(x) > v(m) ? x : m), undefined);
const menor = <T,>(lista: T[], v: (x: T) => number) => maior(lista, (x) => -v(x));
const vazio = { n: 0, alcance: 0, engajamento: 0, maior: 0 };

// Pela média, um viral pode decidir o ranking sozinho: avisa quando mais da metade do alcance do grupo veio de um post só.
function avisoViral(ctx: Ctx, deQue: string, g: Grupo | undefined): Item[] {
  if (!g || ctx.estat !== 'media' || ctx.medida !== 'alcance' || !g.n || !g.alcance) return [];
  const parte = Math.min(1, g.maior / (g.alcance * g.n));
  if (parte < 0.5) return [];
  return [{ cautela: true, texto: <><strong>Cuidado:</strong> {Math.round(parte * 100)}% do alcance {deQue} veio de um único post ({compacto(g.maior)}). Troque para Mediana para ver o post comum.</> }];
}

function resumoQuando(a: AnalisesResp, ctx: Ctx): Item[] {
  if (a.total.n < 20) return [{ texto: 'Poucos posts neste filtro para tirar conclusões. Aumente o período ou tire um filtro.', cautela: true }];
  const eng = ctx.medida === 'engajamento';
  const v = (x: Grupo) => (eng ? x.engajamento : x.alcance);
  const f = (x: Grupo) => (eng ? pct(x.engajamento) : compacto(x.alcance));
  const nome = `${eng ? 'engajamento' : 'alcance'} ${ctx.w.m}`;
  // "Com volume": horário usado em pelo menos ~5% dos posts. É o que dá para afirmar com segurança.
  const volume = Math.max(MINIMO, Math.round(a.total.n * 0.05));
  const itens: Item[] = [];
  const comVolume = a.horas.filter((h) => h.n >= volume);
  const bom = maior(comVolume, v);
  const ruim = menor(comVolume, v);
  const promissor = maior(a.horas.filter((h) => h.n >= MINIMO && h.n < volume), v);
  if (bom) {
    itens.push({ texto: <><strong>{bom.hora}h é o melhor horário com volume:</strong> {nome} de {f(bom)} em {plural(bom.n, 'post', 'posts')} (na conta toda: {f(a.total)}).</> });
    itens.push(...avisoViral(ctx, `das ${bom.hora}h`, bom));
  }
  if (bom && promissor && v(promissor) > v(bom)) itens.push({ cautela: true, texto: <><strong>{promissor.hora}h foi ainda melhor</strong> ({f(promissor)}), mas com só {plural(promissor.n, 'post', 'posts')}. Vale testar mais antes de concluir.</> });
  if (ruim && ruim !== bom) itens.push({ texto: <><strong>{ruim.hora}h é o pior horário</strong> ({f(ruim)}) e foi usado {plural(ruim.n, 'vez', 'vezes')}.</> });
  const celulas = a.grade.filter((c) => c.n >= MINIMO);
  const cMelhor = maior(celulas, v);
  const cPior = menor(celulas, v);
  if (cMelhor && cPior && cMelhor !== cPior) {
    itens.push({ texto: <><strong>Melhor combinação:</strong> {DIAS_LONGOS[cMelhor.dia]} {FAIXAS_LONGAS[cMelhor.faixa]} ({f(cMelhor)}, {plural(cMelhor.n, 'post', 'posts')}). <strong>Pior:</strong> {DIAS_LONGOS[cPior.dia]} {FAIXAS_LONGAS[cPior.faixa]} ({f(cPior)}, {plural(cPior.n, 'post', 'posts')}).</> });
    itens.push(...avisoViral(ctx, `de ${DIAS_LONGOS[cMelhor.dia]} ${FAIXAS_LONGAS[cMelhor.faixa]}`, cMelhor));
  }
  const dias = a.dias.filter((d) => d.n >= MINIMO).sort((x, y) => v(y) - v(x));
  if (dias.length >= 4) {
    const [d1, d2] = dias, [u2, u1] = dias.slice(-2);
    itens.push({ texto: <><strong>Dias:</strong> {DIAS_LONGOS[d1.dia]} e {DIAS_LONGOS[d2.dia]} na frente ({f(d1)} e {f(d2)}); {DIAS_LONGOS[u1.dia]} e {DIAS_LONGOS[u2.dia]} são os mais fracos ({f(u1)} e {f(u2)}).</> });
  }
  return itens;
}

function resumoOque(a: AnalisesResp, ctx: Ctx): Item[] {
  const itens: Item[] = [];
  const pilares = a.pilares.filter((p) => p.pilar && p.n >= MINIMO);
  const total = a.pilares.reduce((s, p) => s + p.n, 0);
  const parte = (n: number) => `${Math.round((n / Math.max(1, total)) * 100)}%`;
  const alcCtx = { ...ctx, medida: 'alcance' as const };
  if (pilares.length >= 2) {
    const alc = maior(pilares, (p) => p.alcance)!;
    const lider = alc === maior(pilares, (p) => p.salvamentos) && alc === maior(pilares, (p) => p.compartilhamentos);
    itens.push({ texto: <><strong>{nomePilar(alc.pilar)} é o pilar que mais alcança</strong> ({compacto(alc.alcance)}){lider ? ' e o que mais gera salvamentos e compartilhamentos' : ''}. Foi {parte(alc.n)} dos posts ({num(alc.n)}).</> });
    itens.push(...avisoViral(alcCtx, `do pilar ${nomePilar(alc.pilar)}`, alc));
    const mais = maior(pilares, (p) => p.n)!;
    if (mais !== alc) {
      const comp = mais.alcance < a.total.alcance ? 'abaixo' : 'acima';
      itens.push({ texto: <><strong>{nomePilar(mais.pilar)} é o pilar mais postado</strong> ({num(mais.n)} posts, {parte(mais.n)}) e alcança {compacto(mais.alcance)}, {comp} da {ctx.w.nome} da conta ({compacto(a.total.alcance)}).</> });
    }
    const eng = maior(pilares, (p) => p.engajamento)!;
    itens.push({ texto: <><strong>{nomePilar(eng.pilar)} tem o maior engajamento</strong> ({pct(eng.engajamento)}).</> });
  }
  const formatos = a.formatos.filter((x) => x.n >= MINIMO).sort((x, y) => y.alcance - x.alcance);
  if (formatos.length >= 2) {
    itens.push({ texto: <><strong>Formato:</strong> {formatos.map((x) => `${x.formato} ${compacto(x.alcance)}`).join(', ')} de alcance {ctx.w.m}.</> });
    itens.push(...avisoViral(alcCtx, `dos posts em ${formatos[0].formato}`, formatos[0]));
  }
  const fr = a.frequencia.filter((x) => x.semanas >= 3);
  const topo = maior(fr, (x) => x.alcance_semana);
  if (topo && fr.length >= 2) {
    const acima = fr.filter((x) => x.de > topo.ate);
    const cai = acima.length > 0 && acima.every((x) => x.alcance_semana < topo.alcance_semana);
    itens.push({ texto: <><strong>Frequência:</strong> semanas com {nomeFaixa(topo, a.frequencia)} posts somaram o maior alcance ({compacto(topo.alcance_semana)}).{cai ? ' Acima disso o total cai: postar mais está diluindo.' : ''}</> });
  }
  if (!itens.length) itens.push({ texto: 'Poucos posts neste filtro para tirar conclusões. Aumente o período ou tire um filtro.', cautela: true });
  return itens;
}

function resumoStories(a: AnalisesResp): Item[] {
  const s = a.stories;
  if (!s.total) return [{ texto: 'Nenhum Story no período.', cautela: true }];
  const itens: Item[] = [];
  if (s.dias < 28) itens.push({ cautela: true, texto: <><strong>Ainda é pouco:</strong> {plural(s.total, 'Story', 'Stories')} em {plural(s.dias, 'dia', 'dias')}{s.desde ? ` (a coleta começou em ${dataCurta(s.desde)})` : ''}. As conclusões ficam firmes com umas 4 semanas.</> });
  const pico = maior(s.faixas.filter((x) => x.n >= 5), (x) => x.visualizacoes);
  if (pico) itens.push({ texto: <><strong>{s.dias < 28 ? 'Por enquanto, ' : ''}{FAIXAS_LONGAS[pico.faixa]}</strong> é o horário com mais visualizações ({compacto(pico.visualizacoes)} por Story).</> });
  const seg = s.sequencia.find((x) => x.pos === 2);
  const depois = s.sequencia.filter((x) => x.pos > 2);
  if (seg) {
    const estavel = depois.length > 0 && depois.every((x) => x.continuam_pct >= seg.continuam_pct - 10);
    itens.push({ texto: <><strong>O 2º story perde ~{Math.max(0, 100 - seg.continuam_pct)}%</strong> de quem viu o 1º{estavel ? '; depois a queda é pequena. Sequências longas não estão espantando quem fica.' : '.'}</> });
  }
  return itens;
}

const RESUMO_PUBLICO: Item[] = [
  { texto: <>Cidades, idade e gênero de quem segue a conta, e também de quem interagiu nos últimos 30 dias.</> },
  { cautela: true, texto: <><strong>DMs e cliques no link por hora</strong> a Meta não entrega. Uma alternativa para depois: o horário em que os leads chegam no PipeRun.</> }
];

function nomeFaixa(x: AnalisesResp['frequencia'][number], todas: AnalisesResp['frequencia']): string {
  if (x === todas[todas.length - 1] && x.de >= 15) return `${x.de} ou mais`;
  return x.de === x.ate ? String(x.de) : `${x.de} a ${x.ate}`;
}

function Painel({ titulo, sub, extra, children }: { titulo: string; sub?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>{titulo}</h2>{extra}</div>
      {sub ? <p className="panel-sub">{sub}</p> : null}
      {children}
    </section>
  );
}

// Partes que dependem de coleta nova no n8n: um desenho apagado do que vai aparecer, com o aviso por cima.
const COLETA_NOVA = <span className="pill pill-exemplo">Coleta nova</span>;
function Exemplo({ aviso, children }: { aviso: string; children: ReactNode }) {
  return (
    <div className="exemplo-corpo">
      <div className="exemplo-desenho" aria-hidden="true">{children}</div>
      <div className="exemplo-aviso"><span>{aviso}</span></div>
    </div>
  );
}
const barrasExemplo = (larguras: [string, number][]) => (
  <ul className="hbars">{larguras.map(([l, w]) => <li key={l}><span>{l}</span><span className="meter"><div style={{ width: `${w}%` }} /></span><span className="muted r">—</span></li>)}</ul>
);
const ONLINE_EXEMPLO = [2, 1, 1, 1, 1, 2, 5, 9, 12, 13, 14, 15, 17, 16, 15, 15, 16, 18, 21, 24, 26, 25, 18, 8];

type Linha = GrupoCompleto & { chave: string; nome: string; sem?: boolean };

// Tabela de comparação (formato, pilar): valor por post; ponto azul = melhor da coluna (só grupos com amostra boa).
function Comparar({ rotulo, linhas, acao }: { rotulo: string; linhas: Linha[]; acao?: ReactNode }) {
  const validas = linhas.filter((l) => !l.sem && l.n >= MINIMO);
  const melhor = (k: keyof GrupoCompleto) => Math.max(...validas.map((l) => l[k]));
  const maxAlc = Math.max(1, ...linhas.map((l) => l.alcance));
  const cel = (l: Linha, k: keyof GrupoCompleto, texto: string) => <span className={!l.sem && l.n >= MINIMO && l[k] === melhor(k) ? 'is-melhor' : undefined}>{texto}</span>;
  return (
    <div className="table-wrap">
      <table className="table table-adapta comparar">
        <thead>
          <tr><th>{rotulo}</th><th className="r">Posts</th><th className="r">Alcance</th><th className="r so-medio">Salvamentos</th><th className="r so-medio">Compartilh.</th><th className="r so-largo">Comentários</th><th className="r so-largo">Engajamento</th></tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave} className={l.sem ? 'linha-sem' : undefined}>
              <td className="strong">{l.nome}{l.sem && acao ? <> {acao}</> : null}</td>
              <td className="r num">{num(l.n)}</td>
              <td className="r num"><span className="celula-medidor">{cel(l, 'alcance', compacto(l.alcance))}<span className="meter"><div style={{ width: `${Math.round((l.alcance / maxAlc) * 100)}%` }} /></span></span></td>
              <td className="r num so-medio">{cel(l, 'salvamentos', num(l.salvamentos))}</td>
              <td className="r num so-medio">{cel(l, 'compartilhamentos', num(l.compartilhamentos))}</td>
              <td className="r num so-largo">{cel(l, 'comentarios', num(l.comentarios))}</td>
              <td className="r num so-largo">{cel(l, 'engajamento', pct(l.engajamento))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Analises({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const aba: Aba = ABAS.some(([k]) => k === sp.aba) ? (sp.aba as Aba) : 'quando';
  const meses = PERIODOS.find((p) => String(p) === sp.periodo) ?? 12;
  // Média é o padrão (pedido do usuário); a mediana mostra o post comum, sem a influência dos virais.
  const estat: Estatistica = sp.estat === 'mediana' ? 'mediana' : 'media';
  const medida: Medida = sp.medida === 'engajamento' ? 'engajamento' : 'alcance';
  const formato = FORMATOS_ANALISE.find((f) => f === sp.formato);
  const pilar = sp.pilar === 'sem' || ehPilar(sp.pilar) ? sp.pilar : undefined;
  const w = PALAVRAS[estat];
  const ctx: Ctx = { estat, w, medida };

  let a: AnalisesResp;
  try {
    a = await hub.analises({ meses, formato, pilar, estat });
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }

  // Link que troca um filtro e mantém os outros.
  const qs = (extra: Partial<SP>) => {
    const q = new URLSearchParams();
    const base: SP = {
      aba, periodo: meses === 12 ? undefined : String(meses), estat: estat === 'media' ? undefined : estat,
      medida: medida === 'alcance' ? undefined : medida, formato, pilar, ...extra
    };
    for (const [k, v] of Object.entries(base)) if (v && !(k === 'aba' && v === 'quando')) q.set(k, v);
    const s = q.toString();
    return `/instagram/analises${s ? `?${s}` : ''}`;
  };
  const seg = (itens: [string, string, Partial<SP>, boolean][]) => (
    <span className="seg">{itens.map(([k, l, extra, on]) => <Link key={k} href={qs(extra)} scroll={false} className={on ? 'is-on' : undefined} aria-current={on ? 'true' : undefined}>{l}</Link>)}</span>
  );

  const val = (x: Grupo) => (medida === 'engajamento' ? x.engajamento : x.alcance);
  const fmt = (x: Grupo) => (medida === 'engajamento' ? pct(x.engajamento, 0) : compacto(x.alcance));
  const titulo = (rotulo: string, x: Grupo) =>
    x.n ? `${rotulo}: alcance ${w.m} ${num(x.alcance)} · engajamento ${pct(x.engajamento)} · ${plural(x.n, 'post', 'posts')}` : `${rotulo}: nenhum post`;

  let corpo: ReactNode;
  let resumo: Item[];
  let comoLer: ReactNode = (
    <div className="aside-block">
      <h2>Como ler</h2>
      {estat === 'media'
        ? <p><strong>Alcance médio</strong> é a soma do alcance dividida pelo número de posts. Poucos posts virais puxam a média para cima: a maioria dos posts fica abaixo dela. Para ver o post comum, troque para <strong>Mediana</strong>.</p>
        : <p><strong>Alcance típico</strong> é a mediana: metade dos posts ficou acima, metade abaixo. Assim um viral de mais de 1 milhão não distorce tudo.</p>}
      <p>Entram só posts com 7 dias ou mais (os números já assentaram). Números orgânicos, sem impulsionamento.</p>
      <p>O horário é uma das coisas que pesam; o conteúdo pesa mais. Use como ponto de partida para testar.</p>
    </div>
  );

  if (aba === 'quando') {
    const volume = Math.max(MINIMO, Math.round(a.total.n * 0.05));
    const horas = Array.from({ length: 24 }, (_, h) => a.horas.find((x) => x.hora === h) ?? { hora: h, ...vazio });
    const confHoras = horas.filter((x) => x.n >= MINIMO);
    const destHora = maior(horas.filter((x) => x.n >= volume), val) ?? maior(confHoras, val);
    const topoHora = maior(confHoras, val);
    const barrasHora: Barra[] = horas.map((x) => ({
      rotulo: x.hora % 3 === 0 ? `${x.hora}h` : '', valor: val(x), fraco: x.n < MINIMO, destaque: x === destHora,
      texto: x === destHora || x === topoHora ? fmt(x) : '', titulo: titulo(`${x.hora}h`, x)
    }));
    const confDias = a.dias.filter((x) => x.n >= MINIMO);
    const destDia = maior(confDias, val);
    const barrasDia: Barra[] = [1, 2, 3, 4, 5, 6, 7].map((d) => {
      const x = a.dias.find((y) => y.dia === d) ?? { dia: d, ...vazio };
      return { rotulo: ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][d], valor: val(x), fraco: x.n < MINIMO, destaque: x === destDia, texto: x.n >= MINIMO ? fmt(x) : '', titulo: titulo(DIAS_LONGOS[d], x) };
    });
    corpo = (
      <>
        <Painel titulo="Melhor dia e horário" sub={`${medida === 'engajamento' ? 'Engajamento' : 'Alcance'} ${w.m} dos posts publicados em cada dia e faixa de horário`}>
          <MapaHorarios grade={a.grade} medida={medida} minimo={MINIMO} rotulo={w.m} />
        </Painel>
        <Painel titulo="Por horário de publicação" sub={`Hora em que o post saiu. Barras cinza-claro: menos de ${MINIMO} posts`}>
          <Bars dados={barrasHora} ariaLabel={`${medida === 'engajamento' ? 'Engajamento' : 'Alcance'} ${w.m} por hora de publicação`} teto={topoHora ? val(topoHora) : undefined} />
        </Painel>
        <Painel titulo="Quando os seguidores estão online" sub='O mesmo dado de "Horários mais ativos" do app, para comparar com o gráfico de cima' extra={COLETA_NOVA}>
          <Exemplo aviso="Aparece depois que a coleta nova for ligada (a Meta entrega a média dos últimos 30 dias).">
            <Bars dados={ONLINE_EXEMPLO.map((v, h) => ({ rotulo: h % 3 === 0 ? `${h}h` : '', valor: v, texto: '' }))} ariaLabel="Exemplo" />
          </Exemplo>
        </Painel>
        <div className="par-graficos">
          <Painel titulo="Por dia da semana">
            <Bars dados={barrasDia} ariaLabel={`${medida === 'engajamento' ? 'Engajamento' : 'Alcance'} ${w.m} por dia da semana`} />
          </Painel>
          <Painel titulo="Velocidade na 1ª hora" sub="Quanto cada post alcança logo depois de sair" extra={COLETA_NOVA}>
            <Exemplo aviso="Só para posts publicados depois que a coleta a cada 5 min das primeiras 24 h for ligada.">
              <div className="table-wrap">
                <table className="table table-adapta comparar">
                  <thead><tr><th>Post</th><th className="r">1ª hora</th><th className="r">24 h</th><th className="r">Hoje</th></tr></thead>
                  <tbody>{['Post 1', 'Post 2', 'Post 3', 'Post 4'].map((p) => <tr key={p}><td>{p}</td><td className="r">—</td><td className="r">—</td><td className="r">—</td></tr>)}</tbody>
                </table>
              </div>
            </Exemplo>
          </Painel>
        </div>
      </>
    );
    resumo = resumoQuando(a, ctx);
  } else if (aba === 'oque') {
    const pilares: Linha[] = [
      ...a.pilares.filter((p) => p.pilar).map((p) => ({ ...p, chave: p.pilar!, nome: nomePilar(p.pilar) })),
      ...a.pilares.filter((p) => !p.pilar).map((p) => ({ ...p, chave: 'sem', nome: 'Sem pilar', sem: true }))
    ];
    const maxPost = Math.max(1, ...a.frequencia.map((x) => x.alcance_post));
    const maxSemana = Math.max(1, ...a.frequencia.map((x) => x.alcance_semana));
    corpo = (
      <>
        <Painel titulo="Formato por objetivo" sub={`Valores ${w.mp} por post. Ponto azul: o melhor de cada coluna`}>
          <Comparar rotulo="Formato" linhas={a.formatos.map((x) => ({ ...x, chave: x.formato, nome: x.formato }))} />
        </Painel>
        <Painel titulo="Pilares de conteúdo" sub={`O pilar de cada post é marcado no painel do post, na tela Posts. ${a.sem_pilar ? `${plural(a.sem_pilar, 'post do período está', 'posts do período estão')} sem pilar.` : ''}`}>
          <Comparar rotulo="Pilar" linhas={pilares} acao={a.sem_pilar ? <Link href="/instagram/posts?mes=todos&pilar=sem" className="small">Marcar agora</Link> : undefined} />
        </Painel>
        <Painel titulo="Frequência" sub={`Semanas completas dos últimos ${meses} meses, agrupadas pela quantidade de posts (todos os posts, sem os filtros de formato e pilar)`}>
          {a.frequencia.length ? (
            <div className="table-wrap">
              <table className="table table-adapta comparar">
                <thead><tr><th>Posts na semana</th><th className="r so-medio">Semanas</th><th className="r">Alcance por post</th><th className="r">Alcance da semana (soma)</th></tr></thead>
                <tbody>
                  {a.frequencia.map((x) => (
                    <tr key={x.de}>
                      <td className="strong">{nomeFaixa(x, a.frequencia)}</td>
                      <td className="r num so-medio">{x.semanas}</td>
                      <td className="r num"><span className="celula-medidor"><span className={x.alcance_post === maxPost ? 'is-melhor' : undefined}>{compacto(x.alcance_post)}</span><span className="meter"><div style={{ width: `${Math.round((x.alcance_post / maxPost) * 100)}%` }} /></span></span></td>
                      <td className="r num"><span className="celula-medidor"><span className={x.alcance_semana === maxSemana ? 'is-melhor' : undefined}>{compacto(x.alcance_semana)}</span><span className="meter"><div style={{ width: `${Math.round((x.alcance_semana / maxSemana) * 100)}%` }} /></span></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">Ainda não há semanas completas neste período.</p>}
        </Painel>
        <Painel titulo="Reels: tempo médio assistido" sub="A Meta não informa a duração do vídeo nem em que segundo as pessoas saem; só o tempo médio assistido" extra={COLETA_NOVA}>
          <Exemplo aviso="Aparece depois que a coleta nova for ligada, para os Reels dos últimos 90 dias.">
            {barrasExemplo([['Reel 1', 80], ['Reel 2', 64], ['Reel 3', 52], ['Reel 4', 40], ['Reel 5', 28]])}
          </Exemplo>
        </Painel>
      </>
    );
    resumo = resumoOque(a, ctx);
  } else if (aba === 'stories') {
    const s = a.stories;
    const topoSt = maior(s.faixas.filter((x) => x.n >= 5), (x) => x.visualizacoes);
    corpo = s.total ? (
      <>
        <Painel titulo="Visualizações por horário" sub={`Visualizações ${w.fp} por Story, pela hora em que ele foi publicado`}>
          <Bars ariaLabel={`Visualizações ${w.fp} por faixa de horário`} dados={FAIXAS.map((rot, faixa) => {
            const x = s.faixas.find((y) => y.faixa === faixa) ?? { faixa, n: 0, visualizacoes: 0, alcance: 0 };
            return { rotulo: rot, valor: x.visualizacoes, fraco: x.n < 5, destaque: x === topoSt, texto: x.n ? compacto(x.visualizacoes) : '', titulo: `${FAIXAS_LONGAS[faixa]}: ${num(x.visualizacoes)} visualizações ${w.fp} · ${plural(x.n, 'Story', 'Stories')}` };
          })} />
        </Painel>
        <Painel titulo="Onde as pessoas saem da sequência" sub="Em cada dia, os Stories em ordem: quanto do público do 1º ainda está assistindo">
          <div className="table-wrap">
            <table className="table table-adapta comparar">
              <thead><tr><th>Story na sequência do dia</th><th className="r so-medio">Dias</th><th className="r">Ainda assistindo (% do 1º)</th><th className="r">Saíram neste story</th></tr></thead>
              <tbody>
                {s.sequencia.map((x) => (
                  <tr key={x.pos}>
                    <td className="strong">{x.pos === 8 ? '8º em diante' : `${x.pos}º`}</td>
                    <td className="r num so-medio">{x.dias}</td>
                    <td className="r num"><span className="celula-medidor"><span>{x.continuam_pct}%</span><span className="meter"><div style={{ width: `${Math.min(100, x.continuam_pct)}%` }} /></span></span></td>
                    <td className="r num">{pct(x.saida_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </>
    ) : <div className="empty"><h2>Nenhum Story no período</h2><p>A Meta só entrega os Stories enquanto estão no ar; a coleta começou em 05/11/2026.</p></div>;
    resumo = resumoStories(a);
    comoLer = (
      <div className="aside-block">
        <h2>Como ler</h2>
        {estat === 'media'
          ? <p><strong>Visualizações médias</strong> é a soma das visualizações dividida pelo número de Stories.</p>
          : <p><strong>Visualizações típicas</strong> é a mediana: metade dos Stories ficou acima, metade abaixo.</p>}
        <p>A Meta só entrega números enquanto o Story está no ar (24 h). O hub guarda o último número lido.</p>
      </div>
    );
  } else {
    corpo = (
      <>
        <div className="par-graficos">
          <Painel titulo="Cidades" sub="As 10 cidades com mais seguidores" extra={COLETA_NOVA}>
            <Exemplo aviso="Aparece depois que a coleta nova for ligada.">{barrasExemplo([['Cidade 1', 90], ['Cidade 2', 52], ['Cidade 3', 40], ['Cidade 4', 31], ['Cidade 5', 26], ['Cidade 6', 20]])}</Exemplo>
          </Painel>
          <Painel titulo="Faixa etária" extra={COLETA_NOVA}>
            <Exemplo aviso="Aparece depois que a coleta nova for ligada.">{barrasExemplo([['18–24', 20], ['25–34', 85], ['35–44', 70], ['45–54', 35], ['55–64', 14], ['65+', 5]])}</Exemplo>
          </Painel>
        </div>
        <Painel titulo="Gênero" extra={COLETA_NOVA}>
          <Exemplo aviso="Aparece depois que a coleta nova for ligada.">
            <dl className="metric-grid"><div><dt>Mulheres</dt><dd>—</dd></div><div><dt>Homens</dt><dd>—</dd></div></dl>
          </Exemplo>
        </Painel>
      </>
    );
    resumo = RESUMO_PUBLICO;
    comoLer = (
      <div className="aside-block">
        <h2>Como ler</h2>
        <p>A Meta mostra só as 45 principais cidades e esconde o público quando há menos de 100 pessoas no recorte.</p>
      </div>
    );
  }

  return (
    <>
      <header className="toolbar">
        <h1>Análises</h1>
        <span className="muted">@rogerio.fameli · últimos {meses} meses</span>
        <span className="spacer" />
        <nav className="seg" aria-label="Seções das análises">
          {ABAS.map(([k, l]) => <Link key={k} href={qs({ aba: k })} scroll={false} className={k === aba ? 'is-on' : undefined} aria-current={k === aba ? 'page' : undefined}>{l}</Link>)}
        </nav>
      </header>
      {aba !== 'publico' ? (
        <div className="analises-filtros">
          <span className="inline-field">Período {seg(PERIODOS.map((p): [string, string, Partial<SP>, boolean] => [String(p), `${p} meses`, { periodo: p === 12 ? undefined : String(p) }, p === meses]))}</span>
          <span className="inline-field">Estatística {seg([['media', 'Média', { estat: undefined }, estat === 'media'], ['mediana', 'Mediana', { estat: 'mediana' }, estat === 'mediana']])}</span>
          {aba === 'quando' ? <span className="inline-field">Medir por {seg([['alcance', 'Alcance', { medida: undefined }, medida === 'alcance'], ['engajamento', 'Engajamento', { medida: 'engajamento' }, medida === 'engajamento']])}</span> : null}
          {aba === 'quando' || aba === 'oque' ? (
            <>
              <FiltroSelect nome="formato" rotulo="Formato" valor={formato ?? ''} opcoes={[['', 'Todos'], ...FORMATOS_ANALISE.map((f): [string, string] => [f, f])]} />
              <FiltroSelect nome="pilar" rotulo="Pilar" valor={pilar ?? ''} opcoes={[['', 'Todos'], ...LISTA_PILARES.map((p): [string, string] => [p, PILARES[p]]), ['sem', 'Sem pilar']]} />
            </>
          ) : null}
        </div>
      ) : null}
      {a.exemplo ? <div className="tabela-nota"><p className="notice">Modo demonstração: números de exemplo de 13/11/2026, pela média (os filtros não mudam nada).</p></div> : null}
      <div className="split split-analises">
        <div className="content">{corpo}</div>
        <aside className="aside" aria-label="Resumo">
          <div className="aside-block">
            <h2>O que os números dizem</h2>
            <ul className="resumo-lista">{resumo.map((r, i) => <li key={i} className={r.cautela ? 'is-cautela' : undefined}>{r.texto}</li>)}</ul>
          </div>
          {comoLer}
        </aside>
      </div>
    </>
  );
}
