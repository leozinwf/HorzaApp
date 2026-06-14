import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Checa se já existe uma sessão ativa ao abrir o app
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    // 2. Escuta em tempo real mudanças no login (Login, Logout, Cadastro)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Busca as permissões (role) e a barbearia atrelada ao usuário logado
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('barbearia_id, nome, role, whatsapp')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Erro ao carregar perfil do banco de dados:', err.message);
    }
  };

  // Função para deslogar de forma limpa
  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile: fetchProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook customizado para usar o Auth de forma simples em qualquer tela
export const useAuth = () => useContext(AuthContext);