// Retrato do Kastir em 11/11/2026 (lido pelo Claude, só leitura), no mesmo formato que o Kastir devolve.
// Usado antes da primeira leitura do n8n (fluxo "[HUB] Kastir — páginas"), sem banco ou com HUB_MOCK=1.
import type { KBruto, KPagina } from './kastir';

const PASTAS: [string, string, string | null][] = [
  ['cmtich3pt000027p8i9g5sb86', 'Base', null],
  ['cmtipcjxg000301o3lrvcgnik', '08CEO2026', '#3B82F6'],
  ['cmtisl5gb003n01o3e6sdur0j', '17CEO2026', '#F97316'],
  ['cmtkdmftp008r01o3cnxclzmu', '27CEO2026', '#22C55E'],
  ['cmu18rfan000k01p96om611d1', '28CEO2026', '#3B82F6'],
  ['cmu4j4qak001501p9ta1esklf', 'Formulários', '#EC4899'],
  ['cmubls5jt001v01p9aw9b4f4p', '29CEO2026', '#EAB308'],
  ['cmuejf60o004l01p9q5krprr2', 'Outros', '#F97316'],
  ['cmvtr53gt001u01o3k6bjkpe7', '30CEO2026', '#22C55E'],
  ['cmw11phzk003k01o3tgobrrq1', '32CEO2026', '#EC4899'],
  ['cmw5d51lv00aa01o3wx5l3pn8', 'Entregáveis', '#EAB308']
];

const [BASE, P08, P17, P27, P28, FORM, P29, OUTROS, P30, P32, ENTREG] = PASTAS.map((p) => p[0]);

// [id, título, endereço, publicada (P) ou rascunho (D), pasta, última publicação]
const PAGINAS: [string, string, string, 'P' | 'D', string, string | null][] = [
  ['cmwb6bz6g00by01o3tnsywadh', 'O Plano Contábil [03]', '32ceo2026-03', 'P', P32, '2026-11-11T14:39:21.318Z'],
  ['cmwaovfgq00au01o3771gn38q', 'O Plano Contábil [02]', '32ceo2026-02', 'P', P32, '2026-11-10T15:09:15.488Z'],
  ['cmw5d6x1f00ac01o3r9j96lwy', 'Guia 10 servicos com ia', 'guia-10-servicos-com-ia', 'P', ENTREG, '2026-11-06T19:25:41.891Z'],
  ['cmw402pgg008v01o3wsf4s3z1', 'PDI CEO', 'pdi-ceo', 'P', BASE, '2026-11-09T20:08:09.365Z'],
  ['cmw2am29j005c01o3oc1pm9tv', 'Acesso ao Plano Contábil', 'acesso-ao-plano-contabil', 'P', P32, '2026-11-04T15:50:12.755Z'],
  ['cmw24vc3k004501o38dm5nt4i', 'O Plano Contábil', '32ceo2026-01', 'P', P32, '2026-11-10T20:51:31.929Z'],
  ['cmw12f7mr003n01o37vj5htkf', 'Alavanca Contábil Uberlândia', '30ceo2026-02', 'P', P30, '2026-11-04T14:28:08.081Z'],
  ['cmvv3v81y003901o3dikhstij', 'Último dias do mês - Live e Story', 'ultimo-dias-do-mes-live-e-story', 'P', P08, '2026-10-30T15:20:10.554Z'],
  ['cmvv29da1002s01o30n6u5d1z', 'Último dias do mês - post feed', 'ultimo-dias-do-mes-post-feed', 'P', P08, '2026-10-30T14:55:39.257Z'],
  ['cmvu679u7002k01o30dne7izw', 'Último dias do mês', 'ultimo-dias-do-mes', 'P', P08, '2026-10-30T14:38:46.565Z'],
  ['cmvtr6z0z002001o358tvyo0x', '30CEO2026-UBERLÂNDIA-MG', '30ceo2026-uberlandia-mg-copia', 'D', P30, null],
  ['cmvtr6brw001w01o3scn8tsz5', '30CEO2026-UBERLÂNDIA-MG', '30ceo2026-uberlandia-mg', 'P', P30, '2026-10-29T22:07:56.882Z'],
  ['cmvr3dpci000i01o341teqv50', 'Black Friday | Contador CEO', 'black-friday', 'P', OUTROS, '2026-10-29T14:59:00.871Z'],
  ['cmvh33r3g008n01p9y2r2161y', 'planoceomakt', 'planoceomakt', 'P', OUTROS, '2026-11-10T14:38:39.344Z'],
  ['cmvh1dk9j008f01p9oo6oxdx7', 'Contador CEO | DIAGNÓSTICO', '08ceo2026-diagnostico', 'P', P08, '2026-10-27T12:51:29.081Z'],
  ['cmur0k84s005s01p92rqxszv3', 'Contador Ceo Experience | Contador Ceo [Oficial]', 'contadorceoexperience', 'P', P17, '2026-10-02T14:40:03.225Z'],
  ['cmupqeyrh005101p9854mjc9u', 'Anúncio Fameli + G4', 'anunciog4-fameli', 'P', FORM, '2026-10-01T16:12:03.981Z'],
  ['cmuejyiig004o01p9yo29njoi', 'Imersão de vendas | Contador Ceo [01]', 'imersao-de-vendas-contador-ceo-01', 'P', OUTROS, '2026-09-23T20:25:36.028Z'],
  ['cmuedy22q004101p9z0epa580', 'Webinar Nibo | Contador Ceo [01]', 'webinar-nibo-diagnostico', 'P', FORM, '2026-09-23T17:37:13.925Z'],
  ['cmud5gre6003k01p9w3bl8gvb', 'Imersão de vendas | Contador Ceo [OBRIGADO]', '28ceo2026-obrigado', 'P', P28, '2026-09-22T20:52:03.769Z'],
  ['cmucorxtw002l01p99svthg3q', 'Ceo Capital Advisors | Contador Ceo [02]', '29ceo2026-02', 'P', P29, '2026-09-22T13:12:23.470Z'],
  ['cmuborpif002b01p9yixqz6q3', 'Contador Ceo Experience | Contador CEO [CONFIRMAÇÃO DE PRESENÇA]', 'contador-ceo-experience-contador-ceo-confirmacao-de-presenca', 'D', P17, '2026-09-21T20:17:31.560Z'],
  ['cmublycez002001p9swww12ey', 'Contador Ceo Experience | Contador Ceo [Emissão de Ingresso]', '17ceo2026-emissao-de-ingresso', 'D', P17, '2026-09-21T18:58:05.384Z'],
  ['cmublfxae001r01p97j1hygil', 'Aceleração | Contador CEO [17]', '08ceo2026-17', 'P', P08, '2026-09-22T13:42:23.067Z'],
  ['cmu4hga0x000y01p9bj7nneyj', 'Formulário Apresentação Cont Summit', 'formulario-apresentacao-cont-summit', 'P', FORM, '2026-09-16T19:17:40.835Z'],
  ['cmu35adsg000r01p9kx25sjtj', 'Imersão de vendas | Contador Ceo [01]', '28ceo2026-01', 'P', P28, '2026-09-16T12:05:19.263Z'],
  ['cmtxhccyv000b01p9rbcx1iv6', 'Aceleração | Contador CEO [16]', '08ceo2026-16', 'D', P08, null],
  ['cmtngah1y00a501o3tsb4d5ph', 'Contador Ceo Experience | Contador CEO [16]', '17ceo2026-16', 'D', P17, null],
  ['cmtlsw7gr009y01o3d526348q', 'Aceleração | Contador CEO [15]', '08ceo2026-15', 'P', P08, '2026-09-10T12:00:50.878Z'],
  ['cmtkk4iew009h01o3j6diujmi', 'Aceleração | Contador CEO [14]', '08ceo2026-14', 'P', P08, '2026-09-02T20:37:07.315Z'],
  ['cmtkdtc54009001o3w25fuf83', 'Imersão de vendas | Contador Ceo [OBRIGADO]', '27ceo2026-obrigado', 'P', P27, '2026-09-02T17:40:28.419Z'],
  ['cmtkdnshr008u01o3leonhy8v', 'Imersão de vendas | Contador Ceo [01]', '27ceo2026-01', 'P', P27, '2026-09-02T17:39:20.314Z'],
  ['cmtithfxb004j01o3e128gwx0', 'Contador Ceo Experience | Contador CEO [07]', '17ceo2026-07', 'D', P17, '2026-09-01T15:23:34.493Z'],
  ['cmtitg2hi004f01o3ukn4rnqt', 'Contador Ceo Experience | Contador CEO [08]', '17ceo2026-08', 'D', P17, '2026-09-01T18:05:48.718Z'],
  ['cmtitezjg004d01o33odg8axx', 'Contador Ceo Experience | Contador CEO [14]', '17ceo2026-14', 'P', P17, '2026-09-01T17:30:41.419Z'],
  ['cmtitchyb004801o3c7p82c8m', 'Contador Ceo Experience | Contador CEO [15]', '17ceo2026-15', 'P', P17, '2026-09-01T15:19:43.732Z'],
  ['cmtitbqub004601o31wa5xyrl', 'Contador CEO Experience | Contador CEO [05]', '17ceo2026-05', 'P', P17, '2026-09-01T17:30:44.493Z'],
  ['cmtiswajh003x01o3gffwtuf4', 'Contador Ceo Experience | Contador CEO [OBRIGADOMEMBRO]', '17ceo2026-obrigadomembro', 'P', P17, '2026-09-01T15:07:07.044Z'],
  ['cmtisvj3q003u01o3cqvory5t', 'Contador Ceo Experience | Contador CEO [OBRIGADOVIP]', '17ceo2026-obrigadovip', 'P', P17, '2026-09-01T15:06:31.822Z'],
  ['cmtisr8u3003r01o3y3h2zsx6', 'Contador CEO Experience | Contador CEO [04]', '17ceo2026-04', 'D', P17, '2026-09-01T18:11:46.565Z'],
  ['cmtirz325003901o3djuk3l2u', 'Aceleração | Contador CEO [OBRIGADO]', '08ceo2026-obrigado', 'P', P08, '2026-09-01T14:41:56.726Z'],
  ['cmtirnsjp002i01o340bya15r', 'Aceleração | Contador CEO [06]', 'aceleracao', 'P', P08, '2026-09-01T14:38:15.957Z'],
  ['cmtiqucqc001d01o3r0a56bgy', 'Aceleração | Contador CEO [13]', '08ceo2026-13', 'P', P08, '2026-09-01T14:09:37.364Z'],
  ['cmtiqqubp001901o332vcnulk', 'Aceleração | Contador CEO [07]', '08ceo2026-07', 'P', P08, '2026-11-03T19:41:10.623Z'],
  ['cmtiqqfat001701o3y0ks9mt6', 'Aceleração | Contador CEO [12]', '08ceo2026-12', 'P', P08, '2026-09-01T14:26:27.739Z'],
  ['cmtiqo2y0001401o3jl2iec8y', 'Aceleração | Contador CEO [11]', '08ceo2026-11', 'P', P08, '2026-09-01T14:25:27.180Z'],
  ['cmtiqjsjb001001o3dq6p9ahb', 'Aceleração | Contador CEO [10]', '08ceo2026-10', 'P', P08, '2026-09-01T14:23:13.003Z'],
  ['cmtiqflcd000v01o3i3py34kq', 'Contador CEO', 'base', 'P', BASE, '2026-09-01T13:58:08.759Z'],
  ['cmtiqd1e6000l01o3a463bix5', 'Aceleração | Contador CEO [09]', '08ceo2026-09', 'P', P08, '2026-09-01T14:16:56.866Z'],
  ['cmtiq86ny000h01o35m00oo7o', 'Aceleração | Contador CEO [08]', '08ceo2026-08', 'P', P08, '2026-09-01T14:13:33.712Z'],
  ['cmtipzdp2000801o3jft6zw1p', 'Aceleração | Contador CEO [02]', '08ceo2026-02', 'P', P08, '2026-09-01T14:27:27.044Z']
];

const paginas: KPagina[] = PAGINAS.map(([id, title, slug, st, folderId, publishedAt]) => ({
  id, title, slug, status: st === 'P' ? 'PUBLISHED' : 'DRAFT', folderId, publishedAt
}));
export const exemploKastir: KBruto = {
  origem: 'https://lp.contadorceo.com.br',
  inicialId: 'cmtiqflcd000v01o3i3py34kq',
  paginas,
  pastas: PASTAS.map(([id, name, color]) => ({ id, name, color }))
};
