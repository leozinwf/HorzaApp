import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { useModal } from '../../context/ModalContext';
import { Users, Plus, Trash2, Edit2, Shield, Phone, User, X, Check, MapPin, Search, IdCard, Mail } from 'lucide-react';
import { maskPhone, maskCPF, maskCEP } from '../../utils/formatters';

export default function AdminEquipe() {
  const { user, profile } = useAuth();
  const { showConfirm, showAlert } = useModal();
  
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingMembro, setEditingMembro] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Estados de Vínculo (NOVO)
  const [emailBusca, setEmailBusca] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);

  // Estados dos campos de edição
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [role, setRole] = useState('funcionario');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (profile?.barbearia_id) buscarEquipe();
  }, [profile]);

  const buscarEquipe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('barbearia_id', profile.barbearia_id)
        .in('role', ['admin', 'gerente', 'funcionario'])
        .order('nome', { ascending: true });

      if (error) throw error;
      setEquipe(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscaCEP = async (cepBuscado) => {
    const cepLimpo = cepBuscado.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setEndereco(`${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
        setNumero('');
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    }
  };

  // 🚀 FUNÇÃO 1: Procurar utilizador pelo e-mail
  const handleBuscarPorEmail = async (e) => {
    e.preventDefault();
    if (!emailBusca) return;
    setBuscando(true);
    
    try {
      const { data, error } = await supabase.rpc('buscar_usuario_por_email', { email_busca: emailBusca });
      if (error) throw error;
      
      if (data && data.length > 0) {
        if (data[0].barbearia_id === profile.barbearia_id) {
           showAlert('Aviso', 'Este profissional já faz parte da sua equipa!');
        } else {
           setUsuarioEncontrado(data[0]);
           setRole('funcionario'); // Cargo por defeito
        }
      } else {
        showAlert('Não encontrado', 'Nenhuma conta localizada com este e-mail. Peça para o profissional se cadastrar no aplicativo primeiro.');
        setUsuarioEncontrado(null);
      }
    } catch (err) {
      showAlert('Erro', err.message);
    } finally {
      setBuscando(false);
    }
  };

  // 🚀 FUNÇÃO 2: Vincular o utilizador encontrado à equipa
  const handleVincularUsuario = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.rpc('vincular_membro_equipe', {
        alvo_id: usuarioEncontrado.id,
        nova_role: role,
        barb_id: profile.barbearia_id
      });
      if (error) throw error;

      showAlert('Sucesso', 'Profissional vinculado com sucesso!');
      fecharFormulario();
      buscarEquipe();
    } catch (err) {
      showAlert('Erro', err.message);
    }
  };

  // 🚀 FUNÇÃO 3: Salvar Edições de um membro que já está na equipa
  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    if (!nome || !whatsapp) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nome, whatsapp, role, cpf, cep, endereco, numero, ativo })
        .eq('id', editingMembro.id);

      if (error) throw error;
      showAlert('Sucesso', 'Dados atualizados com sucesso!');
      fecharFormulario();
      buscarEquipe();
    } catch (err) {
      showAlert('Erro', 'Erro ao salvar: ' + err.message);
    }
  };

  const handleDeletarMembro = async (membroId) => {
    if (membroId === user.id) {
      showAlert('Ação Bloqueada', 'Você não pode excluir-se a si mesmo do sistema!');
      return;
    }

    showConfirm('Remover Membro', 'Tem certeza de que deseja revogar o acesso deste membro e removê-lo da equipa?', async () => {
      try {
        // Ao invés de deletar a conta da pessoa, nós apenas retiramos ela da barbearia (rebaixa a cliente)
        const { error } = await supabase.from('usuarios').update({ barbearia_id: null, role: 'cliente' }).eq('id', membroId);
        if (error) throw error;
        buscarEquipe();
        showAlert('Sucesso', 'Profissional desligado da barbearia.');
      } catch (err) {
        showAlert('Erro', 'Falha ao desligar: ' + err.message);
      }
    });
  };

  const abrirEdicao = (membro) => {
    setEditingMembro(membro);
    setNome(membro.nome || '');
    setWhatsapp(membro.whatsapp || '');
    setRole(membro.role || 'funcionario');
    setCpf(membro.cpf || '');
    setCep(membro.cep || '');
    setEndereco(membro.endereco || '');
    setNumero(membro.numero || '');
    setAtivo(membro.ativo !== false);
    setIsAddOpen(true); // Abre o modal em modo de edição
  };

  const fecharFormulario = () => {
    setEditingMembro(null);
    setIsAddOpen(false);
    setEmailBusca('');
    setUsuarioEncontrado(null);
    setNome('');
    setWhatsapp('');
    setRole('funcionario');
    setCpf('');
    setCep('');
    setEndereco('');
    setNumero('');
    setAtivo(true);
  };

  return (
    <div className="p-6 md:p-10">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Equipe & Permissões</h1>
          <p className="text-sm text-text-muted">Gerencie os profissionais, acessos e cargos da barbearia.</p>
        </div>
        {!isAddOpen && (
          <button onClick={() => setIsAddOpen(true)} className="bg-brand hover:bg-brand-hover text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-colors">
            <Plus size={18} /> Adicionar Membro
          </button>
        )}
      </header>

      {/* 🚀 MODAL: VINCULAR NOVO MEMBRO */}
      {isAddOpen && !editingMembro && (
        <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm mb-8 max-w-xl animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Plus size={20}/> Vincular Profissional
            </h2>
            <button onClick={fecharFormulario} className="text-text-muted hover:text-text-base cursor-pointer"><X size={20} /></button>
          </div>

          {!usuarioEncontrado ? (
            <form onSubmit={handleBuscarPorEmail} className="space-y-4">
              <p className="text-sm text-text-muted mb-4">
                Para vincular um membro, ele precisa criar uma conta comum no aplicativo primeiro. Insira abaixo o <strong>E-mail de Cadastro</strong> do profissional.
              </p>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">E-mail do Profissional</label>
                <div className="relative">
                  <input required type="email" value={emailBusca} onChange={(e) => setEmailBusca(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 pl-10 text-sm outline-none focus:border-brand" placeholder="joao@email.com" />
                  <Mail size={16} className="absolute left-3 top-3.5 text-text-muted" />
                </div>
              </div>
              <button type="submit" disabled={buscando} className="w-full bg-brand hover:bg-brand-hover text-white font-bold p-3 rounded-xl text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2">
                <Search size={18}/> {buscando ? 'Procurando...' : 'Buscar Cadastro'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVincularUsuario} className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                  <User size={24}/>
                </div>
                <div>
                  <p className="font-bold text-base text-green-700">{usuarioEncontrado.nome}</p>
                  <p className="text-xs text-green-600">Conta validada com sucesso!</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Definir Permissão</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base cursor-pointer">
                  <option value="funcionario">Funcionário (Controla própria agenda)</option>
                  <option value="gerente">Gerente (Agenda geral e estoque)</option>
                  <option value="admin">Administrador (Acesso total e financeiro)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border-line">
                <button type="button" onClick={() => setUsuarioEncontrado(null)} className="w-1/3 rounded-xl bg-background border border-border-line p-3 text-sm font-bold text-text-muted hover:bg-border-line cursor-pointer">Voltar</button>
                <button type="submit" className="w-2/3 bg-brand hover:bg-brand-hover text-white font-bold p-3 rounded-xl text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2">
                  <Check size={18}/> Adicionar à Equipe
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 🚀 MODAL: EDITAR DADOS DE MEMBRO EXISTENTE */}
      {isAddOpen && editingMembro && (
        <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm mb-8 max-w-2xl animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Edit2 size={20}/> Atualizar Dados: {editingMembro.nome}
            </h2>
            <button onClick={fecharFormulario} className="text-text-muted hover:text-text-base cursor-pointer"><X size={20} /></button>
          </div>

          <form onSubmit={handleSalvarEdicao} className="space-y-4">
            
            {editingMembro.id !== user.id && (
              <div className="flex items-center gap-3 p-3 bg-background border border-border-line rounded-xl mb-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={ativo} onChange={() => setAtivo(!ativo)} />
                  <div className="w-11 h-6 bg-border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                </label>
                <div>
                  <p className="text-sm font-bold text-text-base">{ativo ? 'Conta Ativa' : 'Conta Desativada'}</p>
                  <p className="text-xs text-text-muted">{ativo ? 'O profissional pode usar o app normalmente.' : 'Acesso bloqueado e oculto da agenda.'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome Completo</label>
                <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="Nome completo" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nível de Permissão</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} disabled={editingMembro.id === user.id && editingMembro.role === 'admin'} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base">
                  <option value="funcionario">Funcionário (Própria agenda)</option>
                  <option value="gerente">Gerente (Agenda geral e equipe)</option>
                  <option value="admin">Administrador (Acesso total)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">WhatsApp</label>
                <input required type="tel" value={whatsapp} onChange={(e) => setWhatsapp(maskPhone(e.target.value))} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">CPF</label>
                <input type="text" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="000.000.000-00" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">CEP</label>
                <div className="relative">
                  <input type="text" value={cep} onChange={(e) => { const masked = maskCEP(e.target.value); setCep(masked); handleBuscaCEP(masked); }} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="00000-000" />
                  <Search size={16} className="absolute right-3 top-3.5 text-text-muted" />
                </div>
              </div>
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Rua, Bairro e Cidade</label>
                <div className="relative">
                  <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 pl-9 text-sm outline-none focus:border-brand" placeholder="Logradouro" />
                  <MapPin size={16} className="absolute left-3 top-3.5 text-text-muted" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nº</label>
                <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="123" />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border-line">
              <button type="button" onClick={fecharFormulario} className="w-1/3 rounded-xl bg-background border border-border-line p-3 text-sm font-bold text-text-muted hover:bg-border-line cursor-pointer">Cancelar</button>
              <button type="submit" className="w-2/3 bg-brand hover:bg-brand-hover text-white font-bold p-3 rounded-xl text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2">
                <Check size={18}/> Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTA DA EQUIPE */}
      <div className="bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border-line"><h2 className="text-lg font-bold flex items-center gap-2"><Users size={20}/> Profissionais Cadastrados</h2></div>
        {loading ? <p className="p-6 text-center text-text-muted text-sm">Carregando...</p> : equipe.length === 0 ? <p className="p-6 text-center text-text-muted text-sm">Nenhum membro cadastrado.</p> : (
          <ul className="divide-y divide-border-line">
            {equipe.map((membro) => (
              <li key={membro.id} className={`p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${membro.ativo === false ? 'opacity-60 bg-background' : 'hover:bg-background'}`}>
                
                <div className="flex items-start gap-4 w-full">
                  <div className={`h-12 w-12 rounded-full border flex items-center justify-center shadow-sm shrink-0 ${membro.ativo === false ? 'bg-background border-border-line text-border-line' : 'bg-brand/10 border-brand/20 text-brand'}`}>
                    <User size={24} />
                  </div>
                  
                  <div className="space-y-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-base text-text-base">{membro.nome}</p>
                      {membro.id === user.id && <span className="bg-background border border-border-line text-text-muted text-[10px] font-bold px-2 py-0.5 rounded-full">Você</span>}
                      {membro.ativo === false && <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">Inativo</span>}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${membro.role === 'admin' ? 'bg-amber-500/10 text-brand' : membro.role === 'gerente' ? 'bg-blue-500/10 text-blue-600' : 'bg-zinc-500/10 text-zinc-600'}`}>
                        <Shield size={10}/> {membro.role === 'admin' ? 'Admin' : membro.role === 'gerente' ? 'Gerente' : 'Funcionário'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                      <p className="flex items-center gap-1.5"><Phone size={14}/> {membro.whatsapp}</p>
                      {membro.cpf && <p className="flex items-center gap-1.5"><IdCard size={14}/> {membro.cpf}</p>}
                    </div>

                    {(membro.endereco || membro.cep) && (
                      <p className="text-xs text-text-muted flex items-start gap-1.5 bg-background p-2 rounded-lg border border-border-line w-fit">
                        <MapPin size={14} className="shrink-0 mt-0.5 text-brand" /> 
                        <span>
                          {membro.endereco || 'Endereço não cadastrado'} 
                          {membro.numero && `, Nº ${membro.numero}`}
                          {membro.cep && ` (CEP: ${membro.cep})`}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                  <button onClick={() => abrirEdicao(membro)} className="p-2 border border-border-line rounded-xl bg-surface text-text-muted hover:text-brand hover:border-brand transition-colors cursor-pointer"><Edit2 size={16} /></button>
                  {membro.id !== user.id && (
                    <button onClick={() => handleDeletarMembro(membro.id)} className="p-2 border border-border-line rounded-xl bg-surface text-red-500 hover:bg-red-500/10 hover:border-red-500 transition-colors cursor-pointer" title="Desligar Profissional"><Trash2 size={16} /></button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}