'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Lista de escolha que troca um filtro da URL na hora (sem botão "Aplicar"). Valor vazio = tira o filtro.
export default function FiltroSelect({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor: string; opcoes: [string, string][] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <label className="inline-field">
      {rotulo}
      <select
        value={valor}
        onChange={(e) => {
          const q = new URLSearchParams(sp.toString());
          if (e.target.value) q.set(nome, e.target.value);
          else q.delete(nome);
          router.push(`${path}?${q.toString()}`, { scroll: false });
        }}
      >
        {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
