const nf = new Intl.NumberFormat('pt-BR');

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return nf.format(Math.round(n));
}

export function compacto(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '') + ' mi';
  if (Math.abs(n) >= 10_000) return Math.round(n / 1000) + ' mil';
  if (Math.abs(n) >= 1_000) return (n / 1000).toFixed(1).replace('.', ',').replace(',0', '') + ' mil';
  return nf.format(Math.round(n));
}

export function pct(n: number | null | undefined, casas = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toFixed(casas).replace('.', ',') + '%';
}

export type Delta = { texto: string; tom: 'up' | 'down' | 'neutro' };

export function deltaPct(atual: number, anterior: number): Delta {
  if (!anterior) return { texto: '', tom: 'neutro' };
  const v = ((atual - anterior) / anterior) * 100;
  if (Math.abs(v) < 0.5) return { texto: '0%', tom: 'neutro' };
  return { texto: (v > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(v)) + '%', tom: v > 0 ? 'up' : 'down' };
}

export function deltaPp(atual: number, anterior: number): Delta {
  const v = atual - anterior;
  if (Math.abs(v) < 0.05) return { texto: '0 p.p.', tom: 'neutro' };
  return { texto: (v > 0 ? '▲ ' : '▼ ') + Math.abs(v).toFixed(1).replace('.', ',') + ' p.p.', tom: v > 0 ? 'up' : 'down' };
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function nomeMes(ym: string, comAno = true): string {
  const [a, m] = ym.split('-').map(Number);
  const nome = MESES[(m || 1) - 1];
  return comAno ? `${nome[0].toUpperCase()}${nome.slice(1)} ${a}` : nome;
}

export function mesCurto(ym: string): string {
  const m = Number(ym.split('-')[1]);
  return MESES_CURTO[(m || 1) - 1];
}

export function mesAtual(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${p.find((x) => x.type === 'year')!.value}-${p.find((x) => x.type === 'month')!.value}`;
}

export function ultimosMeses(n: number, base = mesAtual()): string[] {
  const [a, m] = base.split('-').map(Number);
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const d = new Date(Date.UTC(a, m - 1 - k, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(iso));
}

export function dataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function haQuanto(iso?: string): string {
  if (!iso) return '';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export function vezes(a: number, b: number): string {
  if (!b) return '—';
  return (a / b).toFixed(1).replace('.', ',') + '×';
}

function horaSP(d = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(d));
}

export function saudacao(d = new Date()): string {
  const h = horaSP(d);
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// "Sexta-feira, 6 de novembro"
export function dataExtensa(d = new Date()): string {
  const s = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return s[0].toUpperCase() + s.slice(1);
}

// Datas sem hora ("2026-11-14", do calendário): lidas ao meio-dia UTC para o fuso não trocar o dia.
const doDia = (ymd: string) => new Date(`${ymd}T12:00:00Z`);

// Hoje em São Paulo, "yyyy-mm-dd".
export function diaAtual(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

// "sex"
export function diaSemana(ymd: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'short' }).format(doDia(ymd)).replace('.', '');
}

// "14/11"
export function diaMes(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

// "Sábado, 14 de novembro"
export function diaExtenso(ymd: string): string {
  const s = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(doDia(ymd));
  return s[0].toUpperCase() + s.slice(1);
}

// Mês anterior (passo -1) ou seguinte (+1) de "yyyy-MM".
export function mesVizinho(ym: string, passo: number): string {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + passo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
