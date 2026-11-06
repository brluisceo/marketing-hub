export const metadata = { title: 'Calendário e aprovação · Marketing HUB' };

export default function Calendario() {
  return (
    <>
      <header className="toolbar"><h1>Calendário e aprovação</h1></header>
      <div className="empty empty-page">
        <h2>Chega na próxima etapa</h2>
        <p>Aqui a equipe vai planejar os posts do mês, enviar para aprovação e acompanhar o que será publicado automaticamente ou pelo app, com aviso no celular na hora de publicar.</p>
        <p className="muted">As métricas de todos os posts publicados já aparecem em Posts.</p>
      </div>
    </>
  );
}
