/** Papéis do sistema — valor no banco → rótulo exibido */
export const ROLE_LABELS = {
  cliente: 'Cliente',
  funcionario: 'Funcionário',
  gerente: 'Gerente',
  admin: 'Dono',
  super_admin: 'Admin Master',
};

/** Papéis que o painel Master pode atribuir */
export const MASTER_ASSIGNABLE_ROLES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'funcionario', label: 'Funcionário' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'admin', label: 'Dono (Admin Barbearia)' },
  { value: 'super_admin', label: 'Admin Master' },
];

/** Papéis dentro de uma barbearia (sem super_admin) */
export const BARBEARIA_ROLES = [
  { value: 'cliente', label: 'Cliente' },
  { value: 'funcionario', label: 'Funcionário' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'admin', label: 'Dono' },
];

export const getRoleLabel = (role) => ROLE_LABELS[role] || role || '—';

export const isDono = (profile, user = null) =>
  profile?.role === 'admin' || isSuperAdmin(user, profile);

export const SUPER_ADMIN_EMAIL = 'admin@barbearia.com';

export const isSuperAdmin = (user, profile) =>
  profile?.role === 'super_admin' || user?.email === SUPER_ADMIN_EMAIL;

/** Acesso ao painel admin de uma barbearia (/:slug/admin) */
export const canAccessBarbeariaAdmin = (user, profile) =>
  profile?.role === 'admin' ||
  profile?.role === 'gerente' ||
  isSuperAdmin(user, profile);

/** Acesso ao painel do barbeiro (/:slug/barbeiro) */
export const canAccessBarbeiroPanel = (user, profile) =>
  profile?.role === 'funcionario' ||
  profile?.role === 'gerente' ||
  profile?.role === 'admin' ||
  isSuperAdmin(user, profile);

/** Pode gerenciar a barbearia do slug (dono/gerente vinculado ou master) */
export const canManageBarbeariaSlug = (user, profile, barbeariaId) => {
  if (!barbeariaId) return false;
  if (isSuperAdmin(user, profile)) return true;
  if (profile?.barbearia_id !== barbeariaId) return false;
  if (profile?.role === 'admin' || profile?.role === 'gerente') return true;
  if (profile?.role === 'funcionario') return true;
  return false;
};
