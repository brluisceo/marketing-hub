export const metadata = { title: 'Sobre · Marketing HUB' };

// Texto para quem usa o hub (marketing, comercial): como e quando os números chegam e por que diferem do app.
// Se mudar a frequência das coletas no n8n, atualize a tabela abaixo.
const ATUALIZACOES: { oque: string; quando: string; detalhe: string }[] = [
  { oque: 'Posts recentes', quando: 'A cada 5 min', detalhe: 'Posts publicados nos últimos 14 dias.' },
  { oque: 'Posts mais antigos', quando: '1x por dia, às 6h', detalhe: 'Posts de 15 a 90 dias. Os com mais de 90 dias ficam com o último número lido.' },
  { oque: 'Stories', quando: 'A cada 5 min', detalhe: 'Só enquanto estão no ar (24 h). Depois fica o último número lido.' },
  { oque: 'Conta', quando: '1x por dia, de manhã', detalhe: 'Seguidores, alcance, visualizações e visitas ao perfil do dia anterior, já fechado.' }
];

const TERMOS: [string, string][] = [
  ['Alcance', 'Quantas contas diferentes viram o conteúdo. Se a mesma pessoa viu 3 vezes, conta 1.'],
  ['Visualizações', 'Quantas vezes o conteúdo foi exibido, contando as repetições.'],
  ['Interações', 'Curtidas, comentários, compartilhamentos e salvamentos somados (nos Stories: respostas e compartilhamentos).'],
  ['Engajamento', 'Interações divididas pelo alcance: de cada 100 pessoas que viram, quantas interagiram.'],
  ['Visitas ao perfil', 'Quantas vezes alguém abriu o perfil a partir de um Story (na tela Conta, as visitas do dia todo).'],
  ['Saídas (Stories)', 'Parte das visualizações em que a pessoa fechou os Stories naquele ponto.']
];

export default function Sobre() {
  return (
    <>
      <header className="toolbar"><h1>Sobre os dados</h1></header>
      <div className="content sobre">
        <p className="lead">
          Os números do hub vêm direto da Meta (dona do Instagram), da conta @rogerio.fameli. A busca é automática: ninguém digita nada.
          A faixa no topo da tela mostra quando foi a última atualização e quando vem a próxima.
        </p>

        <section className="panel">
          <h2>Quando cada informação é atualizada</h2>
          <div className="table-wrap">
            <table className="mini-table">
              <thead><tr><th>O quê</th><th>Quando</th><th>O que entra</th></tr></thead>
              <tbody>
                {ATUALIZACOES.map((a) => (
                  <tr key={a.oque}><td className="strong">{a.oque}</td><td className="sobre-quando">{a.quando}</td><td>{a.detalhe}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul>
            <li>
              <span className="strong">Não precisa recarregar a página (F5).</span> Quando chega a hora da próxima busca, a tela troca os números sozinha,
              sem perder o filtro ou o mês escolhido.
            </li>
            <li>
              Isso só acontece com a aba aberta na frente. Se você estava em outra aba ou outro programa, a tela se atualiza em poucos segundos quando você volta.
            </li>
            <li>
              Depois de cada busca, o site leva até 1 minuto para mostrar os números novos. Por isso, às vezes a faixa do topo já diz &quot;agora há pouco&quot;
              e os números ainda são da busca anterior. Eles acertam na atualização seguinte (até 5 min). Se tiver pressa, recarregue a página.
            </li>
            <li>
              Se a busca ficar mais de 15 minutos sem acontecer, aparece um ponto laranja com o aviso &quot;a coleta está atrasada&quot;. A tela continua
              tentando sozinha.
            </li>
            <li>A própria Meta também pode demorar alguns minutos para atualizar os números dela.</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Por que os números são diferentes do app do Instagram</h2>
          <ul>
            <li>
              <span className="strong">Só entra o orgânico.</span> O que veio de impulsionamento ou anúncio não aparece no hub. Um Reel impulsionado
              pode mostrar 2 mil de alcance aqui e 200 mil no app.
            </li>
            <li>
              <span className="strong">O total do mês é a soma dos posts publicados naquele mês</span>, com tudo o que cada post acumulou até hoje.
              O painel do Instagram soma tudo o que foi visto no período, inclusive Stories e posts antigos. Por isso os dois não batem, e isso é esperado.
            </li>
            <li>
              <span className="strong">O total da conta por dia</span>, que é o mais parecido com o app, fica na tela Conta.
            </li>
          </ul>
        </section>

        <section className="panel">
          <h2>O que cada número quer dizer</h2>
          <dl className="sobre-termos">
            {TERMOS.map(([t, d]) => (
              <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
            ))}
          </dl>
        </section>

        <section className="panel">
          <h2>Como ler as comparações</h2>
          <ul>
            <li>
              As setas <span className="delta-up">▲</span> e <span className="delta-down">▼</span> comparam com o <span className="strong">mês anterior inteiro</span>.
              No começo do mês é normal aparecer queda grande: um mês pela metade está sendo comparado com um mês fechado. A diferença diminui conforme o mês avança.
            </li>
            <li>No engajamento, a comparação vem em <span className="strong">p.p.</span> (pontos percentuais): passar de 5,1% para 5,8% é +0,7 p.p.</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Stories</h2>
          <ul>
            <li>A Meta só entrega os números de um Story enquanto ele está no ar. Por isso o hub tem Stories só a partir de 5 de novembro de 2026, quando a busca começou.</li>
            <li>Quando o Story sai do ar, fica guardado o último número lido. Ele pode ser um pouco menor que o final real, porque os últimos minutos (até 5) podem não entrar.</li>
            <li>Depois que o Story sai do ar, a imagem dele pode deixar de aparecer.</li>
          </ul>
        </section>

        <section className="panel">
          <h2>Histórico de cada post</h2>
          <p>
            O gráfico &quot;Evolução do alcance&quot;, na página de cada post, mostra uma barra por dia: o hub guarda uma foto dos números todo dia às 6h.
            Ele mostra como o post cresceu de um dia para o outro, mas não hora a hora.
          </p>
        </section>

        <p className="muted">Ficou com dúvida ou viu algum número estranho? Fale com a equipe de marketing.</p>
      </div>
    </>
  );
}
