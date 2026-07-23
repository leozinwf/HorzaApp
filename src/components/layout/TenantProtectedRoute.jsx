import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { canAccessBarbeariaAdmin, canManageBarbeariaSlug, isSuperAdmin } from '../../constants/roles';

const cacheKey = (slug, barbeariaId) => `tenant_ok_${slug}_${barbeariaId || 'master'}`;

export default function TenantProtectedRoute({ children, allowedRoles }) {
  const { user, profile, authReady } = useAuth();
  const { slug } = useParams();
  const master = isSuperAdmin(user, profile);

  const cached = slug && (master || profile?.barbearia_id)
    ? sessionStorage.getItem(cacheKey(slug, profile?.barbearia_id)) === '1'
    : false;

  const [tenantValid, setTenantValid] = useState(cached);
  const [checking, setChecking] = useState(!cached);

  useEffect(() => {
    if (!authReady) return;

    if (!user || !slug) {
      setTenantValid(false);
      setChecking(false);
      return;
    }

    if (master) {
      setTenantValid(true);
      setChecking(false);
      sessionStorage.setItem(cacheKey(slug, profile?.barbearia_id), '1');
      return;
    }

    if (!profile?.barbearia_id) {
      setTenantValid(false);
      setChecking(false);
      return;
    }

    if (sessionStorage.getItem(cacheKey(slug, profile.barbearia_id)) === '1') {
      setTenantValid(true);
      setChecking(false);
      return;
    }

    const validateTenant = async () => {
      const { data, error } = await supabase
        .from('barbearias')
        .select('id')
        .eq('slug', slug)
        .single();

      const ok = !error && canManageBarbeariaSlug(user, profile, data?.id);
      setTenantValid(ok);
      setChecking(false);

      if (ok) {
        sessionStorage.setItem(cacheKey(slug, profile.barbearia_id), '1');
      }
    };

    validateTenant();
  }, [slug, profile?.barbearia_id, authReady, user, master]);

  if (!authReady) return null;
  if (!user) return <Navigate to="/" replace />;
  if (checking && !tenantValid) return null;

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    const rotaPainelBarbearia = allowedRoles.includes('admin') || allowedRoles.includes('gerente');
    if (!(rotaPainelBarbearia && canAccessBarbeariaAdmin(user, profile))) {
      return <Navigate to={slug ? `/${slug}` : '/'} replace />;
    }
  }

  if (!tenantValid) return <Navigate to="/" replace />;

  return children;
}
