export const PLAN_LABELS = {
  free: 'Horza Free',
  pro: 'Horza Pro',
  plus: 'Horza Plus',
  pending: 'Pendente',
};

export function getPlanLabel(slug, planNome) {
  if (planNome) return planNome;
  return PLAN_LABELS[slug] || slug || 'Free';
}

export function getPlanBadgeClass(slug) {
  switch (slug) {
    case 'pro':
      return 'bg-brand/15 text-brand border border-brand/30';
    case 'plus':
      return 'bg-violet-500/15 text-violet-600 border border-violet-500/30';
    case 'pending':
      return 'bg-orange-500/15 text-orange-600 border border-orange-500/30';
    case 'free':
    default:
      return 'bg-background border border-border-line text-text-muted';
  }
}

export function getPlanCardBorderClass(slug) {
  switch (slug) {
    case 'pro':
      return 'border-brand/40 ring-1 ring-brand/10';
    case 'plus':
      return 'border-violet-500/40 ring-1 ring-violet-500/10';
    case 'pending':
      return 'border-orange-500/30';
    default:
      return 'border-border-line';
  }
}
