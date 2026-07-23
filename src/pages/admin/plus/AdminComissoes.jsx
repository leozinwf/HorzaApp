import PlanFeaturePage from '../../../components/shared/PlanFeaturePage';
import ModuleShell from '../../../components/shared/ModuleShell';
import { FEATURE_KEYS } from '../../../constants/planFeatures';

export default function AdminComissoes() {
  return (
    <PlanFeaturePage
      featureKey={FEATURE_KEYS.COMISSAO_CONTROLE}
      title="Controle de Comissão"
      description="Regras de comissão por barbeiro, serviço e período de fechamento."
      badge="Plus"
    >
      <ModuleShell
        title="Comissões"
        subtitle="Percentuais, metas e fechamento quinzenal/mensal."
        stats={[
          { label: 'Regras ativas', value: '0' },
          { label: 'A pagar (mês)', value: 'R$ 0,00' },
          { label: 'Barbeiros', value: '—' },
          { label: 'Próximo fechamento', value: '—' },
        ]}
        sections={[
          { title: 'Regras de comissão', placeholder: 'Por serviço, por barbeiro ou fixo + variável.' },
          { title: 'Extrato de comissões', placeholder: 'Histórico por período e status (pendente/pago).' },
        ]}
        actions={[{ label: 'Nova regra' }, { label: 'Fechar período' }]}
      />
    </PlanFeaturePage>
  );
}
