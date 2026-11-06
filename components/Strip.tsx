import type { Delta } from '@/lib/format';

export type Stat = { rotulo: string; valor: string; delta?: Delta; sub?: string };

export default function Strip({ itens }: { itens: Stat[] }) {
  return (
    <div className="strip">
      {itens.map((s) => (
        <div className="stat" key={s.rotulo}>
          <span className="stat-label">{s.rotulo}</span>
          <span className="stat-value">
            {s.valor}
            {s.delta?.texto ? <span className={'delta delta-' + s.delta.tom}>{s.delta.texto}</span> : null}
          </span>
          {s.sub ? <span className="stat-sub">{s.sub}</span> : null}
        </div>
      ))}
    </div>
  );
}
