import PlanFeaturePage from '../../../components/shared/PlanFeaturePage';
import ModuleShell from '../../../components/shared/ModuleShell';
import { FEATURE_KEYS } from '../../../constants/planFeatures';

export default function AdminDominio() {
  return (
    <PlanFeaturePage
      featureKey={FEATURE_KEYS.DOMINIO_PROPRIO}
      title="Domínio Próprio"
      description="Use seu domínio (ex: agende.minhabarbearia.com.br) apontando para o Horza."
      badge="Plus"
    >
      <ModuleShell
        title="Domínio customizado"
        subtitle="DNS, SSL e validação de propriedade."
        stats={[
          { label: 'Domínio atual', value: 'slug.horza.app' },
          { label: 'Domínio custom', value: 'Não configurado' },
          { label: 'SSL', value: '—' },
          { label: 'Status DNS', value: 'Pendente' },
        ]}
        sections={[
          { title: 'Configurar domínio', placeholder: 'Input domínio + instruções CNAME/TXT.' },
          { title: 'Verificação', placeholder: 'Checklist de propagação DNS.' },
        ]}
        actions={[{ label: 'Salvar domínio' }, { label: 'Verificar DNS' }]}
      />
    </PlanFeaturePage>
  );
}
