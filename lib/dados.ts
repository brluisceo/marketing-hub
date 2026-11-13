// Leitura dos dados do Instagram direto do Postgres (usuário hub_site). Só no servidor.
// Reproduz exatamente a lógica dos nós de código do fluxo "[HUB] API do hub" no n8n,
// para que a troca de fonte não mude nenhum número na tela.
import { exigirBanco } from './db';
import type { ContaResp, Kpis, Overview, Post, PostResp, PostsResp, StoriesKpis, StoriesResp, Story } from './types';

// Mesmo grupo de conexões do resto do site (lib/db.ts).
async function linhas<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await exigirBanco().query(sql, params)).rows as T[];
}

// Datas no mesmo formato que o n8n devolvia (toISOString: 2026-11-06T10:00:04.000Z).
const iso = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const MES = /^\d{4}-\d{2}$/;

function mesSP(d = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(d);
  return `${p.find((x) => x.type === 'year')!.value}-${p.find((x) => x.type === 'month')!.value}`;
}

function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

// "Agora" com o fuso de São Paulo, como o DateTime.now().setZone(...).toISO() do n8n.
function agoraSP(): string {
  const d = new Date();
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(d).map((x) => [x.type, x.value])
  );
  const offMin = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(d.getTime() / 1000) * 1000) / 60000);
  const sinal = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${ms}${sinal}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

const eng = (inter: number, alc: number) => (alc ? Math.round((inter / alc) * 1000) / 10 : 0);
const soma = <T>(lista: T[], campo: keyof T) => lista.reduce((a, x) => a + (Number(x[campo]) || 0), 0);

const COLS_POST = `post_id, plataforma, formato, legenda, permalink, thumbnail_url, ${iso('publicado_em')} AS publicado_em, mes_ref,
  alcance, visualizacoes, curtidas, comentarios, compartilhamentos, salvamentos, interacoes, ${iso('atualizado_em')} AS atualizado_em`;

type PostLinha = Omit<Post, 'engajamento_pct'>;

function kpis(lista: PostLinha[]): Kpis {
  const alcance = soma(lista, 'alcance');
  const interacoes = soma(lista, 'interacoes');
  return {
    posts: lista.length, alcance, visualizacoes: soma(lista, 'visualizacoes'), interacoes,
    curtidas: soma(lista, 'curtidas'), comentarios: soma(lista, 'comentarios'), compartilhamentos: soma(lista, 'compartilhamentos'),
    salvamentos: soma(lista, 'salvamentos'), engajamento_pct: eng(interacoes, alcance)
  };
}

export async function overview(mesPedido?: string): Promise<Overview> {
  const gerado_em = agoraSP();
  const mes = MES.test(mesPedido || '') ? mesPedido! : mesSP();
  const mesAnt = somarMeses(mes, -1);
  const primeiro = somarMeses(mes, -11);

  const [doisMeses, serieBruta, contas] = await Promise.all([
    linhas<PostLinha>(`SELECT ${COLS_POST} FROM posts WHERE mes_ref IN ($1, $2) ORDER BY publicado_em`, [mes, mesAnt]),
    linhas<{ mes: string; posts: number; alcance: number }>(
      `SELECT mes_ref AS mes, count(*)::int AS posts, coalesce(sum(alcance), 0)::float8 AS alcance FROM posts
        WHERE mes_ref BETWEEN $1 AND $2 GROUP BY mes_ref`,
      [primeiro, mes]
    ),
    linhas<{ dia: string; mes: string; seguidores: number; alcance: number; visitas_perfil: number }>(
      `SELECT data::text AS dia, to_char(data, 'YYYY-MM') AS mes, seguidores, alcance, visitas_perfil FROM contas_diario ORDER BY data`
    )
  ]);

  const doMes = doisMeses.filter((p) => p.mes_ref === mes);
  const doAnt = doisMeses.filter((p) => p.mes_ref === mesAnt);

  const serie = Array.from({ length: 12 }, (_, i) => {
    const m = somarMeses(mes, i - 11);
    const s = serieBruta.find((x) => x.mes === m);
    return { mes: m, posts: s?.posts ?? 0, alcance: s?.alcance ?? 0 };
  });

  const formatos: Record<string, { formato: string; posts: number; alcance: number; interacoes: number }> = {};
  for (const p of doMes) {
    const f = p.formato || 'Outro';
    formatos[f] ??= { formato: f, posts: 0, alcance: 0, interacoes: 0 };
    formatos[f].posts++;
    formatos[f].alcance += Number(p.alcance) || 0;
    formatos[f].interacoes += Number(p.interacoes) || 0;
  }
  const por_formato = Object.values(formatos)
    .map((f) => ({ ...f, alcance_medio: f.posts ? Math.round(f.alcance / f.posts) : 0 }))
    .sort((a, b) => b.alcance - a.alcance);

  const top_posts = doMes
    .slice()
    .sort((a, b) => (b.alcance || 0) - (a.alcance || 0))
    .slice(0, 5)
    .map((p) => ({
      post_id: p.post_id, formato: p.formato, legenda: (p.legenda || '').slice(0, 140), permalink: p.permalink,
      thumbnail_url: p.thumbnail_url, publicado_em: p.publicado_em, alcance: p.alcance, interacoes: p.interacoes,
      engajamento_pct: eng(p.interacoes, p.alcance)
    }));

  const ultima = contas.length ? contas[contas.length - 1] : null;
  const contaMes = contas.filter((c) => c.mes === mes);
  const ganho = contaMes.length > 1 ? contaMes[contaMes.length - 1].seguidores - contaMes[0].seguidores : null;

  return {
    mes, mes_anterior: mesAnt, gerado_em,
    kpis: kpis(doMes), kpis_mes_anterior: kpis(doAnt),
    serie_12_meses: serie, por_formato, top_posts,
    conta: {
      seguidores: ultima ? ultima.seguidores : null, seguidores_ganhos_mes: ganho, dias_com_dados_no_mes: contaMes.length,
      alcance_conta_mes: soma(contaMes, 'alcance'), visitas_perfil_mes: soma(contaMes, 'visitas_perfil')
    }
  };
}

const ORDENS = ['publicado_em', 'alcance', 'visualizacoes', 'curtidas', 'comentarios', 'compartilhamentos', 'salvamentos', 'interacoes', 'engajamento_pct'];

export async function posts(q: { mes?: string; formato?: string; pilar?: string; ordem?: string; dir?: string; busca?: string; pagina?: string; por_pagina?: string }): Promise<PostsResp> {
  const ordem = ORDENS.includes(q.ordem || '') ? q.ordem! : 'publicado_em';
  const dir = q.dir === 'asc' ? 'asc' : 'desc';
  const por_pagina = Math.min(Math.max(parseInt(q.por_pagina || '20', 10) || 20, 1), 100);
  const pagina = Math.max(parseInt(q.pagina || '1', 10) || 1, 1);
  const busca = (q.busca || '').toString().toLowerCase();

  const cond: string[] = [];
  const params: unknown[] = [];
  if (q.mes) { params.push(q.mes); cond.push(`mes_ref = $${params.length}`); }
  if (q.formato) { params.push(q.formato); cond.push(`formato = $${params.length}`); }
  // Pilar (tabela posts_pilares): 'sem' = ainda sem pilar. A página confere o código antes (lib/pilares.ts).
  if (q.pilar === 'sem') cond.push('pp.pilar IS NULL');
  else if (q.pilar) { params.push(q.pilar); cond.push(`pp.pilar = $${params.length}`); }
  if (busca) { params.push(busca); cond.push(`strpos(lower(coalesce(legenda, '')), $${params.length}) > 0`); }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  // `ordem` vem de lista fechada, por isso pode entrar no SQL.
  const ENG = 'CASE WHEN alcance > 0 THEN round(interacoes::numeric / alcance * 1000) / 10 ELSE 0 END';
  const chave = ordem === 'engajamento_pct' ? ENG : ordem === 'publicado_em' ? 'publicado_em' : `coalesce(${ordem}, 0)`;
  params.push(por_pagina, (pagina - 1) * por_pagina);

  const r = await linhas<PostLinha & { engajamento_pct: string; total: number; pilar: string | null; pilar_origem: string | null }>(
    `SELECT ${COLS_POST}, (${ENG})::float8 AS engajamento_pct, count(*) OVER ()::int AS total, pp.pilar, pp.origem AS pilar_origem
       FROM posts LEFT JOIN posts_pilares pp USING (post_id) ${where}
      ORDER BY ${chave} ${dir}, publicado_em DESC, post_id
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  // Página além do fim não traz linhas; conta à parte para manter o total.
  const total = r.length ? r[0].total : (await linhas<{ n: number }>(`SELECT count(*)::int AS n FROM posts LEFT JOIN posts_pilares pp USING (post_id) ${where}`, params.slice(0, -2)))[0].n;
  const itens: Post[] = r.map(({ total: _t, ...p }) => ({ ...p, engajamento_pct: Number(p.engajamento_pct) }));
  return { total, pagina, por_pagina, ordem, dir, itens };
}

export async function post(id: string): Promise<PostResp> {
  const [p] = await linhas<PostLinha>(`SELECT ${COLS_POST}, conta_id FROM posts WHERE post_id = $1`, [id]);
  if (!p) return { erro: 'post_nao_encontrado' };
  const historico = await linhas<NonNullable<PostResp['historico']>[number]>(
    `SELECT ${iso('coletado_em')} AS coletado_em, alcance, visualizacoes, interacoes, curtidas, comentarios, compartilhamentos, salvamentos
       FROM metricas_snapshots WHERE post_id = $1 ORDER BY coletado_em`,
    [id]
  );
  return { post: { ...p, engajamento_pct: eng(p.interacoes, p.alcance) }, historico };
}

export async function conta(diasPedido: string): Promise<ContaResp> {
  const dias = Math.min(Math.max(parseInt(diasPedido || '30', 10) || 30, 1), 365);
  const serie = await linhas<ContaResp['serie'][number]>(
    `SELECT data::text AS dia, seguidores, alcance, visualizacoes, visitas_perfil FROM contas_diario
      WHERE data >= (now() AT TIME ZONE 'America/Sao_Paulo')::date - $1::int ORDER BY data`,
    [dias]
  );
  return { dias, serie };
}

type StoryLinha = Omit<Story, 'no_ar'> & { mes_ref: string };

function kpisStories(lista: StoryLinha[]): StoriesKpis {
  const alcance = soma(lista, 'alcance');
  const visualizacoes = soma(lista, 'visualizacoes');
  return {
    stories: lista.length, alcance, visualizacoes, respostas: soma(lista, 'respostas'),
    compartilhamentos: soma(lista, 'compartilhamentos'), interacoes: soma(lista, 'interacoes'),
    visitas_perfil: soma(lista, 'visitas_perfil'), seguidores_ganhos: soma(lista, 'seguidores_ganhos'),
    alcance_medio: lista.length ? Math.round(alcance / lista.length) : 0,
    saida_pct: visualizacoes ? Math.round((soma(lista, 'saidas') / visualizacoes) * 1000) / 10 : 0
  };
}

export async function stories(mesPedido?: string): Promise<StoriesResp> {
  const gerado_em = agoraSP();
  const mes = MES.test(mesPedido || '') ? mesPedido! : mesSP();
  const mesAnt = somarMeses(mes, -1);
  const [lista, [desde]] = await Promise.all([
    linhas<StoryLinha>(
      `SELECT story_id, formato, permalink, ${iso('publicado_em')} AS publicado_em, mes_ref, alcance, visualizacoes, respostas,
              compartilhamentos, interacoes, visitas_perfil, seguidores_ganhos, toques_avancar, toques_voltar, saidas, proximo_story,
              ${iso('atualizado_em')} AS atualizado_em
         FROM stories WHERE mes_ref IN ($1, $2) ORDER BY publicado_em DESC`,
      [mes, mesAnt]
    ),
    linhas<{ inicio: string | null }>(`SELECT ${iso('min(publicado_em)')} AS inicio FROM stories`)
  ]);
  const doMes = lista.filter((s) => s.mes_ref === mes);
  const limite = Date.now() - 86_400_000;
  const itens: Story[] = doMes.map(({ mes_ref: _m, ...s }) => ({ ...s, no_ar: new Date(s.publicado_em).getTime() > limite }));
  return {
    mes, mes_anterior: mesAnt, gerado_em, coleta_desde: desde?.inicio ?? null,
    kpis: kpisStories(doMes), kpis_mes_anterior: kpisStories(lista.filter((s) => s.mes_ref === mesAnt)), itens
  };
}

// Última coleta de posts ou Stories que deu certo (as duas rodam a cada 5 min). Usa o relógio do banco,
// porque o do servidor do n8n está atrasado. 'instagram_30min' é o nome antigo da coleta de posts.
export async function ultimaColeta(): Promise<string | null> {
  const [r] = await linhas<{ em: string | null }>(
    `SELECT ${iso('max(iniciado_em)')} AS em FROM sync_log
      WHERE fluxo IN ('instagram_30min', 'instagram_stories') AND status LIKE 'ok%' AND iniciado_em > now() - interval '7 days'`
  );
  return r?.em ?? null;
}
