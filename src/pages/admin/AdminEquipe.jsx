import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Users, UserPlus, Search, Shield, Trash2, Mail, Phone, Check } from 'lucide-react';

export default function AdminEquipe() {
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('lista');

  const [termoBusca, setTermoBusca] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [roleSelecionada, setRoleSelecionada] = useState('funcionario');

  useEffect(() => {
    if (profile?.barbearia_id) buscarEquipe();
  }, [profile]);

  const buscarEquipe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('usuarios').select('*').eq('barbearia_id', profile.barbearia_id).in('role', ['admin', 'gerente', 'funcionario']).order('role', { ascending: true });
      if (error) throw error;
      setEquipe(data || []);
    } catch (err) { showAlert('Erro', 'Não foi possível carregar a equipe.', 'error'); } finally { setLoading(false); }
  };

  // ✨ BUSCA EXATA POR SEGURANÇA
  const pesquisarUsuario = async (e) => {
    e.preventDefault();
    if (!termoBusca) return showAlert('Atenção', 'Digite o e-mail, telefone ou CPF do funcionário.', 'info');
    
    setBuscando(true);
    setUsuarioEncontrado(null);
    try {
      const termoLimpo = termoBusca.trim();
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .or(`email.eq.${termoLimpo},whatsapp.eq.${termoLimpo},cpf.eq.${termoLimpo}`)
        .is('barbearia_id', null)
        .neq('id', profile.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setUsuarioEncontrado(data);
      } else {
        showAlert('Não encontrado', 'Nenhum usuário sem barbearia encontrado com este dado.', 'info');
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setBuscando(false);
    }
  };

  const adicionarAEquipe = async () => {
    try {
      const { error } = await supabase.from('usuarios').update({ role: roleSelecionada, barbearia_id: profile.barbearia_id }).eq('id', usuarioEncontrado.id);
      if (error) throw error;
      showAlert('Sucesso!', `${usuarioEncontrado.nome} agora faz parte da sua equipe!`, 'success');
      setUsuarioEncontrado(null);
      setTermoBusca('');
      buscarEquipe(); 
      setTab('lista');
    } catch (err) { showAlert('Erro', 'Não foi possível adicionar o membro: ' + err.message, 'error'); }
  };

  const removerMembro = (membro) => {
    if (membro.id === profile.id) return showAlert('Atenção', 'Você não pode remover a si próprio.', 'info');
    showConfirm('Remover da Equipe?', `Deseja remover "${membro.nome}"? Ele voltará a ser cliente.`, async () => {
        try {
          const { error } = await supabase.from('usuarios').update({ role: 'cliente', barbearia_id: null }).eq('id', membro.id);
          if (error) throw error;
          setEquipe(prev => prev.filter(m => m.id !== membro.id));
          showAlert('Removido', 'Membro removido.', 'success');
        } catch (err) { showAlert('Erro', 'Falha ao remover.', 'error'); }
      }
    );
  };

  // Regra de Permissão (Hierarquia)
  const isDono = profile.role === 'admin';

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto mb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-base">Equipe de Barbeiros</h1>
        <p className="text-sm text-text-muted mt-1">Gira os profissionais que trabalham na barbearia.</p>
      </div>

      <div className="flex gap-2 p-1 bg-surface border border-border-line rounded-xl mb-8 w-full max-w-md">
        <button onClick={() => setTab('lista')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === 'lista' ? 'bg-brand text-white shadow-sm' : 'text-text-muted'}`}><Users size={18}/> Membros</button>
        <button onClick={() => setTab('adicionar')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === 'adicionar' ? 'bg-brand text-white shadow-sm' : 'text-text-muted'}`}><UserPlus size={18}/> Adicionar</button>
      </div>

      {tab === 'lista' && (
        <div className="animate-fadeIn">
          {loading ? (
            <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipe.map((membro) => (
                <div key={membro.id} className="bg-surface border border-border-line rounded-2xl p-5 relative group hover:border-brand/30">
                  <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl font-bold text-[10px] uppercase tracking-wider ${membro.role === 'admin' ? 'bg-brand text-white' : membro.role === 'gerente' ? 'bg-amber-500/20 text-amber-600' : 'bg-surface border-b border-l border-border-line text-text-muted'}`}>
                    {membro.role}
                  </div>
                  <div className="flex items-center gap-4 mb-4 mt-2">
                    <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-lg">{membro.nome.charAt(0)}</div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-text-base truncate">{membro.nome}</h3>
                      {membro.whatsapp && <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><Phone size={10}/> {membro.whatsapp}</p>}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border-line/50 flex justify-end">
                    {(isDono || (profile.role === 'gerente' && membro.role === 'funcionario')) && (
                      <button onClick={() => removerMembro(membro)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Trash2 size={14}/> Remover</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'adicionar' && (
        <div className="animate-fadeIn max-w-xl">
          <div className="bg-brand/5 border border-brand/20 p-5 rounded-2xl mb-6">
            <h4 className="font-bold text-brand flex items-center gap-2 mb-2"><Shield size={18}/> Convite Seguro</h4>
            <p className="text-sm text-text-muted leading-relaxed">Para adicionar alguém à sua equipe, a pessoa já deve ter criado uma conta (como cliente) no App. Busque pelo E-mail, Telefone ou CPF exato dela.</p>
          </div>

          <form onSubmit={pesquisarUsuario} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />
              <input type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} placeholder="Email, Telefone ou CPF..." className="w-full pl-12 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
            </div>
            <button type="submit" disabled={buscando} className="bg-brand text-white px-6 py-3 rounded-xl font-bold text-sm hover:brightness-110 disabled:opacity-50">Buscar</button>
          </form>

          {usuarioEncontrado && (
            <div className="bg-surface p-6 rounded-2xl border border-brand/30 shadow-sm animate-slideUp">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-xl">{usuarioEncontrado.nome.charAt(0)}</div>
                <div>
                  <p className="font-black text-lg">{usuarioEncontrado.nome}</p>
                  <p className="text-sm text-text-muted">{usuarioEncontrado.email}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <select value={roleSelecionada} onChange={(e) => setRoleSelecionada(e.target.value)} className="flex-1 bg-background border border-border-line rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-brand">
                  <option value="funcionario">Barbeiro</option>
                  {isDono && <option value="gerente">Gerente</option>}
                  {isDono && <option value="admin">Dono (Admin)</option>}
                </select>
                <button onClick={adicionarAEquipe} className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-600 flex items-center gap-2"><Check size={18}/> Promover</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}