import { useState } from 'react';
import PlanFeaturePage from '../../../components/shared/PlanFeaturePage';
import ModuleShell from '../../../components/shared/ModuleShell';
import { FEATURE_KEYS } from '../../../constants/planFeatures';

const IA_MODULOS = [
  { key: FEATURE_KEYS.IA_PREVISAO, label: 'Previsão', desc: 'Demanda e sazonalidade.' },
  { key: FEATURE_KEYS.IA_ESTOQUE, label: 'Estoque', desc: 'Reposição inteligente.' },
  { key: FEATURE_KEYS.IA_FINANCEIRA, label: 'Financeiro', desc: 'Tendências e alertas.' },
  { key: FEATURE_KEYS.IA_CLIENTES, label: 'Clientes', desc: 'Inativos e campanhas.' },
  { key: FEATURE_KEYS.IA_HORARIOS_VAGOS, label: 'Horários vazios', desc: 'Preencher cancelamentos.' },
  { key: FEATURE_KEYS.IA_PROMOCOES, label: 'Promoções', desc: 'Ofertas automáticas.' },
];

export default function AdminInteligencia() {
  const [aba, setAba] = useState(IA_MODULOS[0].key);
  const atual = IA_MODULOS.find((m) => m.key === aba) || IA_MODULOS[0];

  return (
    <PlanFeaturePage
      featureKey={FEATURE_KEYS.IA_PREVISAO}
      title="Inteligência Artificial Horza"
      description="Pacote de IA para demanda, estoque, financeiro, clientes e promoções."
      badge="Plus"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {IA_MODULOS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setAba(m.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                aba === m.key
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-surface border border-border-line text-text-muted hover:border-violet-500/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <ModuleShell
          title={`IA — ${atual.label}`}
          subtitle={atual.desc}
          status="coming_soon"
          sections={[
            {
              title: 'Insights gerados',
              placeholder: 'Cards de recomendações com explicação e ação sugerida.',
            },
            {
              title: 'Histórico de análises',
              placeholder: 'Log de previsões e acurácia ao longo do tempo.',
            },
          ]}
          actions={[{ label: 'Gerar análise' }, { label: 'Exportar relatório' }]}
        />
      </div>
    </PlanFeaturePage>
  );
}
