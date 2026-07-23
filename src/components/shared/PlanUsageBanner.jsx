import { Crown, Users, CalendarDays } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTenantPlanOptional } from '../../context/PlanContext';
import { FEATURE_KEYS, isProOrAbove, PLAN_LABELS } from '../../constants/planFeatures';

export default function PlanUsageBanner() {
  const plan = useTenantPlanOptional();
  const { slug } = useParams();

  if (!plan?.planInfo || plan.loading) return null;

  const { planSlug, planNome } = plan;
  const team = plan.checkPlanLimit(FEATURE_KEYS.MAX_EMPLOYEES);
  const appts = plan.checkPlanLimit(FEATURE_KEYS.MAX_APPOINTMENTS_MONTH);
  const isPro = isProOrAbove(planSlug);

  return (
    <div className="mb-6 bg-surface border border-border-line rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2.5 rounded-xl shrink-0 ${isPro ? 'bg-amber-500/10 text-amber-500' : 'bg-brand/10 text-brand'}`}>
          {isPro ? <Crown size={20} /> : <SparklesIcon />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-text-muted tracking-wider">Seu plano</p>
          <p className="font-black text-text-base truncate">
            {planNome}
            {isPro && <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-lg">⭐ Pro</span>}
          </p>
        </div>
      </div>

      {!isPro && (
        <div className="flex flex-wrap gap-3 text-xs font-bold">
          {team.limit != null && (
            <span className="flex items-center gap-1.5 bg-background border border-border-line px-3 py-2 rounded-xl">
              <Users size={14} className="text-brand" />
              {team.usage}/{team.limit} funcionários
            </span>
          )}
          {appts.limit != null && (
            <span className="flex items-center gap-1.5 bg-background border border-border-line px-3 py-2 rounded-xl">
              <CalendarDays size={14} className="text-brand" />
              {appts.usage}/{appts.limit} agendamentos/mês
            </span>
          )}
          <Link
            to={`/${slug}/admin/plano`}
            className="inline-flex items-center gap-1.5 bg-brand text-white px-3 py-2 rounded-xl hover:brightness-110"
          >
            Upgrade Pro
          </Link>
        </div>
      )}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    </svg>
  );
}
