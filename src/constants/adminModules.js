import {
  LayoutDashboard, Users, Scissors, Package, DollarSign,
  Building2, CalendarDays, ShieldCheck, CreditCard, Star,
  UserCheck, Crown, Link2, Percent, Map as MapIcon, Brain, Database, Globe, Megaphone,
} from 'lucide-react';
import { FEATURE_KEYS } from './planFeatures';

/** Itens do menu admin tenant — featureKey opcional para badge/gate visual */
export const ADMIN_MENU_ITEMS = [
  { path: 'admin', icon: LayoutDashboard, label: 'Dashboard', group: 'Geral' },
  { path: 'admin/agenda', icon: CalendarDays, label: 'Agenda Geral', group: 'Operacional' },
  { path: 'admin/servicos', icon: Scissors, label: 'Serviços', group: 'Operacional' },
  { path: 'admin/estoque', icon: Package, label: 'Estoque', group: 'Operacional' },
  { path: 'admin/usuarios', icon: Users, label: 'Clientes', group: 'Pessoas' },
  { path: 'admin/equipe', icon: UserCheck, label: 'Equipe', group: 'Pessoas' },
  { path: 'admin/fidelidade', icon: Star, label: 'Fidelidade', group: 'Pessoas', featureKey: FEATURE_KEYS.FIDELIDADE_AVANCADA, softGate: true },
  { path: 'admin/plano', icon: Crown, label: 'Meu Plano', group: 'Financeiro' },
  { path: 'admin/pagamentos', icon: CreditCard, label: 'Pagamentos', group: 'Financeiro' },
  { path: 'admin/financeiro', icon: DollarSign, label: 'Financeiro', group: 'Financeiro', featureKey: FEATURE_KEYS.FINANCEIRO_INTELIGENTE, softGate: true },
  { path: 'admin/empresa', icon: Building2, label: 'Empresa', group: 'Config' },
  { path: 'admin/integracoes', icon: Link2, label: 'Integrações', group: 'Config' },
  { path: 'admin/comunicados', icon: Megaphone, label: 'Comunicados', group: 'Config', featureKey: FEATURE_KEYS.NOTIFICACOES_CLIENTES, softGate: true },
  { path: 'admin/permissoes', icon: ShieldCheck, label: 'Permissões', group: 'Config' },
  // Horza Plus
  { path: 'admin/unidades', icon: Building2, label: 'Unidades', group: 'Plus', featureKey: FEATURE_KEYS.MULTIPLAS_UNIDADES, plusOnly: true },
  { path: 'admin/comissoes', icon: Percent, label: 'Comissões', group: 'Plus', featureKey: FEATURE_KEYS.COMISSAO_CONTROLE, plusOnly: true },
  { path: 'admin/heatmap', icon: MapIcon, label: 'Heatmap', group: 'Plus', featureKey: FEATURE_KEYS.HEATMAP, plusOnly: true },
  { path: 'admin/inteligencia', icon: Brain, label: 'Inteligência IA', group: 'Plus', featureKey: FEATURE_KEYS.IA_PREVISAO, plusOnly: true },
  { path: 'admin/backup', icon: Database, label: 'Backup', group: 'Plus', featureKey: FEATURE_KEYS.BACKUP_AUTOMATICO, plusOnly: true },
  { path: 'admin/dominio', icon: Globe, label: 'Domínio', group: 'Plus', featureKey: FEATURE_KEYS.DOMINIO_PROPRIO, plusOnly: true },
];

export function buildAdminPath(slug, path) {
  return `/${slug}/${path}`;
}

const GROUP_ORDER = ['Geral', 'Operacional', 'Pessoas', 'Financeiro', 'Config', 'Plus'];

export function groupAdminMenuItems(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.group)) map.set(item.group, []);
    map.get(item.group).push(item);
  }
  return GROUP_ORDER.filter((name) => map.has(name)).map((name) => ({
    name,
    items: map.get(name),
  }));
}
