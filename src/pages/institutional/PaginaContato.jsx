import InstitutionalLayout from '../../components/layout/InstitutionalLayout';
import { HORZA_SUPPORT_EMAIL } from '../../constants/supportEmail';

export default function PaginaContato() {
  return (
    <InstitutionalLayout title="Contato" subtitle="Fale conosco por e-mail ou pelo formulário de suporte.">
      <p>
        O Horza App conecta clientes e barbearias. Para dúvidas comerciais, parcerias ou suporte técnico,
        utilize os canais abaixo.
      </p>
      <div className="bg-surface border border-border-line rounded-2xl p-5 not-prose space-y-2">
        <p><strong className="text-text-base">Suporte:</strong>{' '}
          <a href={`mailto:${HORZA_SUPPORT_EMAIL}`} className="text-brand font-bold">{HORZA_SUPPORT_EMAIL}</a>
        </p>
        <p><strong className="text-text-base">Cadastro de barbearias:</strong> use a página &quot;Cadastrar barbearia&quot; no app.</p>
      </div>
    </InstitutionalLayout>
  );
}
