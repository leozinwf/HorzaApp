import InstitutionalLayout from '../../components/layout/InstitutionalLayout';

export default function PaginaTermos() {
  return (
    <InstitutionalLayout title="Termos de uso e serviço" subtitle="Última atualização: julho de 2026 (texto provisório).">
      <p>
        Ao utilizar o Horza App, você concorda com estes termos. Leia com atenção antes de usar a plataforma.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">1. Serviço</h2>
      <p>
        O Horza oferece ferramentas de agendamento, marketplace, painel administrativo e recursos opcionais pagos
        (planos Pro e Plus). Funcionalidades podem ser alteradas conforme evolução do produto.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">2. Contas</h2>
      <p>
        Você é responsável por manter suas credenciais seguras e por informações verdadeiras no cadastro.
        Barbearias são responsáveis pelos dados publicados e pelos atendimentos agendados.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">3. Pagamentos</h2>
      <p>
        Assinaturas da plataforma Horza são cobradas via Stripe. Pagamentos entre clientes e barbearias seguem
        regras dos gateways conectados (Stripe Connect, PIX, etc.).
      </p>
      <h2 className="text-base font-black text-text-base pt-2">4. Uso aceitável</h2>
      <p>
        É proibido usar o Horza para fins ilegais, fraudes, spam ou tentativas de comprometer a segurança do sistema.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">5. Alterações</h2>
      <p>
        Podemos atualizar estes termos. Continuar usando o app após mudanças implica aceitação da nova versão.
      </p>
    </InstitutionalLayout>
  );
}
