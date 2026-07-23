import { Lock, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantPlanOptional } from '../../context/PlanContext';
import { FEATURE_LABELS, PLAN_LABELS } from '../../constants/planFeatures';

export default function FeatureGate({
  featureKey,
  children,
  fallback,
  showLockOverlay = true,
  className = '',
}) {
  const plan = useTenantPlanOptional();
  const { slug } = useParams();

  if (!plan) return children;

  const allowed = plan.canUseFeature(featureKey);
  if (allowed) return children;

  if (fallback) return fallback;

  const minPlan = plan.getUpgradeTarget(featureKey);
  const label = FEATURE_LABELS[featureKey] || 'Este recurso';
  const upgradePath = slug ? `/${slug}/admin/plano` : '/';

  if (!showLockOverlay) {
    return (
      <div className={`rounded-2xl border border-dashed border-border-line bg-surface/50 p-6 text-center ${className}`}>
        <Lock size={28} className="mx-auto text-text-muted mb-3" />
        <p className="font-bold text-text-base text-sm">{label}</p>
        <p className="text-xs text-text-muted mt-1 mb-4">
          Disponível no {PLAN_LABELS[minPlan] || minPlan}.
        </p>
        <Link
          to={upgradePath}
          className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl text-xs font-black hover:brightness-110"
        >
          <Sparkles size={14} /> {plan.getUpgradeLabel(featureKey)}
        </Link>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none opacity-40 select-none blur-[0.3px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[2px] rounded-2xl p-4 text-center">
        <Lock size={24} className="text-brand mb-2" />
        <p className="text-sm font-black text-text-base">{label}</p>
        <p className="text-xs text-text-muted mt-1 mb-3">Desbloqueie com {PLAN_LABELS[minPlan]}.</p>
        <Link
          to={upgradePath}
          className="pointer-events-auto inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-xs font-black"
        >
          {plan.getUpgradeLabel(featureKey)}
        </Link>
      </div>
    </div>
  );
}
