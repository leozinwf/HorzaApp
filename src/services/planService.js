import { supabase } from './supabaseClient';
import { FEATURE_KEYS } from '../constants/planFeatures';

const cache = new Map();
const CACHE_TTL_MS = 60_000;

export async function fetchTenantPlanInfo(barbeariaId, { force = false } = {}) {
  if (!barbeariaId) return null;

  const cached = cache.get(barbeariaId);
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const { data, error } = await supabase.rpc('get_tenant_plan_info', {
    p_barbearia_id: barbeariaId,
  });

  if (error) {
    console.error('Erro ao carregar plano:', error.message);
    return cached?.data || null;
  }

  cache.set(barbeariaId, { data, at: Date.now() });
  return data;
}

export function invalidateTenantPlanCache(barbeariaId) {
  if (barbeariaId) cache.delete(barbeariaId);
  else cache.clear();
}

export function canUseFeature(planInfo, featureKey) {
  if (!planInfo?.features) return false;
  const feat = planInfo.features[featureKey];
  if (!feat) return false;
  if (featureKey === FEATURE_KEYS.MAX_EMPLOYEES || featureKey === FEATURE_KEYS.MAX_APPOINTMENTS_MONTH) {
    return true;
  }
  return feat.enabled === true;
}

export function getFeatureLimit(planInfo, featureKey) {
  const feat = planInfo?.features?.[featureKey];
  if (!feat || feat.limit == null) return null;
  return Number(feat.limit);
}

export function getFeatureUsage(planInfo, featureKey) {
  if (featureKey === FEATURE_KEYS.MAX_EMPLOYEES) {
    return planInfo?.team_count ?? 0;
  }
  if (featureKey === FEATURE_KEYS.MAX_APPOINTMENTS_MONTH) {
    return planInfo?.appointments_month ?? 0;
  }
  return planInfo?.usage?.[featureKey] ?? 0;
}

export function isAtPlanLimit(planInfo, featureKey) {
  const limit = getFeatureLimit(planInfo, featureKey);
  if (limit == null) return false;
  return getFeatureUsage(planInfo, featureKey) >= limit;
}

export function checkPlanLimit(planInfo, featureKey) {
  const limit = getFeatureLimit(planInfo, featureKey);
  if (limit == null) return { ok: true, limit: null, usage: getFeatureUsage(planInfo, featureKey) };
  const usage = getFeatureUsage(planInfo, featureKey);
  return { ok: usage < limit, limit, usage };
}

export async function masterSetTenantPlan(barbeariaId, planSlug) {
  const { error } = await supabase.rpc('master_set_tenant_plan', {
    p_barbearia_id: barbeariaId,
    p_plan_slug: planSlug,
  });
  if (error) throw error;
  invalidateTenantPlanCache(barbeariaId);
}

export async function ensureFreeSubscription(barbeariaId) {
  const { error } = await supabase.rpc('ensure_free_subscription', {
    p_barbearia_id: barbeariaId,
  });
  if (error) throw error;
  invalidateTenantPlanCache(barbeariaId);
}
