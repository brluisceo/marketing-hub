import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import InstalarApp from '@/components/InstalarApp';
import { configGoogle } from '@/lib/google';
import { COOKIE, DOMINIO, destinoSeguro, lerSessao, segredoConfigurado } from '@/lib/session';

export const metadata = { title: 'Entrar · Marketing HUB' };

const MENSAGENS: Record<string, string> = {
  dominio: `Essa conta não é @${DOMINIO}. Entre com o seu e-mail da empresa.`,
  cancelado: 'O login foi cancelado. Tente de novo quando quiser.',
  expirou: 'O login demorou demais ou foi aberto em outra aba. Tente de novo.',
  config: 'O login com Google ainda não foi configurado no servidor. Avise quem administra o HUB.',
  falha: 'Não foi possível entrar agora. Tente de novo em instantes.',
  bloqueado: 'Seu acesso ao HUB foi desativado. Fale com quem administra o HUB.'
};

const icone = (d: React.ReactNode) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const IconeAlerta = icone(<><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16.5v.01" /></>);
const IconeOk = icone(<><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></>);
const IconeEntrar = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5" /><path d="M15 12H4" /></svg>
);

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string; next?: string; saiu?: string }> }) {
  const sp = await searchParams;
  const destino = destinoSeguro(sp.next);
  if (await lerSessao((await cookies()).get(COOKIE)?.value)) redirect(destino);

  const configurado = configGoogle() && segredoConfigurado();
  // Object.hasOwn: "?erro=toString" não pode virar uma função herdada do objeto.
  const erro = !configurado ? MENSAGENS.config : sp.erro ? (Object.hasOwn(MENSAGENS, sp.erro) ? MENSAGENS[sp.erro] : MENSAGENS.falha) : null;
  // Convite para instalar como app: só no celular. Decidido aqui (e não no navegador) para a tela não "pular" ao carregar.
  const ua = (await headers()).get('user-agent') ?? '';
  const celular = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : null;
  return (
    <main className="login">
      <span className="login-bolha login-bolha-1" aria-hidden="true" />
      <span className="login-bolha login-bolha-2" aria-hidden="true" />
      <span className="login-bolha login-bolha-3" aria-hidden="true" />
      <div className="login-centro">
        <div className="login-card">
          <div className="login-head">
            <span className="login-icone" aria-hidden="true">M</span>
            <h1>Marketing HUB</h1>
            <p>Entre para ver as métricas de conteúdo e o planejamento da equipe.</p>
          </div>

          <div className="login-acoes">
            {erro ? (
              <p className="login-aviso login-aviso-erro" role="alert">{IconeAlerta}{erro}</p>
            ) : sp.saiu ? (
              <p className="login-aviso" role="status">{IconeOk}Você saiu do HUB.</p>
            ) : null}
            <a className="login-btn" href={`/api/auth/google?next=${encodeURIComponent(destino)}`}>
              {IconeEntrar}
              <span>Entrar com Google</span>
            </a>
            <p className="login-dica">
              Use sua conta Google <strong>@{DOMINIO}</strong>. O acesso é liberado para quem está na equipe cadastrada.
            </p>
          </div>
          {celular && <InstalarApp plataforma={celular} />}
        </div>
      </div>
      <footer className="login-rodape">
        <span>Acesso restrito · Grupo ABS</span>
        <span>Problemas para entrar? Fale com quem administra o HUB.</span>
      </footer>
    </main>
  );
}
