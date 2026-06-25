import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Users, UserPlus, Search, Shield, Scissors, Trash2, Mail, Phone, Check } from 'lucide-react';

export default function AdminEquipe() {
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('lista'); // 'lista' ou 'adicionar'

  // Estados para a busca de usuários
  const [termoBusca, setTermoBusca] = useState('');
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [rolesSelecionadas, setRolesSelecionadas] = useState({}); // Guarda o cargo escolhido para cada usuário na lista

  useEffect(() => {
    if (profile?.barbearia_id) buscarEquipe();
  }, [profile]);

  // ✨ Efeito Mágico: Filtra a lista enquanto você digita (com um pequeno delay para não travar)
  useEffect(() => {
    if (tab === 'adicionar') {
      const delayDebounceFn = setTimeout(() => {
        carregarUsuariosDisponiveis(termoBusca);
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [termoBusca, tab]);

  const buscarEquipe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('barbearia_id', profile.barbearia_id)
        .in('role', ['admin', 'gerente', 'funcionario'])
        .order('role', { ascending: true });

      if (error) throw error;
      setEquipe(data || []);
    } catch (err) {
      showAlert('Erro', 'Não foi possível carregar a equipe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuariosDisponiveis = async (busca = '') => {
    setBuscando(true);
    try {
      // Busca usuários que NÃO têm barbearia e que NÃO são o admin logado
      let query = supabase
        .from('usuarios')
        .select('*')
        .is('barbearia_id', null)
        .neq('id', profile?.id)
        .order('criado_em', { ascending: false })
        .limit(20);

      // Se tiver algo digitado, procura por nome, email ou whatsapp
      if (busca) {
        query = query.or(`nome.ilike.%${busca}%,email.ilike.%${busca}%,whatsapp.ilike.%${busca}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setUsuariosDisponiveis(data || []);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setBuscando(false);
    }
  };

  const handleRoleChange = (userId, novaRole) => {
    setRolesSelecionadas(prev => ({ ...prev, [userId]: novaRole }));
  };

  const adicionarAEquipe = async (usuario) => {
    // Pega o cargo que o admin escolheu no select (ou 'funcionario' por padrão)
    const roleEscolhida = rolesSelecionadas[usuario.id] || 'funcionario';

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ 
          role: roleEscolhida, 
          barbearia_id: profile.barbearia_id 
        })
        .eq('id', usuario.id);

      if (error) throw error;
      
      showAlert('Sucesso!', `${usuario.nome} agora faz parte da sua equipe!`, 'success');
      
      // Remove o usuário da lista de "disponíveis" e recarrega a equipe
      setUsuariosDisponiveis(prev => prev.filter(u => u.id !== usuario.id));
      buscarEquipe(); 
    } catch (err) {
      showAlert('Erro', 'Não foi possível adicionar o membro: ' + err.message, 'error');
    }
  };

  const removerMembro = (membro) => {
    if (membro.id === profile.id) {
        showAlert('Atenção', 'Você não pode remover a si próprio da equipe.', 'info');
        return;
    }

    showConfirm(
      'Remover da Equipe?', 
      `Deseja remover "${membro.nome}" da equipe? Ele voltará a ser um cliente comum.`, 
      async () => {
        try {
          const { error } = await supabase
            .from('usuarios')
            .update({ role: 'cliente', barbearia_id: null })
            .eq('id', membro.id);

          if (error) throw error;
          
          setEquipe(prev => prev.filter(m => m.id !== membro.id));
          showAlert('Removido', 'O membro foi removido com sucesso.', 'success');
          
          // Se estiver na aba adicionar, recarrega a lista para ele aparecer lá de novo
          if (tab === 'adicionar') carregarUsuariosDisponiveis(termoBusca);
        } catch (err) {
          showAlert('Erro', 'Não foi possível remover o membro.', 'error');
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto mb-20">
      
      {/* CABEÇALHO */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-base">Equipe de Barbeiros</h1>
        <p className="text-sm text-text-muted mt-1">Gira os profissionais que trabalham na barbearia.</p>
      </div>

      {/* ABAS */}
      <div className="flex gap-2 p-1 bg-surface border border-border-line rounded-xl mb-8 w-full max-w-md">
        <button onClick={() => setTab('lista')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${tab === 'lista' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>
          <Users size={18}/> Membros
        </button>
        <button onClick={() => setTab('adicionar')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${tab === 'adicionar' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>
          <UserPlus size={18}/> Adicionar
        </button>
      </div>

      {/* ABA: LISTA DE MEMBROS (Sua Equipe Atual) */}
      {tab === 'lista' && (
        <div className="animate-fadeIn">
          {loading ? (
            <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
          ) : equipe.length === 0 ? (
            <p className="text-center py-10 text-text-muted">Sua equipe está vazia.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipe.map((membro) => (
                <div key={membro.id} className="bg-surface border border-border-line rounded-2xl p-5 relative overflow-hidden group hover:border-brand/30 transition-colors">
                  
                  <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl font-bold text-[10px] uppercase tracking-wider
                    ${membro.role === 'admin' ? 'bg-brand text-white' : 
                      membro.role === 'gerente' ? 'bg-amber-500/20 text-amber-600' : 'bg-surface border-b border-l border-border-line text-text-muted'}`}>
                    {membro.role === 'admin' ? 'Dono' : membro.role === 'gerente' ? 'Gerente' : 'Barbeiro'}
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-lg">
                      {membro.nome.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-text-base truncate">{membro.nome}</h3>
                      {membro.whatsapp && <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5"><Phone size={10}/> {membro.whatsapp}</p>}
                      {membro.email && <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5 truncate"><Mail size={10}/> {membro.email}</p>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border-line/50 flex justify-end">
                    {membro.role !== 'admin' && profile.role === 'admin' && (
                      <button onClick={() => removerMembro(membro)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
                        <Trash2 size={14}/> Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: ADICIONAR NOVO MEMBRO (Lista e Pesquisa Geral) */}
      {tab === 'adicionar' && (
        <div className="animate-fadeIn max-w-3xl">
          
          <div className="bg-brand/5 border border-brand/20 p-5 rounded-2xl mb-6">
            <h4 className="font-bold text-brand flex items-center gap-2 mb-2"><Shield size={18}/> Dica de Segurança</h4>
            <p className="text-sm text-text-muted leading-relaxed">
              Aqui estão listadas pessoas cadastradas no sistema que ainda não pertencem a nenhuma barbearia. Utilize a barra de pesquisa para encontrar o seu funcionário mais rapidamente.
            </p>
          </div>

          {/* BARRA DE PESQUISA INTELIGENTE */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />
            <input 
              type="text" 
              value={termoBusca} 
              onChange={(e) => setTermoBusca(e.target.value)} 
              placeholder="Buscar por nome, e-mail ou telefone..." 
              className="w-full pl-12 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none transition-colors"
            />
          </div>

          {/* LISTA DE USUÁRIOS DISPONÍVEIS */}
          <div className="space-y-3">
            {buscando ? (
              <div className="text-center py-10"><div className="h-6 w-6 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : usuariosDisponiveis.length === 0 ? (
              <div className="text-center py-10 bg-surface border border-border-line rounded-2xl">
                <p className="text-text-muted font-semibold text-sm">Nenhum usuário encontrado para "{termoBusca}".</p>
              </div>
            ) : (
              usuariosDisponiveis.map(usuario => (
                <div key={usuario.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-4 rounded-xl border border-border-line gap-4 hover:border-brand/30 transition-colors">
                  
                  {/* Dados do Usuário */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-background border border-border-line text-text-muted flex justify-center items-center font-black">
                        {usuario.nome.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-sm text-text-base">{usuario.nome}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {usuario.email || usuario.whatsapp || 'Sem contato registrado'}
                        </p>
                    </div>
                  </div>
                  
                  {/* Seleção de Cargo e Botão */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <select 
                        value={rolesSelecionadas[usuario.id] || 'funcionario'} 
                        onChange={(e) => handleRoleChange(usuario.id, e.target.value)}
                        className="flex-1 sm:flex-none bg-background border border-border-line rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-brand cursor-pointer"
                    >
                        <option value="funcionario">Barbeiro</option>
                        <option value="gerente">Gerente</option>
                    </select>
                    
                    <button 
                        onClick={() => adicionarAEquipe(usuario)}
                        className="bg-brand text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                    >
                        <Check size={14}/> Promover
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
}