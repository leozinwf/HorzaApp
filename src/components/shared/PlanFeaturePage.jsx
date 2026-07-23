import { Lock, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantPlanOptional } from '../../context/PlanContext';
import { FEATURE_LABELS, PLAN_LABELS, PLAN_SLUGS } from '../../constants/planFeatures';

/** Página inteira gated por feature (ideal para módulos Plus). */
export default function PlanFeaturePage({
  featureKey,
  title,
  description,
  badge = 'Plus',
  children,
}) {
  const plan = useTenantPlanOptional();
  const { slug } = useParams();
  const upgradePath = slug ? `/${slug}/admin/plano` : '/';

  if (!plan) return children;

  const allowed = plan.canUseFeature(featureKey);
  if (allowed) return children;

  const minPlan = plan.getUpgradeTarget(featureKey);
  const label = FEATURE_LABELS[featureKey] || title || 'Este recurso';
  const isPlus = minPlan === PLAN_SLUGS.PLUS;

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div className="bg-surface border border-border-line rounded-3xl p-8 md:p-12 text-center shadow-sm">
        <div className={`inline-flex p-4 rounded-2xl mb-6 ${isPlus ? 'bg-violet-500/10 text-violet-500' : 'bg-amber-500/10 text-amber-500'}`}>
          <Lock size={32} />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${isPlus ? 'bg-violet-500/10 text-violet-600' : 'bg-amber-500/10 text-amber-600'}`}>
          Horza {badge}
        </span>
        <h1 className="text-2xl font-black text-text-base mt-4">{title || label}</h1>
        {description && (
          <p className="text-sm text-text-muted mt-3 max-w-md mx-auto leading-relaxed">{description}</p>
        )}
        <p className="text-xs text-text-muted mt-4">
          Disponível no {PLAN_LABELS[minPlan] || minPlan}.
        </p>
        <Link
          to={upgradePath}
          className="inline-flex items-center gap-2 mt-8 bg-brand text-white px-6 py-3 rounded-xl text-sm font-black hover:brightness-110"
        >
          <Sparkles size={16} />
          {plan.getUpgradeLabel(featureKey)}
        </Link>
      </div>
    </div>
  );
}
