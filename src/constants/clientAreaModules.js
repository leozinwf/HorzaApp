import { Star, Calendar, User } from 'lucide-react';

export const CLIENT_AREA_ITEMS = [
  { id: 'fidelidade', icon: Star, label: 'Fidelidade', group: 'Minha conta' },
  { id: 'agendamentos', icon: Calendar, label: 'Histórico', group: 'Minha conta' },
  { id: 'perfil', icon: User, label: 'Conta', group: 'Minha conta' },
];

export const CLIENT_AREA_GROUP_ORDER = ['Minha conta'];
