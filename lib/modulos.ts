// Conteúdo da tela inicial (hub) que ainda não vem de nenhuma coleta.
// Edite aqui para trocar sites, avisos e coletas sem mexer no layout.

export type Status = 'ativo' | 'implantacao' | 'em_breve';

export const STATUS_ROTULO: Record<Status, string> = {
  ativo: 'Ativo',
  implantacao: 'Em implantação',
  em_breve: 'Em breve'
};

export const SITES: { dominio: string; situacao: string }[] = [
  { dominio: 'contadorceo.com.br', situacao: 'sem verificação ainda' },
  { dominio: 'contador100k.com.br', situacao: 'sem verificação ainda' }
];

// tom: laranja = pendência, azul = informativo.
export type Aviso = { titulo: string; texto: string; tom: 'laranja' | 'azul' };

export function avisos(mesNome: string): Aviso[] {
  return [
    { titulo: 'Pendências do tráfego pago', texto: 'O kit de implantação tem perguntas para a gestão responder antes de ligar a coleta.', tom: 'laranja' },
    { titulo: `Metas de ${mesNome}`, texto: 'Defina as metas do mês para acompanhar no módulo de tráfego pago.', tom: 'azul' }
  ];
}

// ligada: false = ponto cinza ("ainda desligada").
export const COLETAS: { nome: string; frequencia: string; ligada: boolean }[] = [
  { nome: 'Instagram · posts', frequencia: 'a cada 30 min', ligada: true },
  { nome: 'Instagram · stories', frequencia: 'a cada 15 min', ligada: true },
  { nome: 'Instagram · conta', frequencia: 'diária', ligada: true },
  { nome: 'Meta Ads e funil', frequencia: 'ainda desligada', ligada: false }
];
