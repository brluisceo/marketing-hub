import type { CSSProperties } from 'react';
import { FAIXAS, FAIXAS_LONGAS } from '@/lib/analises';
import { compacto, num, pct } from '@/lib/format';
import type { AnalisesResp } from '@/lib/types';

const DIAS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const DIAS_LONGOS = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

type Celula = AnalisesResp['grade'][number];

// Quadro dia da semana × faixa de horário. Cor = valor médio ou típico (azul mais escuro = melhor).
// Combinação com menos de `minimo` posts fica cinza (pouca amostra) e não entra na escala nem no "melhor".
// `rotulo`: "médio" ou "típico", conforme a estatística escolhida na tela.
export default function MapaHorarios({ grade, medida, minimo, rotulo }: { grade: Celula[]; medida: 'alcance' | 'engajamento'; minimo: number; rotulo: string }) {
  const val = (c: Celula) => (medida === 'engajamento' ? c.engajamento : c.alcance);
  const confiaveis = grade.filter((c) => c.n >= minimo);
  const ordenados = confiaveis.map(val).sort((a, b) => a - b);
  // O topo da escala é o 90º percentil: um ou dois valores muito altos não deixam o resto todo claro.
  const piso = ordenados[0] ?? 0;
  const topo = ordenados[Math.floor(ordenados.length * 0.9)] ?? piso;
  const melhor = confiaveis.reduce<Celula | null>((m, c) => (!m || val(c) > val(m) ? c : m), null);
  return (
    <>
      <div className="mapa-caixa">
        <div className="mapa" role="table" aria-label={`${medida === 'engajamento' ? 'Engajamento' : 'Alcance'} ${rotulo} por dia da semana e horário`}>
          <div className="mapa-linha" role="row">
            <span role="columnheader" />
            {FAIXAS.map((f) => <span key={f} className="mapa-topo" role="columnheader">{f}</span>)}
          </div>
          {[1, 2, 3, 4, 5, 6, 7].map((dia) => (
            <div className="mapa-linha" role="row" key={dia}>
              <span className="mapa-dia" role="rowheader">{DIAS[dia]}</span>
              {FAIXAS.map((_, faixa) => {
                const c = grade.find((x) => x.dia === dia && x.faixa === faixa);
                if (!c) return <span key={faixa} className="mapa-cel is-vazia" role="cell" title="Nenhum post"><span className="sr-only">Nenhum post</span></span>;
                const t = topo > piso ? Math.max(0, Math.min(1, (val(c) - piso) / (topo - piso))) : 0.5;
                const pouca = c.n < minimo;
                const cls = 'mapa-cel' + (pouca ? ' is-pouca' : t > 0.55 ? ' is-escura' : '') + (c === melhor ? ' is-melhor' : '');
                return (
                  <span key={faixa} className={cls} role="cell" style={{ '--t': t.toFixed(2) } as CSSProperties}
                    title={`${DIAS_LONGOS[dia]}, ${FAIXAS_LONGAS[faixa]}: alcance ${rotulo} ${num(c.alcance)} · engajamento ${pct(c.engajamento)} · ${c.n} ${c.n === 1 ? 'post' : 'posts'}`}>
                    <span className="mapa-v">{medida === 'engajamento' ? pct(c.engajamento) : compacto(c.alcance)}</span>
                    <span className="mapa-n">{c.n} {c.n === 1 ? 'post' : 'posts'}</span>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mapa-legenda">
        <span className="mapa-escala">menos <i aria-hidden="true" /> mais {medida === 'engajamento' ? 'engajamento' : 'alcance'}</span>
        <span><span className="mapa-amostra" aria-hidden="true" />menos de {minimo} posts: pouca amostra</span>
        {melhor ? <span>Contorno preto: melhor combinação com amostra boa</span> : null}
      </div>
    </>
  );
}
