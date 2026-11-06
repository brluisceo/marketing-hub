'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { nomeMes, ultimosMeses } from '@/lib/format';

export default function MonthSelect({ valor }: { valor: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <label className="inline-field">
      Mês
      <select
        value={valor}
        onChange={(e) => {
          const q = new URLSearchParams(sp.toString());
          q.set('mes', e.target.value);
          q.delete('pagina');
          q.delete('sel');
          router.push(`${path}?${q.toString()}`);
        }}
      >
        {ultimosMeses(12).map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
      </select>
    </label>
  );
}
