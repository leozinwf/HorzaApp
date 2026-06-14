import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Scissors, Lock, Mail, User, Phone } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        // FLUXO DE CADASTRO
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData?.user) {
          const { error: profileError } = await supabase.from('usuarios').insert([
            {
              id: authData.user.id,
              nome,
              whatsapp,
              role: 'cliente',
              barbearia_id: null, // Clientes não ficam presos a uma única barbearia inicialmente
            },
          ]);

          if (profileError) throw profileError;
        }
        
        alert('Cadastro realizado com sucesso! Faça login para continuar.');
        setIsRegister(false); // Volta para a tela de login
      } else {
        // FLUXO DE LOGIN
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;
        
        // INTELIGÊNCIA DE REDIRECIONAMENTO:
        const rascunho = localStorage.getItem('agendamento_pendente');
        if (rascunho) {
          navigate('/agendar'); // Devolve o cliente para o agendamento em andamento
        } else {
          navigate('/'); // Se entrou normal pelo menu, vai para a Home
        }
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-text-base">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 shadow-md border border-border-line">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-full bg-brand/10 p-4 text-brand mb-3">
            <Scissors size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">BarberSaaS</h1>
          <p className="text-sm text-text-muted mt-1 text-center">
            {isRegister ? 'Crie a sua conta de cliente' : 'Entre para acessar sua conta'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20">
            {error}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute top-3 left-3 text-text-muted" size={18} />
                  <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 pl-10 text-sm text-text-base focus:border-brand focus:outline-none transition-colors" placeholder="Seu nome completo" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute top-3 left-3 text-text-muted" size={18} />
                  <input required type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 pl-10 text-sm text-text-base focus:border-brand focus:outline-none transition-colors" placeholder="(11) 99999-9999" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 text-text-muted" size={18} />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 pl-10 text-sm text-text-base focus:border-brand focus:outline-none transition-colors" placeholder="seuemail@exemplo.com" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute top-3 left-3 text-text-muted" size={18} />
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 pl-10 text-sm text-text-base focus:border-brand focus:outline-none transition-colors" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full cursor-pointer rounded-xl bg-brand p-3 text-sm font-bold text-white hover:bg-brand-hover transition-colors disabled:opacity-50 mt-2 shadow-sm">
            {loading ? 'A processar...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        {/* Alternador */}
        <div className="text-center mt-6">
          <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-sm text-brand font-medium hover:underline cursor-pointer">
            {isRegister ? 'Já tem uma conta? Faça login' : 'Não tem conta? Registe-se grátis'}
          </button>
        </div>

      </div>
    </div>
  );
}