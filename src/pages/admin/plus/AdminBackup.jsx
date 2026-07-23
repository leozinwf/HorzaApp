import PlanFeaturePage from '../../../components/shared/PlanFeaturePage';
import ModuleShell from '../../../components/shared/ModuleShell';
import { FEATURE_KEYS } from '../../../constants/planFeatures';

export default function AdminBackup() {
  return (
    <PlanFeaturePage
      featureKey={FEATURE_KEYS.BACKUP_AUTOMATICO}
      title="Backup Automático"
      description="Snapshots periódicos dos dados críticos da barbearia."
      badge="Plus"
    >
      <ModuleShell
        title="Backup & Restauração"
        subtitle="Agendamentos, clientes, financeiro e configurações."
        stats={[
          { label: 'Último backup', value: '—' },
          { label: 'Frequência', value: 'Diário' },
          { label: 'Retenção', value: '30 dias' },
          { label: 'Status', value: 'Inativo' },
        ]}
        sections={[
          { title: 'Histórico de backups', placeholder: 'Lista com data, tamanho e download.' },
          { title: 'Restaurar ponto', placeholder: 'Wizard de restauração com confirmação.' },
        ]}
        actions={[{ label: 'Backup manual agora' }, { label: 'Configurar agendamento' }]}
      />
    </PlanFeaturePage>
  );
}
