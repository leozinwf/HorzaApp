import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

/**
 * Resolve o barbearia_id do painel admin pela URL (/:slug/admin),
 * para o master operar na barbearia correta mesmo com outro vínculo no perfil.
 */
export function useAdminBarbeariaId() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const [barbeariaId, setBarbeariaId] = useState(profile?.barbearia_id ?? null);
  const [loading, setLoading] = useState(Boolean(slug));

  useEffect(() => {
    let ativo = true;

    const resolver = async () => {
      if (!slug) {
        if (ativo) {
          setBarbeariaId(profile?.barbearia_id ?? null);
          setLoading(false);
        }
        return;
      }

      const cacheKey = `admin_tenant_${slug}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached && ativo) setBarbeariaId(cached);

      const { data, error } = await supabase
        .from('barbearias')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!ativo) return;

      if (!error && data?.id) {
        setBarbeariaId(data.id);
        sessionStorage.setItem(cacheKey, data.id);
      } else {
        setBarbeariaId(profile?.barbearia_id ?? null);
      }
      setLoading(false);
    };

    resolver();
    return () => { ativo = false; };
  }, [slug, profile?.barbearia_id]);

  return { barbeariaId, loading };
}
