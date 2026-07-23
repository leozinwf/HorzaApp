import InstitutionalLayout from '../../components/layout/InstitutionalLayout';

export default function PaginaConsentimento() {
  return (
    <InstitutionalLayout title="Consentimento" subtitle="Informações sobre consentimento de dados e comunicações.">
      <p>
        Ao criar uma conta ou agendar um serviço, você consente com o tratamento de dados descrito na
        Política de Privacidade, na medida necessária para o funcionamento do Horza App.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">Comunicações</h2>
      <p>
        Podemos enviar notificações sobre agendamentos, alterações de conta e respostas de suporte.
        Comunicações de marketing serão enviadas apenas com consentimento explícito, quando aplicável.
      </p>
      <h2 className="text-base font-black text-text-base pt-2">Revogação</h2>
      <p>
        Você pode revogar consentimentos opcionais ou solicitar exclusão de conta pelo suporte.
        Alguns dados podem ser retidos por obrigação legal ou registro de transações.
      </p>
    </InstitutionalLayout>
  );
}
