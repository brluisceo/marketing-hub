export type Barra = { rotulo: string; valor: number; texto?: string; destaque?: boolean };

export default function Bars({ dados, altura = 110, mostrarValores = true, ariaLabel }: { dados: Barra[]; altura?: number; mostrarValores?: boolean; ariaLabel: string }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <figure className="bars" aria-label={ariaLabel} role="img">
      <div className="bars-area" style={{ height: altura + 34 }}>
        {dados.map((d, i) => (
          <div className="bars-col" key={i}>
            {mostrarValores ? <span className="bars-val">{d.texto ?? d.valor}</span> : null}
            <div className={'bars-bar' + (d.destaque ? ' is-hi' : '')} style={{ height: Math.max(3, Math.round((d.valor / max) * altura)) }} />
          </div>
        ))}
      </div>
      <div className="bars-labels">{dados.map((d, i) => <span key={i}>{d.rotulo}</span>)}</div>
    </figure>
  );
}
