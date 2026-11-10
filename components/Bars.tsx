import type { CSSProperties } from 'react';

export type Barra = { rotulo: string; valor: number; texto?: string; destaque?: boolean };

// Alturas vão em variáveis CSS (e não em `height` direto) para o CSS poder deitar as barras em telas estreitas.
const v = (vars: Record<string, string | number>) => vars as CSSProperties;

export default function Bars({ dados, altura = 110, mostrarValores = true, ariaLabel }: { dados: Barra[]; altura?: number; mostrarValores?: boolean; ariaLabel: string }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <div className="bars-caixa">
      <figure className={'bars' + (mostrarValores ? ' bars-com-valores' : '') + (dados.some((d) => !d.rotulo) ? ' bars-esparso' : '')} aria-label={ariaLabel} role="img">
        <div className="bars-area" style={v({ '--area': `${altura + 34}px` })}>
          {dados.map((d, i) => (
            <div className="bars-col" key={i} style={v({ '--i': i + 1, '--p': d.valor / max })}>
              {mostrarValores ? <span className="bars-val">{d.texto ?? d.valor}</span> : null}
              <div className={'bars-bar' + (d.destaque ? ' is-hi' : '')} style={v({ '--h': `${Math.max(3, Math.round((d.valor / max) * altura))}px` })} />
            </div>
          ))}
        </div>
        <div className="bars-labels">{dados.map((d, i) => <span key={i} style={v({ '--i': i + 1 })}>{d.rotulo}</span>)}</div>
      </figure>
    </div>
  );
}
