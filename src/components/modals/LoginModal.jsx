import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Scissors, Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle, X } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        onClose(); // Fecha o popup antes de redirecionar
        
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

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border-line relative max-h-[90vh] overflow-y-auto">
        
        {/* Botão de Fechar */}
        <button onClick={onClose} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-1.5 rounded-xl bg-background transition-colors cursor-pointer">
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 bg-brand rounded-xl flex items-center justify-center shadow-md mb-3">
            <Scissors size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-text-base tracking-tight">Plataforma BarberSaaS</h2>
          <p className="text-xs text-text-muted mt-1">
            {isRegister ? 'Crie sua conta em menos de 1 minuto' : 'Identifique-se para gerenciar seus horários'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 animate-fadeIn">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
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
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Senha *</label>
            <div className="relative">
              <Lock className="absolute top-3 left-3 text-text-muted" size={16} />
              <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 pr-9 text-xs text-text-base focus:border-brand focus:outline-none" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-3 right-3 text-text-muted hover:text-text-base cursor-pointer">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute top-3 right-3 text-text-muted hover:text-text-base cursor-pointer">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full cursor-pointer rounded-xl bg-brand p-3 text-xs font-bold text-white hover:bg-brand-hover transition-colors shadow-xs flex justify-center items-center mt-2">
            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : isRegister ? 'Confirmar Cadastro' : 'Entrar na Conta'}
          </button>
        </form>

        <div className="text-center mt-4 pt-4 border-t border-border-line">
          <button type="button" onClick={toggleMode} className="text-xs text-text-muted hover:text-brand font-bold transition-colors cursor-pointer">
            {isRegister ? 'Já tem conta? Fazer Login' : 'Não tem conta? Cadastre-se grátis'}
          </button>
        </div>

      </div>
    </div>
  );
}