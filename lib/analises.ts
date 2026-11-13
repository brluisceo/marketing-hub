// Números da tela Análises (quando e o que postar), lidos do Postgres. Só no servidor.
// Estatística escolhida na tela: média (padrão, pedido do usuário em 13/11/2026) ou mediana (o post "do meio",
// que um viral não puxa). `maior` (maior alcance do grupo) deixa a tela avisar quando a média vem quase toda de um post só.
// Só entram posts com 7 dias ou mais, cujos números já assentaram. Uma consulta para os posts e outra para os Stories, juntas.
import { exigirBanco } from './db';
import type { AnalisesResp } from './types';

export const PERIODOS = [3, 6, 12] as const;
export const FORMATOS_ANALISE = ['Reel', 'Carrossel', 'Foto'] as const;
// Faixas de horário (hora de São Paulo). O índice é o que vai para o banco e volta em `faixa`.
export const FAIXAS = ['Até 9h', '9h–12h', '12h–15h', '15h–18h', '18h–21h', '21h+'] as const;
export const FAIXAS_LONGAS = ['antes das 9h', 'das 9h às 12h', 'das 12h às 15h', 'das 15h às 18h', 'das 18h às 21h', 'depois das 21h'] as const;

export type Estatistica = 'media' | 'mediana';
export type FiltroAnalises = { meses: number; formato?: string; pilar?: string; estat: Estatistica };

const LOCAL = "publicado_em AT TIME ZONE 'America/Sao_Paulo'";
const FAIXA = `CASE WHEN extract(hour FROM l) < 9 THEN 0 WHEN extract(hour FROM l) < 12 THEN 1 WHEN extract(hour FROM l) < 15 THEN 2
  WHEN extract(hour FROM l) < 18 THEN 3 WHEN extract(hour FROM l) < 21 THEN 4 ELSE 5 END`;
const lista = (sql: string, ordem: string) => `(SELECT coalesce(json_agg(x ORDER BY ${ordem}), '[]') FROM (${sql}) x)`;

// Os textos SQL só variam pela estatística (lista fechada), por isso podem ser montados aqui.
function consultas(e: Estatistica) {
  const est = (col: string) => (e === 'media' ? `avg(${col})` : `percentile_cont(0.5) WITHIN GROUP (ORDER BY ${col})`);
  const val = (col: string, casas = 0) => `coalesce(round((${est(col)})::numeric, ${casas})::float8, 0)`;
  const GRUPO = `count(*)::int AS n, ${val('alcance')} AS alcance, ${val('eng', 1)} AS engajamento, coalesce(max(alcance), 0)::int AS maior`;
  const COMPLETO = `${GRUPO}, ${val('salvamentos')} AS salvamentos, ${val('compartilhamentos')} AS compartilhamentos, ${val('comentarios')} AS comentarios`;

  // $1 = meses, $2 = formato (ou NULL), $3 = pilar (código, 'sem' ou NULL).
  const posts = `
WITH base AS (
  SELECT po.*, pp.pilar, po.${LOCAL} AS l
    FROM posts po LEFT JOIN posts_pilares pp USING (post_id)
   WHERE po.publicado_em >= now() - make_interval(months => $1)
),
p AS (
  SELECT *, CASE WHEN alcance > 0 THEN interacoes::numeric / alcance * 100 END AS eng FROM base
   WHERE publicado_em < now() - interval '7 days'
     AND ($2::text IS NULL OR formato = $2)
     AND ($3::text IS NULL OR ($3 = 'sem' AND pilar IS NULL) OR pilar = $3)
),
semanas AS (
  SELECT date_trunc('week', l) AS sem, count(*) AS n, ${est('alcance')} AS alc, sum(alcance) AS tot
    FROM base
   WHERE date_trunc('week', l) >= date_trunc('week', (now() - make_interval(months => $1)) AT TIME ZONE 'America/Sao_Paulo') + interval '7 days'
     AND date_trunc('week', l) < date_trunc('week', (now() - interval '7 days') AT TIME ZONE 'America/Sao_Paulo')
   GROUP BY 1
)
SELECT json_build_object(
  'total', (SELECT row_to_json(x) FROM (SELECT ${GRUPO} FROM p) x),
  'grade', ${lista(`SELECT extract(isodow FROM l)::int AS dia, ${FAIXA} AS faixa, ${GRUPO} FROM p GROUP BY 1, 2`, 'dia, faixa')},
  'horas', ${lista(`SELECT extract(hour FROM l)::int AS hora, ${GRUPO} FROM p GROUP BY 1`, 'hora')},
  'dias', ${lista(`SELECT extract(isodow FROM l)::int AS dia, ${GRUPO} FROM p GROUP BY 1`, 'dia')},
  'formatos', ${lista(`SELECT coalesce(formato, 'Outro') AS formato, ${COMPLETO} FROM p GROUP BY 1`, 'n DESC')},
  'pilares', ${lista(`SELECT pilar, ${COMPLETO} FROM p GROUP BY 1`, 'alcance DESC')},
  'frequencia', ${lista(`SELECT min(n)::int AS de, max(n)::int AS ate, count(*)::int AS semanas, ${val('alc')} AS alcance_post, ${val('tot')} AS alcance_semana
      FROM semanas GROUP BY CASE WHEN n <= 3 THEN 0 WHEN n <= 6 THEN 1 WHEN n <= 10 THEN 2 WHEN n <= 14 THEN 3 ELSE 4 END`, 'de')},
  'sem_pilar', (SELECT count(*)::int FROM base WHERE pilar IS NULL AND ($2::text IS NULL OR formato = $2))
) AS r`;

  // Stories: a Meta só entrega os números enquanto estão no ar, então o histórico começa em 05/11/2026.
  const stories = `
WITH s AS (
  SELECT *, ${LOCAL} AS l, (${LOCAL})::date AS dia FROM stories WHERE publicado_em >= now() - make_interval(months => $1)
),
seq AS (
  SELECT s.*, row_number() OVER (PARTITION BY dia ORDER BY publicado_em) AS pos,
         first_value(alcance) OVER (PARTITION BY dia ORDER BY publicado_em) AS primeiro
    FROM s
)
SELECT json_build_object(
  'total', (SELECT count(*)::int FROM s),
  'dias', (SELECT count(DISTINCT dia)::int FROM s),
  'desde', (SELECT to_char(min(publicado_em) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') FROM stories),
  'faixas', ${lista(`SELECT ${FAIXA} AS faixa, count(*)::int AS n, ${val('visualizacoes')} AS visualizacoes, ${val('alcance')} AS alcance FROM s GROUP BY 1`, 'faixa')},
  'sequencia', ${lista(`SELECT least(pos, 8)::int AS pos, count(DISTINCT dia)::int AS dias,
      ${val('CASE WHEN primeiro > 0 THEN alcance::numeric / primeiro * 100 END')} AS continuam_pct,
      ${val('CASE WHEN alcance > 0 THEN saidas::numeric / alcance * 100 END', 1)} AS saida_pct
      FROM seq GROUP BY 1`, 'pos')}
) AS r`;
  return { posts, stories };
}

const SQL = { media: consultas('media'), mediana: consultas('mediana') };

export async function analises(f: FiltroAnalises): Promise<AnalisesResp> {
  const db = exigirBanco();
  const sql = SQL[f.estat === 'mediana' ? 'mediana' : 'media'];
  const [posts, stories] = await Promise.all([
    db.query<{ r: Omit<AnalisesResp, 'gerado_em' | 'meses' | 'stories'> }>(sql.posts, [f.meses, f.formato || null, f.pilar || null]),
    db.query<{ r: AnalisesResp['stories'] }>(sql.stories, [f.meses])
  ]);
  return { gerado_em: new Date().toISOString(), meses: f.meses, ...posts.rows[0].r, stories: stories.rows[0].r };
}
