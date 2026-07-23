import PlanFeaturePage from '../../../components/shared/PlanFeaturePage';
import ModuleShell from '../../../components/shared/ModuleShell';
import { FEATURE_KEYS } from '../../../constants/planFeatures';

export default function AdminUnidades() {
  return (
    <PlanFeaturePage
      featureKey={FEATURE_KEYS.MULTIPLAS_UNIDADES}
      title="Múltiplas Unidades"
      description="Gerencie filiais e barbearias do mesmo grupo empresarial em um só lugar."
      badge="Plus"
    >
      <ModuleShell
        title="Rede de Unidades"
        subtitle="Matriz, filiais e visão consolidada por empresa."
        stats={[
          { label: 'Unidades ativas', value: '1', hint: 'Plano Free: 1 unidade' },
          { label: 'Empresa vinculada', value: '—', hint: 'Via tabela empresas' },
          { label: 'Assinatura', value: 'Plus', hint: 'Cobrança por empresa' },
          { label: 'Sincronização', value: 'Off', hint: 'Configurável por unidade' },
        ]}
        sections={[
          {
            title: 'Unidades cadastradas',
            description: 'Lista de barbearias vinculadas à mesma empresa.',
            placeholder: 'Tabela de filiais + ações (ativar, desativar, transferir).',
          },
          {
            title: 'Painel consolidado',
            description: 'Agendamentos, faturamento e equipe agregados.',
            placeholder: 'Dashboard multi-unidade.',
          },
        ]}
        actions={[
          { label: 'Adicionar unidade' },
          { label: 'Convidar gerente de filial' },
        ]}
      />
    </PlanFeaturePage>
  );
}
