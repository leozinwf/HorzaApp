import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const profileRequestId = useRef(0);

  const aplicarCorDaBarbearia = (corHex) => {
    if (corHex) {
      document.documentElement.style.setProperty('--color-brand', corHex);
    }
  };

  const fetchProfile = async (userId, requestId, silent = false) => {
    try {
      const { data, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId);

      if (userError) throw userError;
      if (requestId !== profileRequestId.current) return;

      if (!data || data.length === 0) {
        setProfile(null);
        return;
      }

      const userData = data[0];
      setProfile(userData);

      if (userData?.barbearia_id) {
        const { data: barbeariaData, error: barbeariaError } = await supabase
          .from('barbearias')
          .select('cor_primaria')
          .eq('id', userData.barbearia_id)
          .single();

        if (requestId !== profileRequestId.current) return;

        if (!barbeariaError && barbeariaData?.cor_primaria) {
          aplicarCorDaBarbearia(barbeariaData.cor_primaria);
        }
      }
    } catch (error) {
      if (requestId !== profileRequestId.current) return;
      console.error('Erro ao buscar o perfil do utilizador:', error.message);
      if (!silent) setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      const requestId = ++profileRequestId.current;
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id, requestId);
      } else {
        aplicarCorDaBarbearia('#f59e0b');
      }

      if (mounted) setAuthReady(true);
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const requestId = ++profileRequestId.current;
      setUser(session?.user ?? null);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        aplicarCorDaBarbearia('#f59e0b');
        setAuthReady(true);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await fetchProfile(session.user.id, requestId, true);
        }
        return;
      }

      if (session?.user) {
        await fetchProfile(session.user.id, requestId);
      } else {
        setProfile(null);
        aplicarCorDaBarbearia('#f59e0b');
      }

      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    profileRequestId.current += 1;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    aplicarCorDaBarbearia('#f59e0b');
    setAuthReady(true);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading: !authReady, authReady, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
