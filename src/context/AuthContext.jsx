import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para injetar a cor no CSS
  const aplicarCorDaBarbearia = (corHex) => {
    if (corHex) {
      document.documentElement.style.setProperty('--color-brand', corHex);
    }
  };

  useEffect(() => {
    // 1. Carrega a sessão inicial assim que a aplicação abre
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro na inicialização da Auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escuta mudanças na autenticação (Login, Logout, Token Expirado, Recuperação de Senha)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 3. Função dedicada para buscar o Perfil com base no ID
  const fetchProfile = async (userId) => {
    try {
      // Vai buscar os dados do utilizador
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;
      setProfile(userData);

      // --- INÍCIO DA ALTERAÇÃO: Whitelabel (Cores Dinâmicas) ---
      // Se o utilizador estiver associado a uma barbearia, vai buscar a cor
      if (userData?.barbearia_id) {
        const { data: barbeariaData, error: barbeariaError } = await supabase
          .from('barbearias')
          .select('cor_primaria')
          .eq('id', userData.barbearia_id)
          .single();

        if (!barbeariaError && barbeariaData?.cor_primaria) {
          aplicarCorDaBarbearia(barbeariaData.cor_primaria);
        }
      }
      // --- FIM DA ALTERAÇÃO ---

    } catch (error) {
      console.error('Erro ao buscar o perfil do utilizador:', error.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // 4. Função global de Logout
  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    
    // Repõe a cor padrão do sistema (Laranja) ao fazer logout
    aplicarCorDaBarbearia('#f59e0b'); 
    
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);