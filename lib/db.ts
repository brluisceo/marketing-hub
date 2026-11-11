// Conexão com o Postgres (usuário hub_site). Só no servidor.
// Grava só em `acessos`, `usuarios`, `usuarios_log` e nas tabelas do calendário (lib/calendario.ts); o resto é leitura.
import { Pool } from 'pg';
import { PAPEIS, papelValido, type Papel } from './session';

// Um só grupo de conexões para o site inteiro (lib/dados.ts usa este também). Fica em `globalThis`
// porque no modo dev o Next recarrega os módulos a cada mudança e cada cópia abriria conexões novas.
// As conexões ficam abertas 5 min sem uso: o banco está a ~140 ms daqui e abrir uma nova (TLS) custa ~1 s.
const global_ = globalThis as typeof globalThis & { __hubConexoes?: Pool };

export function banco(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!global_.__hubConexoes) {
    const p = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 5 * 60_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 30_000
    });
    // Conexão parada que cai (rede, reinício do banco) não pode derrubar o site: o grupo descarta e abre outra.
    p.on('error', (e) => console.error(`[db] conexão parada caiu: ${e.message}`));
    global_.__hubConexoes = p;
  }
  return global_.__hubConexoes;
}

export function exigirBanco(): Pool {
  const db = banco();
  if (!db) throw new Error('O banco não está configurado (DATABASE_URL vazia).');
  return db;
}

export type Situacao = { papel: Papel; bloqueado: boolean; cadastrado: boolean };

// Papel e bloqueio atuais. Sem cadastro = leitor liberado. Devolve null se o banco falhar:
// quem chama decide (o login segue como leitor; as páginas usam o papel do cookie).
export async function situacaoDe(email: string): Promise<Situacao | null> {
  const db = banco();
  if (!db) return null;
  try {
    const r = await db.query<{ papel: string; bloqueado: boolean }>('SELECT papel, bloqueado FROM usuarios WHERE email = $1', [email.toLowerCase()]);
    const u = r.rows[0];
    return u ? { papel: papelValido(u.papel), bloqueado: u.bloqueado, cadastrado: true } : { papel: 'leitor', bloqueado: false, cadastrado: false };
  } catch (e) {
    console.error(`[db] situação não lida: ${(e as Error).message}`);
    return null;
  }
}

type Acesso = { email?: string; nome?: string; resultado: string; ip?: string | null; navegador?: string | null };

// Falha ao gravar o registro não bloqueia o login, só aparece no log do servidor.
export async function registrarAcesso(a: Acesso): Promise<void> {
  const db = banco();
  if (!db) return;
  try {
    await db.query('INSERT INTO acessos (email, nome, resultado, ip, navegador) VALUES ($1, $2, $3, $4, $5)', [
      a.email?.toLowerCase().slice(0, 320) || null,
      a.nome?.slice(0, 200) || null,
      a.resultado.slice(0, 40),
      a.ip?.slice(0, 64) || null,
      a.navegador?.slice(0, 300) || null
    ]);
  } catch (e) {
    console.error(`[db] acesso não registrado: ${(e as Error).message}`);
  }
}

export type FiltroAcesso = 'todos' | 'ok' | 'saida' | 'recusados';
export type LinhaAcesso = { id: string; em: string; email: string | null; nome: string | null; resultado: string; ip: string | null; navegador: string | null; papel: string | null };
export type ResumoAcessos = { logins: number; pessoas: number; saidas: number; recusados: number; ultimo: string | null };

const RECUSADO = "resultado NOT IN ('ok', 'saida')";

// Últimos `dias` de registros (máx. 200 linhas na lista).
export async function listarAcessos(dias: number, filtro: FiltroAcesso): Promise<{ itens: LinhaAcesso[]; resumo: ResumoAcessos }> {
  const db = exigirBanco();
  const cond = { todos: '', ok: "AND a.resultado = 'ok'", saida: "AND a.resultado = 'saida'", recusados: `AND a.${RECUSADO}` }[filtro];
  const [lista, resumo] = await Promise.all([
    db.query<LinhaAcesso>(
      `SELECT a.id::text, to_json(a.em)#>>'{}' AS em, a.email, a.nome, a.resultado, a.ip, a.navegador, u.papel
         FROM acessos a LEFT JOIN usuarios u ON u.email = a.email
        WHERE a.em >= now() - make_interval(days => $1) ${cond}
        ORDER BY a.em DESC LIMIT 200`,
      [dias]
    ),
    db.query<{ logins: string; pessoas: string; saidas: string; recusados: string; ultimo: string | null }>(
      `SELECT count(*) FILTER (WHERE resultado = 'ok') AS logins,
              count(DISTINCT email) FILTER (WHERE resultado = 'ok') AS pessoas,
              count(*) FILTER (WHERE resultado = 'saida') AS saidas,
              count(*) FILTER (WHERE ${RECUSADO}) AS recusados,
              to_json(max(em) FILTER (WHERE resultado = 'ok'))#>>'{}' AS ultimo
         FROM acessos WHERE em >= now() - make_interval(days => $1)`,
      [dias]
    )
  ]);
  const r = resumo.rows[0];
  return {
    itens: lista.rows,
    resumo: { logins: Number(r.logins), pessoas: Number(r.pessoas), saidas: Number(r.saidas), recusados: Number(r.recusados), ultimo: r.ultimo }
  };
}

export type LinhaUsuario = { email: string; nome: string | null; papel: Papel; bloqueado: boolean; cadastrado: boolean; ultimo_acesso: string | null };

// Todo mundo que está cadastrado ou que já entrou pelo menos uma vez.
export async function listarUsuarios(): Promise<LinhaUsuario[]> {
  const r = await exigirBanco().query<LinhaUsuario & { papel: string }>(
    `WITH ult AS (
       SELECT DISTINCT ON (email) email, nome, em FROM acessos
        WHERE email IS NOT NULL AND resultado = 'ok' ORDER BY email, em DESC
     ), todos AS (SELECT email FROM usuarios UNION SELECT email FROM ult)
     SELECT t.email, ult.nome, coalesce(u.papel, 'leitor') AS papel, coalesce(u.bloqueado, false) AS bloqueado,
            u.email IS NOT NULL AS cadastrado, to_json(ult.em)#>>'{}' AS ultimo_acesso
       FROM todos t LEFT JOIN usuarios u USING (email) LEFT JOIN ult USING (email)
      ORDER BY coalesce(u.bloqueado, false), array_position($1::text[], coalesce(u.papel, 'leitor')), coalesce(ult.nome, t.email)`,
    [PAPEIS as unknown as string[]]
  );
  return r.rows.map((u) => ({ ...u, papel: papelValido(u.papel) }));
}

// Grava a mudança e o histórico juntos (ou nenhum dos dois).
export async function salvarUsuario(alvo: string, mudanca: { papel?: Papel; bloqueado?: boolean }, autor: string): Promise<void> {
  const c = await exigirBanco().connect();
  try {
    await c.query('BEGIN');
    const antes = (await c.query<{ papel: string; bloqueado: boolean }>('SELECT papel, bloqueado FROM usuarios WHERE email = $1 FOR UPDATE', [alvo])).rows[0];
    const papelAntes = antes ? papelValido(antes.papel) : 'leitor';
    const papel = mudanca.papel ?? papelAntes;
    const bloqueado = mudanca.bloqueado ?? antes?.bloqueado ?? false;
    await c.query(
      `INSERT INTO usuarios (email, papel, bloqueado, alterado_por) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET papel = EXCLUDED.papel, bloqueado = EXCLUDED.bloqueado,
         alterado_por = EXCLUDED.alterado_por, atualizado_em = now()`,
      [alvo, papel, bloqueado, autor]
    );
    const log = (acao: string, detalhe: string | null) =>
      c.query('INSERT INTO usuarios_log (autor, alvo, acao, detalhe) VALUES ($1, $2, $3, $4)', [autor, alvo, acao, detalhe]);
    if (!antes) await log('cadastro', papel);
    else if (papel !== papelAntes) await log('papel', `${papelAntes} → ${papel}`);
    if (bloqueado !== (antes?.bloqueado ?? false)) await log(bloqueado ? 'bloqueio' : 'liberacao', null);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export type LinhaHistorico = { id: string; em: string; autor: string; alvo: string; acao: string; detalhe: string | null };

export async function listarHistorico(limite = 50): Promise<LinhaHistorico[]> {
  const r = await exigirBanco().query<LinhaHistorico>(
    `SELECT id::text, to_json(em)#>>'{}' AS em, autor, alvo, acao, detalhe FROM usuarios_log ORDER BY em DESC LIMIT $1`,
    [limite]
  );
  return r.rows;
}
