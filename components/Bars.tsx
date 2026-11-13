import type { CSSProperties } from 'react';

// `fraco`: pouca amostra (cinza-claro). `titulo`: texto ao passar o mouse.
export type Barra = { rotulo: string; valor: number; texto?: string; destaque?: boolean; fraco?: boolean; titulo?: string };

// Alturas vão em variáveis CSS (e não em `height` direto) para o CSS poder deitar as barras em telas estreitas.
const v = (vars: Record<string, string | number>) => vars as CSSProperties;

// `teto`: valor que enche a barra (o padrão é o maior). Barras acima dele param no topo.
export default function Bars({ dados, altura = 110, mostrarValores = true, ariaLabel, teto }: { dados: Barra[]; altura?: number; mostrarValores?: boolean; ariaLabel: string; teto?: number }) {
  const max = Math.max(1, teto ?? Math.max(...dados.map((d) => d.valor)));
  const prop = (d: Barra) => Math.min(1, d.valor / max);
  return (
    <div className="bars-caixa">
      <figure className={'bars' + (mostrarValores ? ' bars-com-valores' : '') + (dados.some((d) => !d.rotulo) ? ' bars-esparso' : '')} aria-label={ariaLabel} role="img">
        <div className="bars-area" style={v({ '--area': `${altura + 34}px` })}>
          {dados.map((d, i) => (
            <div className="bars-col" key={i} style={v({ '--i': i + 1, '--p': prop(d) })} title={d.titulo}>
              {mostrarValores ? <span className="bars-val">{d.texto ?? d.valor}</span> : null}
              <div className={'bars-bar' + (d.destaque ? ' is-hi' : '') + (d.fraco ? ' is-pouca' : '')} style={v({ '--h': `${Math.max(3, Math.round(prop(d) * altura))}px` })} />
            </div>
          ))}
        </div>
        <div className="bars-labels">{dados.map((d, i) => <span key={i} style={v({ '--i': i + 1 })}>{d.rotulo}</span>)}</div>
      </figure>
    </div>
  );
}
