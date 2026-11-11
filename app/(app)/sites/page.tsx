import ErroApi from '@/components/ErroApi';
import { hub } from '@/lib/hub';
import { num } from '@/lib/format';
import { CAMPANHAS } from '@/lib/modulos';
import type { PaginaSite, SitesResp } from '@/lib/types';

export const metadata = { title: 'Sites no ar · Marketing HUB' };

// Quem mais usa esta tela é o comercial: só o que está no ar e de qual campanha é.
export default async function Sites() {
  let r: SitesResp;
  try {
    r = await hub.sites();
  } catch (e) {
    return <ErroApi mensagem={(e as Error).message} />;
  }

  const sem = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const pastas = new Map(r.pastas.map((f) => [f.id, f]));
  const grupos = new Map<string, PaginaSite[]>();
  for (const p of [...r.paginas].sort((a, b) => (b.publicada_em ?? '').localeCompare(a.publicada_em ?? ''))) {
    const k = p.pasta_id && pastas.has(p.pasta_id) ? p.pasta_id : '';
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(p);
  }
  // Campanhas com nome primeiro (a publicada por último no topo); pastas avulsas depois.
  const lista = [...grupos].map(([k, paginas]) => {
    const pasta = pastas.get(k);
    const campanha = pasta ? CAMPANHAS[pasta.nome] : undefined;
    return { k, paginas, cor: pasta?.cor ?? null, nome: campanha ?? pasta?.nome ?? 'Sem pasta', codigo: campanha ? pasta!.nome : null };
  });
  lista.sort((a, b) => Number(!a.codigo) - Number(!b.codigo));

  return (
    <>
      <header className="toolbar">
        <h1>Sites no ar</h1>
        <span className="muted">{num(r.paginas.length)} páginas no ar em {sem(r.site)}</span>
      </header>
      <div className="content content-flush">
        {r.exemplo ? <p className="notice">Dados de exemplo (11/11/2026) até o hub receber a chave de leitura do Kastir.</p> : null}
        {r.paginas.length === 0 ? (
          <div className="empty"><h2>Nenhuma página no ar</h2><p>As páginas aparecem aqui até 1 minuto depois de publicadas no Kastir.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table table-adapta">
              <thead>
                <tr><th>Página</th><th className="so-medio">Endereço</th></tr>
              </thead>
              {lista.map((g) => (
                <tbody key={g.k || 'sem-pasta'}>
                  <tr className="sites-grupo">
                    <th colSpan={2} scope="colgroup">
                      <span className="sites-grupo-nome">
                        <span className="pasta-ponto" style={g.cor ? { background: g.cor } : undefined} />
                        {g.nome}
                        {g.codigo ? <span className="muted">{g.codigo}</span> : null}
                      </span>
                    </th>
                  </tr>
                  {g.paginas.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="sites-pagina">
                          <span>{p.titulo}</span>
                          <a href={p.url} target="_blank" rel="noreferrer" className="small sites-endereco-curto">{sem(p.url)} ↗</a>
                        </span>
                      </td>
                      <td className="so-medio"><a href={p.url} target="_blank" rel="noreferrer" className="sites-endereco">{sem(p.url)} ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </div>
    </>
  );
}
