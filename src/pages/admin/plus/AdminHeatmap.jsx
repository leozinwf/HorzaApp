import PlanFeaturePage from '../../../components/shared/PlanFeaturePage';
import ModuleShell from '../../../components/shared/ModuleShell';
import { FEATURE_KEYS } from '../../../constants/planFeatures';

export default function AdminHeatmap() {
  return (
    <PlanFeaturePage
      featureKey={FEATURE_KEYS.HEATMAP}
      title="Heatmap de Ocupação"
      description="Visualize horários mais movimentados e oportunidades de encaixe."
      badge="Plus"
    >
      <ModuleShell
        title="Mapa de Calor"
        subtitle="Ocupação por dia da semana e horário."
        stats={[
          { label: 'Pico da semana', value: '—' },
          { label: 'Horário ocioso', value: '—' },
          { label: 'Taxa ocupação', value: '—%' },
          { label: 'Período', value: '30 dias' },
        ]}
        sections={[
          {
            title: 'Heatmap semanal',
            placeholder: 'Grid dia × hora com intensidade de agendamentos.',
          },
          {
            title: 'Sugestões',
            placeholder: 'Promoções em horários vazios (integração IA Promoções).',
          },
        ]}
      />
    </PlanFeaturePage>
  );
}
