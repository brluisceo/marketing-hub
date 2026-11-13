// Pilares (temas) de conteúdo dos posts do Instagram. Criados em 13/11/2026 a partir das legendas.
// Os códigos ficam gravados em `posts_pilares.pilar` (o banco só aceita estes): para criar ou renomear o código,
// mude também o CHECK em db/schema.sql. Trocar só o nome que aparece na tela é livre.
import type { Papel } from './session';

export const PILARES = {
  gestao: 'Gestão do escritório',
  vendas: 'Vendas e posicionamento',
  tributario: 'Tributário',
  mentalidade: 'Mentalidade',
  bastidores: 'Bastidores e vida pessoal',
  eventos: 'Eventos',
  casos: 'Casos de clientes',
  opiniao: 'Opinião e polêmica'
} as const;

export type Pilar = keyof typeof PILARES;
export const LISTA_PILARES = Object.keys(PILARES) as Pilar[];
export const ehPilar = (v: unknown): v is Pilar => typeof v === 'string' && Object.hasOwn(PILARES, v);
export const nomePilar = (p: string | null | undefined) => (p && ehPilar(p) ? PILARES[p] : 'Sem pilar');

// Quem pode marcar ou trocar o pilar de um post (o resto só vê).
export const PAPEL_MARCAR_PILAR: Papel = 'editor';
