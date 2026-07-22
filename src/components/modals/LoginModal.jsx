import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useModal } from '../../context/ModalContext';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, LogIn, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LoginModal({ isOpen, onClose, initialMode = 'login' }) {
  const { showAlert } = useModal();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  
  // Estados do Formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Campos Usuário Cliente
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Controles de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0,2)}) ${value.slice(2)}`;
    if (value.length > 9) value = `${value.slice(0,10)}-${value.slice(10)}`;
    setWhatsapp(value);
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const validacoesSenha = {
    minimo: password.length >= 6,
    maiuscula: /[A-Z]/.test(password),
    especial: /[^A-Za-z0-9]/.test(password)
  };
  const senhaValida = validacoesSenha.minimo && validacoesSenha.maiuscula && validacoesSenha.especial;
  const senhasDiferentes = (mode === 'register' || mode === 'update_password') && confirmPassword.length > 0 && password !== confirmPassword;

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!senhaValida) return setError('A senha não atende aos requisitos mínimos.');
      if (senhasDiferentes) return setError('As senhas não coincidem.');
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password
        });
        
        if (signUpError) throw signUpError;

        if (data?.user) {
          const { error: profileError } = await supabase.from('usuarios').insert([{
            id: data.user.id,
            nome: nome,
            email: email,
            whatsapp: whatsapp,
            role: 'cliente'
          }]);

          if (profileError) throw profileError;

          showAlert('Bem-vindo!', 'Conta criada com sucesso. Você já pode realizar seus agendamentos.', 'success');
          onClose();
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data?.user) onClose();
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/' });
      if (error) throw error;
      showAlert('E-mail enviado!', 'Verifique a sua caixa de entrada para redefinir a sua senha.', 'success');
      setMode('login');
    } catch (err) {
      setError('Erro ao enviar e-mail: ' + err.message);
    } finally { setLoading(false); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      showAlert('Sucesso!', 'Senha alterada com sucesso.', 'success');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleIrParaCadastroEmpresa = () => {
    onClose();
    navigate('/cadastro-barbearia');
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-surface border border-border-line w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative my-auto animate-slideUp">
        
        <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-2 rounded-full hover:bg-background transition-colors cursor-pointer">
          <X size={20} />
        </button>

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

        <form onSubmit={mode === 'update_password' ? handleUpdatePassword : mode === 'forgot_password' ? handleForgotPassword : handleAuth} className="space-y-4">
          
          {mode === 'register' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative md:col-span-2">
                <User size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                <input type="text" required placeholder="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
              </div>
              <div className="relative md:col-span-2">
                <Phone size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                <input type="tel" required placeholder="WhatsApp" value={whatsapp} onChange={handlePhoneChange} className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
              </div>
            </div>
          )}

          {mode !== 'update_password' && (
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
              <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
            </div>
          )}

          {mode !== 'forgot_password' && (
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
              <input 
                type={showPassword ? 'text' : 'password'} required placeholder="Senha" 
                value={password} onChange={(e) => setPassword(e.target.value)} 
                className="w-full pl-10 pr-10 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-text-muted hover:text-brand transition-colors cursor-pointer" tabIndex="-1">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          )}

          {(mode === 'register' || mode === 'update_password') && (
            <div className="px-2">
              <ul className="text-xs space-y-1 mt-2">
                <li className={`flex items-center gap-2 font-bold ${validacoesSenha.minimo ? 'text-green-500' : 'text-text-muted'}`}>{validacoesSenha.minimo ? '✓' : '✖'} Mínimo 6 dígitos</li>
                <li className={`flex items-center gap-2 font-bold ${validacoesSenha.maiuscula ? 'text-green-500' : 'text-text-muted'}`}>{validacoesSenha.maiuscula ? '✓' : '✖'} Pelo menos 1 letra maiúscula</li>
                <li className={`flex items-center gap-2 font-bold ${validacoesSenha.especial ? 'text-green-500' : 'text-text-muted'}`}>{validacoesSenha.especial ? '✓' : '✖'} Pelo menos 1 caractere especial</li>
              </ul>
            </div>
          )}

          {(mode === 'register' || mode === 'update_password') && (
            <div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} required placeholder="Confirmar Senha" 
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
                  className={`w-full pl-10 pr-10 py-3 bg-background border rounded-xl text-sm outline-none transition-colors ${senhasDiferentes ? 'border-red-500 focus:border-red-500' : 'border-border-line focus:border-brand'}`} 
                />
              </div>
              {senhasDiferentes && <p className="text-red-500 text-xs font-bold mt-1 px-1">As senhas não coincidem.</p>}
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button type="button" onClick={() => setMode('forgot_password')} className="text-xs font-bold text-text-muted hover:text-brand transition-colors cursor-pointer">
                Esqueceu a senha?
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-brand text-white font-bold py-3.5 rounded-xl text-sm hover:bg-brand-hover transition-colors shadow-md flex justify-center mt-4 cursor-pointer">
            {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (mode === 'login' ? 'Entrar' : mode === 'forgot_password' ? 'Recuperar Senha' : 'Criar Minha Conta')}
          </button>

          {mode !== 'update_password' && mode !== 'forgot_password' && (
            <div className="mt-6 text-center text-sm font-semibold text-text-muted border-t border-border-line/50 pt-6">
              {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
              <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-brand hover:underline cursor-pointer">
                {mode === 'login' ? 'Cadastre-se' : 'Faça Login'}
              </button>
            </div>
          )}
        </form>

        {/* LINK PARA CADASTRO DE BARBEARIAS */}
        <div className="mt-6 text-center text-sm border-t border-border-line pt-6">
          <p className="text-text-muted font-bold">
            É dono de uma barbearia?{' '}
            <button onClick={handleIrParaCadastroEmpresa} className="text-brand hover:underline flex items-center justify-center gap-1 mx-auto mt-2 cursor-pointer">
              <Store size={16} /> Cadastre seu negócio aqui
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}