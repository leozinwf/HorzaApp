import { LayoutDashboard, Building2, CalendarCheck, Users, Crown, Headphones } from 'lucide-react';

export const MASTER_MENU_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', group: 'Plataforma' },
  { id: 'empresas', icon: Building2, label: 'Empresas', group: 'Plataforma' },
  { id: 'agendamentos', icon: CalendarCheck, label: 'Agendamentos', group: 'Plataforma' },
  { id: 'usuarios', icon: Users, label: 'Usuários', group: 'Plataforma' },
  { id: 'suporte', icon: Headphones, label: 'Suporte', group: 'Plataforma' },
  { id: 'planos', icon: Crown, label: 'Planos Premium', group: 'Plataforma', accent: 'amber' },
];

export const MASTER_GROUP_ORDER = ['Plataforma'];
