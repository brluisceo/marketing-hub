export default function ErroApi({ mensagem }: { mensagem: string }) {
  return (
    <div className="empty">
      <h2>Não foi possível carregar os dados</h2>
      <p>{mensagem}</p>
    </div>
  );
}
