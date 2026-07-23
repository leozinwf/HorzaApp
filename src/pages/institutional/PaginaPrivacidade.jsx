import InstitutionalLayout from '../../components/layout/InstitutionalLayout';

export default function PaginaPrivacidade() {
  return (
    <InstitutionalLayout title="Política de privacidade" subtitle="Como tratamos seus dados (texto provisório).">
      <p>
        O Horza respeita sua privacidade. Coletamos apenas dados necessários para operar agendamentos,
        contas, fidelidade e suporte.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">Dados coletados</h2>
      <p>
        Nome, e-mail, telefone/WhatsApp, histórico de agendamentos, dados da barbearia e informações de uso
        do painel administrativo.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">Finalidade</h2>
      <p>
        Prestação do serviço, comunicação sobre agendamentos, suporte, melhorias do produto e cumprimento legal.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">Compartilhamento</h2>
      <p>
        Dados podem ser processados por provedores essenciais (ex.: hospedagem Supabase, pagamentos Stripe).
        Não vendemos dados pessoais a terceiros.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">Seus direitos</h2>
      <p>
        Você pode solicitar correção ou exclusão de dados entrando em contato pelo suporte. Responderemos
        conforme a legislação aplicável (LGPD).
      </p>
    </InstitutionalLayout>
  );
}
