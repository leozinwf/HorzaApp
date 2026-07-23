/** Slugs oficiais dos planos Horza */
export const PLAN_SLUGS = {
  FREE: 'free',
  PRO: 'pro',
  PLUS: 'plus',
};

export const PLAN_LABELS = {
  free: 'Horza Free',
  pro: 'Horza Pro',
  plus: 'Horza Plus',
};

export const PLAN_PRICES = {
  pro: 49.9,
  plus: 129.9,
};

/** Chaves de features — espelham feature_definitions no banco */
export const FEATURE_KEYS = {
  MAX_EMPLOYEES: 'max_employees',
  MAX_APPOINTMENTS_MONTH: 'max_appointments_month',
  MARKETPLACE_PREMIUM: 'marketplace_premium',
  AGENDA_INTELIGENTE: 'agenda_inteligente',
  WHATSAPP_AUTOMATICO: 'whatsapp_automatico',
  FINANCEIRO_INTELIGENTE: 'financeiro_inteligente',
  ESTOQUE_INTELIGENTE: 'estoque_inteligente',
  FIDELIDADE_AVANCADA: 'fidelidade_avancada',
  DASHBOARD_AVANCADO: 'dashboard_avancado',
  PERSONALIZACAO_COR: 'personalizacao_cor',
  QR_CODE_CADEIRA: 'qr_code_cadeira',
  NOTIFICACOES_CLIENTES: 'notificacoes_clientes',
  GORJETA_DIGITAL: 'gorjeta_digital',
  COMISSAO_CONTROLE: 'comissao_controle',
  MULTIPLAS_UNIDADES: 'multiplas_unidades',
  BACKUP_AUTOMATICO: 'backup_automatico',
  DOMINIO_PROPRIO: 'dominio_proprio',
  HEATMAP: 'heatmap',
  IA_PREVISAO: 'ia_previsao',
  IA_ESTOQUE: 'ia_estoque',
  IA_FINANCEIRA: 'ia_financeira',
  IA_CLIENTES: 'ia_clientes',
  IA_HORARIOS_VAGOS: 'ia_horarios_vagos',
  IA_PROMOCOES: 'ia_promocoes',
};

/** Qual plano mínimo desbloqueia cada feature booleana */
export const FEATURE_MIN_PLAN = {
  [FEATURE_KEYS.MARKETPLACE_PREMIUM]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.AGENDA_INTELIGENTE]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.WHATSAPP_AUTOMATICO]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.FINANCEIRO_INTELIGENTE]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.ESTOQUE_INTELIGENTE]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.FIDELIDADE_AVANCADA]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.DASHBOARD_AVANCADO]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.PERSONALIZACAO_COR]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.QR_CODE_CADEIRA]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.NOTIFICACOES_CLIENTES]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.GORJETA_DIGITAL]: PLAN_SLUGS.PRO,
  [FEATURE_KEYS.COMISSAO_CONTROLE]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.MULTIPLAS_UNIDADES]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.BACKUP_AUTOMATICO]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.DOMINIO_PROPRIO]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.HEATMAP]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.IA_PREVISAO]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.IA_ESTOQUE]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.IA_FINANCEIRA]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.IA_CLIENTES]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.IA_HORARIOS_VAGOS]: PLAN_SLUGS.PLUS,
  [FEATURE_KEYS.IA_PROMOCOES]: PLAN_SLUGS.PLUS,
};

export const FEATURE_LABELS = {
  [FEATURE_KEYS.MARKETPLACE_PREMIUM]: 'Marketplace Premium',
  [FEATURE_KEYS.AGENDA_INTELIGENTE]: 'Agenda Inteligente',
  [FEATURE_KEYS.WHATSAPP_AUTOMATICO]: 'WhatsApp Automático',
  [FEATURE_KEYS.FINANCEIRO_INTELIGENTE]: 'Financeiro Inteligente',
  [FEATURE_KEYS.ESTOQUE_INTELIGENTE]: 'Estoque Inteligente',
  [FEATURE_KEYS.FIDELIDADE_AVANCADA]: 'Fidelidade Avançada',
  [FEATURE_KEYS.DASHBOARD_AVANCADO]: 'Dashboard Avançado',
  [FEATURE_KEYS.PERSONALIZACAO_COR]: 'Cor personalizada',
  [FEATURE_KEYS.QR_CODE_CADEIRA]: 'QR Code na cadeira',
  [FEATURE_KEYS.NOTIFICACOES_CLIENTES]: 'Notificações aos clientes',
  [FEATURE_KEYS.GORJETA_DIGITAL]: 'Gorjeta Digital',
  [FEATURE_KEYS.COMISSAO_CONTROLE]: 'Controle de Comissão',
  [FEATURE_KEYS.MULTIPLAS_UNIDADES]: 'Múltiplas Unidades',
  [FEATURE_KEYS.BACKUP_AUTOMATICO]: 'Backup Automático',
  [FEATURE_KEYS.DOMINIO_PROPRIO]: 'Domínio Próprio',
  [FEATURE_KEYS.HEATMAP]: 'Heatmap de Ocupação',
  [FEATURE_KEYS.IA_PREVISAO]: 'IA — Previsão de Demanda',
  [FEATURE_KEYS.IA_ESTOQUE]: 'IA — Estoque',
  [FEATURE_KEYS.IA_FINANCEIRA]: 'IA — Financeiro',
  [FEATURE_KEYS.IA_CLIENTES]: 'IA — Clientes',
  [FEATURE_KEYS.IA_HORARIOS_VAGOS]: 'IA — Horários Vagos',
  [FEATURE_KEYS.IA_PROMOCOES]: 'IA — Promoções',
  [FEATURE_KEYS.MAX_EMPLOYEES]: 'Mais funcionários',
  [FEATURE_KEYS.MAX_APPOINTMENTS_MONTH]: 'Mais agendamentos por mês',
};

export const isPlusOrAbove = (planSlug) => planSlug === PLAN_SLUGS.PLUS;

export const isProOrAbove = (planSlug) => planSlug === PLAN_SLUGS.PRO || planSlug === PLAN_SLUGS.PLUS;

export const getUpgradeCtaLabel = (minPlan) =>
  minPlan === PLAN_SLUGS.PLUS ? 'Conhecer Horza Plus' : 'Conhecer Horza Pro';

export const parsePlanLimitError = (message) => {
  if (!message?.includes('PLAN_LIMIT:')) return null;
  const parts = message.split(':');
  return {
    featureKey: parts[1],
    limit: Number(parts[2]) || null,
  };
};
