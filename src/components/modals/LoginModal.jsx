import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useModal } from '../../context/ModalContext'; // Usando as nossas novas modais bonitas
import { X, Eye, EyeOff, Mail, Lock, User, Phone, LogIn } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, initialMode = 'login' }) {
  const { showAlert } = useModal();
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'forgot_password', 'update_password'
  
  // Estados do Formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Controles de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Lupa da confirmação

  // Resetar estados ao abrir/fechar ou mudar de modo
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Verifica se as senhas estão diferentes enquanto o usuário digita
  const senhasDiferentes = (mode === 'register' || mode === 'update_password') && 
                           confirmPassword.length > 0 && 
                           password !== confirmPassword;

  // 1. FLUXO DE LOGIN OU CADASTRO
  const handleAuth = async (e) => {
    e.preventDefault(); // Impede o reload da página pelo formulário
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome, whatsapp, role: 'cliente' }
          }
        });
        if (signUpError) throw signUpError;
        if (data?.user) {
            showAlert('Bem-vindo!', 'Conta criada com sucesso. Você já está logado.', 'success');
            onClose();
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data?.user) {
            onClose(); // Fecha a modal e deixa o AuthContext cuidar do resto
        }
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. FLUXO DE RECUPERAR SENHA (Envia o E-mail)
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/',
      });
      if (error) throw error;
      showAlert('E-mail enviado!', 'Verifique a sua caixa de entrada para redefinir a sua senha.', 'success');
      setMode('login');
    } catch (err) {
      setError('Erro ao enviar e-mail de recuperação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. FLUXO DE SALVAR NOVA SENHA (Quando clica no link do E-mail)
  const handleUpdatePassword = async (e) => {
  e.preventDefault();
  setError('');

  if (password !== confirmPassword) {
    setError('As senhas não coincidem.');
    return;
  }

  setLoading(true);
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      // ✨ TRADUÇÃO DO ERRO AQUI
      if (error.message.includes('New password should be different')) {
        throw new Error('A nova senha deve ser diferente da antiga.');
      }
      throw error;
    }
    
    showAlert('Sucesso!', 'Senha alterada com sucesso.', 'success');
    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  // Adicione esta função auxiliar dentro do seu LoginModal.jsx
const calcularForcaSenha = (senha) => {
  if (!senha) return { forca: 0, cor: 'bg-background', texto: '' };
  let forca = 0;
  if (senha.length > 6) forca++;
  if (/[A-Z]/.test(senha)) forca++;
  if (/[0-9]/.test(senha)) forca++;
  if (/[^A-Za-z0-9]/.test(senha)) forca++;

  if (forca <= 1) return { forca: 1, cor: 'bg-red-500', texto: 'Muito Fraca' };
  if (forca === 2) return { forca: 2, cor: 'bg-amber-500', texto: 'Fraca' };
  if (forca === 3) return { forca: 3, cor: 'bg-blue-500', texto: 'Forte' };
  return { forca: 4, cor: 'bg-green-500', texto: 'Muito Forte' };
};

  // Fechar Modal ao clicar fora
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div onClick={handleBackdropClick} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-border-line w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative animate-slideUp">
        
        <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-2 rounded-full hover:bg-background transition-colors cursor-pointer">
          <X size={20} />
        </button>

        {/* CABEÇALHOS DINÂMICOS */}
        <div className="mb-6 text-center">
          <div className="mx-auto h-12 w-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mb-4">
            {mode === 'update_password' ? <Lock size={24} /> : <LogIn size={24} />}
          </div>
          <h2 className="text-2xl font-black text-text-base">
            {mode === 'login' ? 'Bem-vindo de volta' : 
             mode === 'register' ? 'Criar Conta' : 
             mode === 'forgot_password' ? 'Recuperar Senha' : 'Redefinir Senha'}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {mode === 'login' ? 'Acesse sua conta para agendar seus horários.' : 
             mode === 'register' ? 'Junte-se a nós para a melhor experiência.' : 
             mode === 'forgot_password' ? 'Enviaremos um link de recuperação.' : 'Crie uma nova senha segura.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        {/* 🚀 FORMULÁRIOS SEMÂNTICOS (Ativam o "Salvar Senha" do navegador) */}

        {/* FORM: ATUALIZAR SENHA */}
        {mode === 'update_password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
             <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                placeholder="Nova Senha" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="new-password"
                className="w-full pl-10 pr-10 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-text-muted hover:text-brand transition-colors cursor-pointer">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            <div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  required 
                  placeholder="Confirmar Nova Senha" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-10 py-3 bg-background border rounded-xl text-sm outline-none transition-colors ${senhasDiferentes ? 'border-red-500 focus:border-red-500' : 'border-border-line focus:border-brand'}`} 
                />
                {mode === 'update_password' && password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`h-full flex-1 rounded-full ${i <= calcularForcaSenha(password).forca ? calcularForcaSenha(password).cor : 'bg-background'}`}></div>
                      ))}
                    </div>
                    <p className={`text-[10px] font-bold ${calcularForcaSenha(password).forca > 2 ? 'text-green-600' : 'text-amber-600'}`}>
                      Força: {calcularForcaSenha(password).texto}
                    </p>
                  </div>
                )}
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-3.5 text-text-muted hover:text-brand transition-colors cursor-pointer">
                  {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              {senhasDiferentes && <p className="text-red-500 text-xs font-bold mt-1 px-1">As senhas não coincidem.</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-brand text-white font-bold py-3.5 rounded-xl text-sm hover:bg-brand-hover transition-colors shadow-md flex justify-center mt-6 cursor-pointer">
              {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar Nova Senha'}
            </button>
          </form>
        )}

        {/* FORM: RECUPERAR SENHA (E-MAIL) */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
              <input type="email" required placeholder="Seu e-mail cadastrado" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-brand text-white font-bold py-3.5 rounded-xl text-sm hover:bg-brand-hover transition-colors shadow-md flex justify-center mt-2 cursor-pointer">
              {loading ? 'A Enviar...' : 'Receber link de recuperação'}
            </button>
            <p className="text-center text-sm font-semibold text-text-muted mt-4">
              Lembrou da senha? <button type="button" onClick={() => setMode('login')} className="text-brand hover:underline cursor-pointer">Voltar ao Login</button>
            </p>
          </form>
        )}

        {/* FORM: LOGIN OU CADASTRO */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleAuth} className="space-y-4">
            
            {mode === 'register' && (
              <>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                  <input type="text" required placeholder="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                  <input type="tel" required placeholder="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>
              </>
            )}

            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
              <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                placeholder="Senha" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-10 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-text-muted hover:text-brand transition-colors cursor-pointer" tabIndex="-1">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => setMode('forgot_password')} className="text-xs font-bold text-text-muted hover:text-brand transition-colors cursor-pointer">
                  Esqueceu a senha?
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    required 
                    placeholder="Confirmar Senha" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    autoComplete="new-password"
                    className={`w-full pl-10 pr-10 py-3 bg-background border rounded-xl text-sm outline-none transition-colors ${senhasDiferentes ? 'border-red-500 focus:border-red-500' : 'border-border-line focus:border-brand'}`} 
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-3.5 text-text-muted hover:text-brand transition-colors cursor-pointer" tabIndex="-1">
                    {showConfirmPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
                {/* ✨ MENSAGEM DE ERRO EM TEMPO REAL ✨ */}
                {senhasDiferentes && (
                  <p className="text-red-500 text-xs font-bold mt-1 px-1">As senhas não coincidem.</p>
                )}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-brand text-white font-bold py-3.5 rounded-xl text-sm hover:bg-brand-hover transition-colors shadow-md flex justify-center mt-4 cursor-pointer">
              {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (mode === 'login' ? 'Entrar' : 'Criar Conta')}
            </button>

            <div className="mt-6 text-center text-sm font-semibold text-text-muted border-t border-border-line/50 pt-6">
              {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
              <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-brand hover:underline cursor-pointer">
                {mode === 'login' ? 'Cadastre-se' : 'Faça Login'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}