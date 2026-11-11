// Conteúdo da tela inicial (hub) que ainda não vem de nenhuma coleta.
// Edite aqui para trocar sites, avisos e coletas sem mexer no layout.

export type Status = 'ativo' | 'implantacao' | 'em_breve';

export const STATUS_ROTULO: Record<Status, string> = {
  ativo: 'Ativo',
  implantacao: 'Em implantação',
  em_breve: 'Em breve'
};

// O que é cada código de pasta do Kastir: o comercial vê o nome, com o código ao lado.
// Pasta que não estiver aqui (código novo, "Formulários", "Outros"...) aparece com o próprio nome, depois das campanhas.
export const CAMPANHAS: Record<string, string> = {
  '32CEO2026': 'O Plano Contábil',
  '30CEO2026': 'Alavanca Contábil Uberlândia',
  '29CEO2026': 'CEO Capital Advisors',
  '28CEO2026': 'Imersão de vendas',
  '27CEO2026': 'Imersão de vendas',
  '17CEO2026': 'Contador CEO Experience',
  '08CEO2026': 'Diagnóstico'
};

// tom: laranja = pendência, azul = informativo.
export type Aviso = { titulo: string; texto: string; tom: 'laranja' | 'azul' };

export function avisos(mesNome: string): Aviso[] {
  return [
    { titulo: 'Pendências do tráfego pago', texto: 'O kit de implantação tem perguntas para a gestão responder antes de ligar a coleta.', tom: 'laranja' },
    { titulo: `Metas de ${mesNome}`, texto: 'Defina as metas do mês para acompanhar no módulo de tráfego pago.', tom: 'azul' }
  ];
}

// ligada: false = ponto cinza ("ainda desligada"). `fonte`: o ponto só fica verde se essa fonte respondeu agora.
export const COLETAS: { nome: string; frequencia: string; ligada: boolean; fonte: 'instagram' | 'sites' | null }[] = [
  { nome: 'Instagram · posts', frequencia: 'a cada 5 min', ligada: true, fonte: 'instagram' },
  { nome: 'Instagram · stories', frequencia: 'a cada 5 min', ligada: true, fonte: 'instagram' },
  { nome: 'Instagram · conta', frequencia: 'diária', ligada: true, fonte: 'instagram' },
  { nome: 'Sites · Kastir', frequencia: 'a cada 5 min', ligada: true, fonte: 'sites' },
  { nome: 'Meta Ads e funil', frequencia: 'ainda desligada', ligada: false, fonte: null }
];
