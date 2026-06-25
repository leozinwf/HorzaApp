import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Scissors, Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle, X, CheckCircle2 } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, initialMode = 'login' }) {
  if (!isOpen) return null;

  const navigate = useNavigate();
  
  // Modos da Modal: 'login', 'register', 'forgot', 'update_password'
  const [mode, setMode] = useState(initialMode); 

  // Atualiza o modo interno caso o App.jsx mande abrir com um modo específico
  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  const isRegister = mode === 'register';
  const isForgotPassword = mode === 'forgot';
  const isUpdatePassword = mode === 'update_password';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Estados dos Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setWhatsapp(value.substring(0, 15));
  };

  const avaliarForcaSenha = (senha) => {
    let score = 0;
    if (!senha) return { score: 0, label: '', color: 'bg-border-line' };
    if (senha.length >= 6) score += 1;
    if (senha.length >= 8) score += 1;
    if (/[A-Z]/.test(senha) || /[a-z]/.test(senha)) score += 1;
    if (/[0-9]/.test(senha) && /[^A-Za-z0-9]/.test(senha)) score += 1;

    if (score <= 1) return { score, label: 'Muito Fraca', color: 'bg-red-500' };
    if (score === 2) return { score, label: 'Razoável', color: 'bg-amber-500' };
    if (score === 3) return { score, label: 'Boa', color: 'bg-blue-500' };
    return { score, label: 'Forte', color: 'bg-green-500' };
  };

  const forcaDaSenha = avaliarForcaSenha(password);

  // 🚀 FUNÇÃO: SOLICITAR RECUPERAÇÃO DE SENHA (ENVIA O E-MAIL)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, insira o seu e-mail.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, 
      });
      if (error) throw error;
      setResetSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 FUNÇÃO: SALVAR A NOVA SENHA (APÓS CLICAR NO LINK)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirmPassword) return setError('As senhas não coincidem.');

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      
      alert('Sua senha foi redefinida com sucesso! Redirecionando...');
      onClose(); // Fecha a modal
      navigate('/'); // Vai pra home
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 FUNÇÃO: LOGIN E CADASTRO
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
        if (whatsapp.length < 14) throw new Error('Insira um WhatsApp válido com DDD.');
      }

      const { data: authData, error: authError } = isRegister
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) throw new Error('E-mail ou senha incorretos.');
        if (authError.message.includes('User already registered')) throw new Error('Este e-mail já está cadastrado.');
        throw authError;
      }

      if (isRegister && authData?.user) {
        const { error: profileError } = await supabase.from('usuarios').insert([
          { id: authData.user.id, nome, whatsapp, role: 'cliente', barbearia_id: null },
        ]);
        if (profileError) throw profileError;
      }

      const userId = authData.user?.id;
      if (userId) {
        const { data: profile } = await supabase.from('usuarios').select('role').eq('id', userId).single();
        onClose(); 
        
        if (profile) {
          if (profile.role === 'admin' || profile.role === 'gerente') navigate('/admin');
          else if (profile.role === 'funcionario') navigate('/barbeiro');
          else navigate('/agendamento');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const alternarModo = (novoModo) => {
    setMode(novoModo);
    setError('');
    setResetSuccess(false);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border-line relative max-h-[90vh] overflow-y-auto">
        
        <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-1.5 rounded-xl bg-background transition-colors cursor-pointer">
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 bg-brand rounded-xl flex items-center justify-center shadow-md mb-3">
            <Scissors size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-text-base tracking-tight">Plataforma BarberSaaS</h2>
          <p className="text-xs text-text-muted mt-1">
            {isUpdatePassword ? 'Defina sua nova senha' : 
             isForgotPassword ? 'Recuperação de Senha' : 
             isRegister ? 'Crie sua conta em menos de 1 minuto' : 
             'Identifique-se para gerenciar seus horários'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 animate-fadeIn">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-600">{error}</p>
          </div>
        )}

        {/* 🚀 TELA 1: SALVAR A NOVA SENHA (APÓS CLICAR NO LINK DO E-MAIL) */}
        {isUpdatePassword ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4 animate-fadeIn">
            <div className="p-3 bg-brand/10 border border-brand/20 rounded-xl text-center mb-4">
              <p className="text-xs font-bold text-brand">Quase lá! Crie uma nova senha forte.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nova Senha *</label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 text-text-muted" size={16} />
                <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 pr-9 text-xs text-text-base focus:border-brand focus:outline-none" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 right-3 text-text-muted hover:text-text-base cursor-pointer"><Eye size={16} /></button>
              </div>
            </div>

            <div className="animate-fadeIn">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Confirmar Nova Senha *</label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 text-text-muted" size={16} />
                <input required type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full rounded-xl bg-background border p-2.5 pl-9 pr-9 text-xs text-text-base focus:outline-none ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-border-line focus:border-brand'}`} placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full cursor-pointer rounded-xl bg-brand p-3 text-xs font-bold text-white hover:bg-brand-hover transition-colors shadow-xs flex justify-center items-center mt-2">
              {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar Nova Senha'}
            </button>
          </form>
        ) : 

        /* 🚀 TELA 2: SOLICITAR RECUPERAÇÃO DE SENHA (DIGITAR O E-MAIL) */
        isForgotPassword ? (
          resetSuccess ? (
            <div className="text-center animate-fadeIn py-4">
              <div className="mx-auto h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-3"><CheckCircle2 size={24} /></div>
              <h3 className="text-sm font-bold text-text-base mb-2">E-mail enviado!</h3>
              <p className="text-xs text-text-muted mb-6">Verifique a sua caixa de entrada (e pasta de spam) para criar uma nova senha.</p>
              <button onClick={() => alternarModo('login')} className="w-full bg-background border border-border-line p-3 rounded-xl text-xs font-bold text-text-base hover:bg-border-line transition-colors cursor-pointer">Voltar para o Login</button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fadeIn">
              <p className="text-xs text-text-muted text-center mb-4">Digite o seu e-mail cadastrado e enviaremos um link seguro para você redefinir sua senha.</p>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">E-mail *</label>
                <div className="relative">
                  <Mail className="absolute top-3 left-3 text-text-muted" size={16} />
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs text-text-base focus:border-brand focus:outline-none" placeholder="seuemail@exemplo.com" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full cursor-pointer rounded-xl bg-brand p-3 text-xs font-bold text-white hover:bg-brand-hover transition-colors shadow-xs flex justify-center items-center mt-2">
                {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Enviar Link de Recuperação'}
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => alternarModo('login')} className="text-xs text-text-muted hover:text-brand font-bold transition-colors cursor-pointer">Lembrou a senha? Voltar ao Login</button>
              </div>
            </form>
          )
        ) : (
          /* 🚀 TELA 3: LOGIN E CADASTRO PADRÃO */
          <form onSubmit={handleAuth} className="space-y-4 animate-fadeIn">
            {isRegister && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Nome Completo *</label>
                  <div className="relative">
                    <User className="absolute top-3 left-3 text-text-muted" size={16} />
                    <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs text-text-base focus:border-brand focus:outline-none" placeholder="Ex: João Silva" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">WhatsApp *</label>
                  <div className="relative">
                    <Phone className="absolute top-3 left-3 text-text-muted" size={16} />
                    <input required type="tel" value={whatsapp} onChange={handleWhatsappChange} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs text-text-base focus:border-brand focus:outline-none" placeholder="(11) 99999-9999" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">E-mail *</label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 text-text-muted" size={16} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs text-text-base focus:border-brand focus:outline-none" placeholder="seuemail@exemplo.com" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">Senha *</label>
                {!isRegister && (
                  <button type="button" onClick={() => alternarModo('forgot')} className="text-[10px] font-bold text-brand hover:text-brand-hover cursor-pointer">Esqueceu a senha?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute top-3 left-3 text-text-muted" size={16} />
                <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 pr-9 text-xs text-text-base focus:border-brand focus:outline-none" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 right-3 text-text-muted hover:text-text-base cursor-pointer"><Eye size={16} /></button>
              </div>

              {isRegister && password.length > 0 && (
                <div className="mt-1.5 animate-fadeIn">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`h-1 w-full rounded-full transition-all ${forcaDaSenha.score >= level ? forcaDaSenha.color : 'bg-border-line'}`}></div>
                    ))}
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Força: {forcaDaSenha.label}</p>
                </div>
              )}
            </div>

            {isRegister && (
              <div className="animate-fadeIn">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Confirmar Senha *</label>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 text-text-muted" size={16} />
                  <input required type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full rounded-xl bg-background border p-2.5 pl-9 pr-9 text-xs text-text-base focus:outline-none ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-border-line focus:border-brand'}`} placeholder="••••••••" />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full cursor-pointer rounded-xl bg-brand p-3 text-xs font-bold text-white hover:bg-brand-hover transition-colors shadow-xs flex justify-center items-center mt-2">
              {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : isRegister ? 'Confirmar Cadastro' : 'Entrar na Conta'}
            </button>

            <div className="text-center mt-4 pt-4 border-t border-border-line">
              <button type="button" onClick={() => alternarModo(isRegister ? 'login' : 'register')} className="text-xs text-text-muted hover:text-brand font-bold transition-colors cursor-pointer">
                {isRegister ? 'Já tem conta? Fazer Login' : 'Não tem conta? Cadastre-se grátis'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}