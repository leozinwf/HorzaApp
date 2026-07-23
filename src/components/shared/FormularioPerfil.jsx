import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { User, Lock, Phone, MapPin, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FormularioPerfil({ user, profile, embedded = false }) {
  const [formData, setFormData] = useState(profile || {});
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('horza_theme') || 'light');

  useEffect(() => {
    if (profile) setFormData(profile);
  }, [profile]);

  useEffect(() => {
    const handleThemeChange = () => setTheme(localStorage.getItem('horza_theme') || 'light');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('horza_theme', newTheme);
    window.dispatchEvent(new Event('themeChange'));
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('usuarios').update({
        nome: formData.nome,
        whatsapp: formData.whatsapp,
        cpf: formData.cpf,
        endereco: formData.endereco,
      }).eq('id', user.id);
      if (profileError) throw profileError;

      if (novaSenha) {
        const { error: authError } = await supabase.auth.updateUser({ password: novaSenha });
        if (authError) throw authError;
      }

      toast.success('Perfil atualizado com sucesso!');
      setNovaSenha('');
    } catch (err) {
      toast.error('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCpfChange = (e) => {
    let value = e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setFormData({ ...formData, cpf: value.substring(0, 14) });
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData({ ...formData, whatsapp: value.substring(0, 15) });
  };

  return (
    <div className={embedded ? 'space-y-8' : 'bg-surface p-6 sm:p-8 rounded-[2rem] border border-border-line shadow-sm space-y-8 animate-fadeIn'}>
      <div>
        <h3 className="text-lg font-black text-text-base flex items-center gap-2 mb-6"><Sun size={20} className="text-brand" /> Preferências</h3>
        <div className="flex items-center justify-between bg-background border border-border-line p-4 rounded-2xl">
          <div><p className="font-bold text-text-base">Tema do Sistema</p><p className="text-xs text-text-muted mt-0.5">Alternar entre modo claro e escuro</p></div>
          <button type="button" onClick={toggleTheme} className="p-3 rounded-xl bg-surface border border-border-line text-text-base hover:border-brand hover:text-brand shadow-sm transition-all cursor-pointer">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>

      <div className="pt-8 border-t border-border-line">
        <h3 className="text-lg font-black text-text-base flex items-center gap-2 mb-6"><User size={20} className="text-brand" /> Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Nome Completo</label>
            <input type="text" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3.5 outline-none focus:border-brand" value={formData.nome || ''} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">E-mail (Login)</label>
            <input type="email" disabled className="w-full bg-background/50 border border-border-line text-sm font-bold text-text-muted rounded-2xl px-4 py-3.5 outline-none cursor-not-allowed" value={user?.email || ''} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">WhatsApp</label>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="tel" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-brand" value={formData.whatsapp || ''} onChange={handlePhoneChange} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">CPF</label>
            <input type="text" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3.5 outline-none focus:border-brand" value={formData.cpf || ''} onChange={handleCpfChange} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Endereço Completo</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-brand" value={formData.endereco || ''} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border-line">
        <h3 className="text-lg font-black text-text-base flex items-center gap-2 mb-6"><Lock size={20} className="text-brand" /> Segurança</h3>
        <div className="max-w-md">
          <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Alterar Senha de Acesso</label>
          <input type="password" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3.5 outline-none focus:border-brand" placeholder="Digite a nova senha (opcional)" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
        </div>
      </div>

      <div className="pt-4">
        <button onClick={handleUpdate} disabled={loading} className="w-full md:w-auto md:min-w-[200px] bg-brand text-white py-4 px-8 rounded-2xl text-sm font-black hover:brightness-105 shadow-md disabled:opacity-50 cursor-pointer">
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
