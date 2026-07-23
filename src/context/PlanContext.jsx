import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useAdminBarbeariaId } from '../hooks/useAdminBarbeariaId';
import {
  canUseFeature,
  checkPlanLimit,
  fetchTenantPlanInfo,
  invalidateTenantPlanCache,
  isAtPlanLimit,
} from '../services/planService';
import { FEATURE_MIN_PLAN, getUpgradeCtaLabel } from '../constants/planFeatures';

const PlanContext = createContext(null);

export function PlanProvider({ children, barbeariaId: barbeariaIdProp }) {
  const { slug } = useParams();
  const { profile } = useAuth();
  const resolvedId = useAdminBarbeariaId();
  const barbeariaId = barbeariaIdProp || resolvedId || profile?.barbearia_id;

  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(!!barbeariaId);
  const planInfoRef = useRef(null);
  planInfoRef.current = planInfo;

  const reload = useCallback(async (force = true, { background = false } = {}) => {
    if (!barbeariaId) {
      setPlanInfo(null);
      setLoading(false);
      return;
    }
    if (!background && !planInfoRef.current) setLoading(true);
    const data = await fetchTenantPlanInfo(barbeariaId, { force });
    setPlanInfo((prev) => {
      if (prev && data && JSON.stringify(prev) === JSON.stringify(data)) return prev;
      return data;
    });
    setLoading(false);
  }, [barbeariaId]);

  useEffect(() => {
    reload(false);
  }, [reload, slug]);

  const value = useMemo(() => ({
    barbeariaId,
    planInfo,
    loading,
    planSlug: planInfo?.plan_slug || 'free',
    planNome: planInfo?.plan_nome || 'Horza Free',
    reload,
    invalidate: () => invalidateTenantPlanCache(barbeariaId),
    canUseFeature: (featureKey) => canUseFeature(planInfo, featureKey),
    checkPlanLimit: (featureKey) => checkPlanLimit(planInfo, featureKey),
    isAtPlanLimit: (featureKey) => isAtPlanLimit(planInfo, featureKey),
    getUpgradeTarget: (featureKey) => FEATURE_MIN_PLAN[featureKey] || 'pro',
    getUpgradeLabel: (featureKey) => getUpgradeCtaLabel(FEATURE_MIN_PLAN[featureKey] || 'pro'),
  }), [barbeariaId, planInfo, loading, reload]);

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

export function useTenantPlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error('useTenantPlan deve ser usado dentro de PlanProvider');
  }
  return ctx;
}

export function useTenantPlanOptional() {
  return useContext(PlanContext);
}
