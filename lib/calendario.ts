// Calendário e aprovação: leitura, gravação e regras de quem pode o quê (só servidor).
// Tabelas `calendario_posts` e `calendario_historico` (db/schema.sql), usuário hub_site.
import { unstable_cache } from 'next/cache';
import { exigirBanco } from './db';
import { pode, type Papel } from './session';

export const FORMATOS = ['reels', 'carrossel', 'imagem', 'story'] as const;
export type Formato = (typeof FORMATOS)[number];
export const FORMATO_ROTULO: Record<Formato, string> = { reels: 'Reels', carrossel: 'Carrossel', imagem: 'Imagem', story: 'Story' };

export const ETAPAS = ['rascunho', 'em_aprovacao', 'ajustes', 'aprovado', 'publicado', 'cancelado'] as const;
export type Etapa = (typeof ETAPAS)[number];
export const ETAPA_ROTULO: Record<Etapa, string> = {
  rascunho: 'Rascunho',
  em_aprovacao: 'Em aprovação',
  ajustes: 'Ajustes pedidos',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  cancelado: 'Excluído'
};
// Na ordem do caminho de um post (colunas do Quadro). Excluídos não aparecem em lugar nenhum.
export const ETAPAS_VISIVEIS: Etapa[] = ['rascunho', 'em_aprovacao', 'ajustes', 'aprovado', 'publicado'];

export type AcaoHistorico = 'criou' | 'editou' | 'enviou' | 'aprovou' | 'ajustes' | 'publicou' | 'excluiu' | 'comentou';
export const ACAO_ROTULO: Record<AcaoHistorico, string> = {
  criou: 'criou o post',
  editou: 'editou',
  enviou: 'enviou para aprovação',
  aprovou: 'aprovou',
  ajustes: 'pediu ajustes',
  publicou: 'marcou como publicado',
  excluiu: 'excluiu',
  comentou: 'comentou'
};

export type PostPlanejado = {
  id: string;
  titulo: string;
  formato: Formato;
  data: string; // yyyy-mm-dd
  hora: string | null; // HH:MM
  legenda: string | null;
  arte_url: string | null;
  observacoes: string | null;
  etapa: Etapa;
  criado_por: string;
  criado_em: string;
  atualizado_por: string | null;
  atualizado_em: string;
  aprovado_por: string | null;
  aprovado_em: string | null;
};

export type DadosPost = Pick<PostPlanejado, 'titulo' | 'formato' | 'data' | 'hora' | 'legenda' | 'arte_url' | 'observacoes'>;
export type LinhaHistoricoPost = { id: string; em: string; autor: string; acao: AcaoHistorico; texto: string | null };

// ---------- Regras ----------

export type Acao = 'editar' | 'enviar' | 'aprovar' | 'ajustes' | 'publicar' | 'excluir' | 'comentar';

export const aprova = (papel: Papel) => pode(papel, 'admin');

// Qualquer pessoa logada cria e envia o próprio post; só owner/admin aprovam, pedem ajustes
// e mexem em post já aprovado. Publicado e excluído só recebem comentário (excluído, nem isso).
export function acoesPermitidas(p: PostPlanejado, quem: { email: string; papel: Papel }): Set<Acao> {
  const aprovador = aprova(quem.papel);
  const autorOuAprovador = aprovador || p.criado_por === quem.email.toLowerCase();
  const a = new Set<Acao>();
  switch (p.etapa) {
    case 'rascunho':
    case 'ajustes':
      if (autorOuAprovador) a.add('editar').add('enviar').add('excluir');
      break;
    case 'em_aprovacao':
      if (autorOuAprovador) a.add('editar').add('excluir');
      if (aprovador) a.add('aprovar').add('ajustes');
      break;
    case 'aprovado':
      if (autorOuAprovador) a.add('publicar');
      if (aprovador) a.add('editar').add('ajustes').add('excluir');
      break;
  }
  if (p.etapa !== 'cancelado') a.add('comentar');
  return a;
}

// ---------- Endereços e validação (parâmetros da URL e dos formulários) ----------

export type Visao = 'calendario' | 'quadro';
export type Endereco = { mes?: string; ver?: Visao; sel?: string; novo?: string; editar?: string; msg?: string };

export function enderecoCalendario(e: Endereco): string {
  const q = new URLSearchParams();
  if (e.mes) q.set('mes', e.mes);
  if (e.ver === 'quadro') q.set('ver', 'quadro');
  for (const k of ['sel', 'novo', 'editar', 'msg'] as const) if (e[k]) q.set(k, e[k] as string);
  const s = q.toString();
  return '/calendario' + (s ? `?${s}` : '');
}

export const ehMes = (v: unknown): v is string => typeof v === 'string' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(v);
export const ehId = (v: unknown): v is string => typeof v === 'string' && /^[1-9]\d{0,14}$/.test(v);
// Confere também se o dia existe (31/02 não passa).
export const ehDia = (v: unknown): v is string =>
  typeof v === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v;

// Dias que aparecem na grade do mês: de segunda antes do dia 1 até domingo depois do último dia.
export function diasDaGrade(mes: string): { dia: string; doMes: boolean }[] {
  const [a, m] = mes.split('-').map(Number);
  const recuo = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const total = Math.ceil((recuo + ultimo) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1, 1 - recuo + i));
    return { dia: d.toISOString().slice(0, 10), doMes: d.getUTCMonth() === m - 1 };
  });
}

// ---------- Leitura ----------

// Datas como texto: o `pg` transformaria `date` em Date no fuso do servidor e poderia trocar o dia.
const CAMPOS = `id::text, titulo, formato, data::text AS data, to_char(hora, 'HH24:MI') AS hora, legenda, arte_url, observacoes, etapa,
  criado_por, to_json(criado_em)#>>'{}' AS criado_em, atualizado_por, to_json(atualizado_em)#>>'{}' AS atualizado_em,
  aprovado_por, to_json(aprovado_em)#>>'{}' AS aprovado_em`;
const ORDEM = 'ORDER BY data, hora NULLS LAST, id';

export async function listarPosts(de: string, ate: string): Promise<PostPlanejado[]> {
  const r = await exigirBanco().query<PostPlanejado>(
    `SELECT ${CAMPOS} FROM calendario_posts WHERE data BETWEEN $1 AND $2 AND etapa <> 'cancelado' ${ORDEM}`,
    [de, ate]
  );
  return r.rows;
}

// O que está esperando alguém, de qualquer mês.
export async function listarPendentes(): Promise<PostPlanejado[]> {
  const r = await exigirBanco().query<PostPlanejado>(
    `SELECT ${CAMPOS} FROM calendario_posts WHERE etapa IN ('em_aprovacao', 'ajustes') ${ORDEM} LIMIT 50`
  );
  return r.rows;
}

// Inclui excluídos: quem chama decide o que fazer com eles.
export async function lerPost(id: string): Promise<PostPlanejado | null> {
  const r = await exigirBanco().query<PostPlanejado>(`SELECT ${CAMPOS} FROM calendario_posts WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function historicoDoPost(id: string): Promise<LinhaHistoricoPost[]> {
  const r = await exigirBanco().query<LinhaHistoricoPost>(
    `SELECT id::text, to_json(em)#>>'{}' AS em, autor, acao, texto FROM calendario_historico WHERE post_id = $1 ORDER BY em, id`,
    [id]
  );
  return r.rows;
}

// Nome de cada pessoa, tirado do último login (quem nunca entrou fica de fora). Muda raramente:
// guardado por 5 min para não custar uma ida ao banco a cada clique.
const nomesGuardados = unstable_cache(
  async (): Promise<[string, string][]> => {
    const r = await exigirBanco().query<{ email: string; nome: string }>(
      `SELECT DISTINCT ON (email) email, nome FROM acessos
        WHERE email IS NOT NULL AND resultado = 'ok' AND nome IS NOT NULL ORDER BY email, em DESC`
    );
    return r.rows.map((x) => [x.email, x.nome]);
  },
  ['calendario-nomes'],
  { revalidate: 300 }
);

export async function nomesDasPessoas(): Promise<Map<string, string>> {
  return new Map(await nomesGuardados());
}

// ---------- Gravação ----------
// Cada mudança é um comando só: grava o post e o histórico juntos (ou nenhum dos dois)
// e custa uma única ida ao banco, que está longe (~140 ms cada).

// Linhas do histórico que acompanham criar/editar: a ação principal, o comentário (se houver) e o envio (se houver).
// $c = comentário, $e = enviar; a ordem garante "criou → comentou → enviou" na tela.
const historicoJunto = (origem: string, autor: string, acao: string, c: string, e: string) => `
  INSERT INTO calendario_historico (post_id, autor, acao, texto)
  SELECT ${origem}.id, ${autor}, x.acao, x.texto
    FROM ${origem}, (VALUES (1, '${acao}', NULL::text), (2, 'comentou', ${c}::text), (3, 'enviou', NULL::text)) AS x(ordem, acao, texto)
   WHERE x.ordem = 1 OR (x.ordem = 2 AND ${c}::text IS NOT NULL) OR (x.ordem = 3 AND ${e}::boolean)
   ORDER BY x.ordem`;

// `comentario`: o que a pessoa escreveu em "Comentários" ao criar ou editar (vai para o histórico).
export async function criarPost(d: DadosPost, autor: string, enviar: boolean, comentario: string | null = null): Promise<string> {
  const r = await exigirBanco().query<{ id: string }>(
    `WITH novo AS (
       INSERT INTO calendario_posts (titulo, formato, data, hora, legenda, arte_url, observacoes, etapa, criado_por, atualizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $10::boolean THEN 'em_aprovacao' ELSE 'rascunho' END, $8, $8) RETURNING id
     ), hist AS (${historicoJunto('novo', '$8', 'criou', '$9', '$10')})
     SELECT id::text FROM novo`,
    [d.titulo, d.formato, d.data, d.hora, d.legenda, d.arte_url, d.observacoes, autor, comentario, enviar]
  );
  return r.rows[0].id;
}

// `etapaVista`: a etapa de quando a permissão foi conferida. Se alguém mudou o post
// nesse meio-tempo, nada é gravado e a função devolve false.
export async function editarPost(id: string, etapaVista: Etapa, d: DadosPost, autor: string, enviar: boolean, comentario: string | null = null): Promise<boolean> {
  const r = await exigirBanco().query<{ n: number }>(
    `WITH alterado AS (
       UPDATE calendario_posts SET titulo = $3, formato = $4, data = $5, hora = $6, legenda = $7, arte_url = $8, observacoes = $9,
              etapa = CASE WHEN $10::boolean THEN 'em_aprovacao' ELSE etapa END, atualizado_por = $11, atualizado_em = now()
        WHERE id = $1 AND etapa = $2 RETURNING id
     ), hist AS (${historicoJunto('alterado', '$11', 'editou', '$12', '$10')})
     SELECT count(*)::int AS n FROM alterado`,
    [id, etapaVista, d.titulo, d.formato, d.data, d.hora, d.legenda, d.arte_url, d.observacoes, enviar, autor, comentario]
  );
  return r.rows[0].n > 0;
}

export async function mudarEtapa(id: string, etapaVista: Etapa, para: Etapa, autor: string, acao: AcaoHistorico, texto: string | null): Promise<boolean> {
  const r = await exigirBanco().query(
    `WITH alterado AS (
       UPDATE calendario_posts SET etapa = $3::text, atualizado_por = $4::text, atualizado_em = now(),
              aprovado_por = CASE WHEN $3::text = 'aprovado' THEN $4::text WHEN $3::text IN ('publicado', 'cancelado') THEN aprovado_por END,
              aprovado_em  = CASE WHEN $3::text = 'aprovado' THEN now()    WHEN $3::text IN ('publicado', 'cancelado') THEN aprovado_em END
        WHERE id = $1 AND etapa = $2 RETURNING id
     )
     INSERT INTO calendario_historico (post_id, autor, acao, texto) SELECT id, $4::text, $5, $6 FROM alterado`,
    [id, etapaVista, para, autor, acao, texto]
  );
  return !!r.rowCount;
}

// Só comenta em post que existe e não foi excluído.
export async function comentarPost(id: string, autor: string, texto: string): Promise<boolean> {
  const r = await exigirBanco().query(
    `INSERT INTO calendario_historico (post_id, autor, acao, texto)
     SELECT id, $2, 'comentou', $3 FROM calendario_posts WHERE id = $1 AND etapa <> 'cancelado'`,
    [id, autor, texto]
  );
  return !!r.rowCount;
}
