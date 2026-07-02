import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Search, User, Mail, Phone, Edit, Ban, X, Save, ShieldCheck } from 'lucide-react';

export default function AdminUsuarios() {
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  
  // Estados para o Modal de Detalhes
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (profile?.barbearia_id) buscarUsuarios();
  }, [profile]);

  const buscarUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('barbearia_id', profile.barbearia_id)
        .order('role', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      showAlert('Erro', 'Não foi possível carregar os usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalhes = (usuario) => {
    setUsuarioSelecionado(usuario);
    setFormData(usuario);
    setModoEdicao(false);
  };

  const fecharModal = () => {
    setUsuarioSelecionado(null);
    setModoEdicao(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const salvarEdicao = async () => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: formData.nome,
          email: formData.email,
          whatsapp: formData.whatsapp,
          cpf: formData.cpf,
          role: formData.role,
          ativo: formData.ativo // Salva se está ativo ou inativo
        })
        .eq('id', usuarioSelecionado.id);

      if (error) throw error;

      showAlert('Sucesso', 'Informações atualizadas com sucesso!', 'success');
      buscarUsuarios();
      fecharModal();
    } catch (err) {
      showAlert('Erro', 'Não foi possível atualizar o usuário.', 'error');
    }
  };

  const alternarStatusUsuario = (usuario) => {
    const isAdmin = profile.role === 'admin';
    if (!isAdmin) return showAlert('Acesso Negado', 'Apenas o administrador gerenciar status de usuários.', 'error');
    if (usuario.id === profile.id) return showAlert('Atenção', 'Você não pode desativar a si mesmo.', 'info');

    const acao = usuario.ativo ? 'Desativar / Banir' : 'Reativar';
    const msg = usuario.ativo 
      ? `Tem certeza que deseja desativar ${usuario.nome}? Ele não poderá mais acessar o sistema.`
      : `Deseja reativar o acesso de ${usuario.nome} ao sistema?`;

    showConfirm(
      `${acao} Usuário?`,
      msg,
      async () => {
        try {
          const { error } = await supabase
            .from('usuarios')
            .update({ ativo: !usuario.ativo }) // Inverte o status atual
            .eq('id', usuario.id);

          if (error) throw error;
          showAlert('Sucesso', `Usuário ${usuario.ativo ? 'desativado' : 'reativado'} com sucesso.`, 'success');
          buscarUsuarios();
          fecharModal();
        } catch (err) {
          showAlert('Erro', 'Erro ao alterar status do usuário.', 'error');
        }
      }
    );
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.nome?.toLowerCase().includes(termoBusca.toLowerCase()) ||
    u.email?.toLowerCase().includes(termoBusca.toLowerCase()) ||
    u.whatsapp?.includes(termoBusca) ||
    u.cpf?.includes(termoBusca)
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto mb-20 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-base">Gerenciamento de Usuários</h1>
        <p className="text-sm text-text-muted mt-1">Gerencie clientes, funcionários, gerentes e administradores.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />
        <input 
          type="text" 
          value={termoBusca} 
          onChange={(e) => setTermoBusca(e.target.value)} 
          placeholder="Buscar por nome, e-mail, CPF ou telefone..." 
          className="w-full pl-12 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>
      ) : (
        <div className="bg-surface border border-border-line rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-border-line">
                  <th className="p-4 font-bold text-xs text-text-muted uppercase tracking-wider">Usuário</th>
                  <th className="p-4 font-bold text-xs text-text-muted uppercase tracking-wider">Contato</th>
                  <th className="p-4 font-bold text-xs text-text-muted uppercase tracking-wider">CPF</th>
                  <th className="p-4 font-bold text-xs text-text-muted uppercase tracking-wider">Permissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-line">
                {usuariosFiltrados.map((usuario) => (
                  <tr 
                    key={usuario.id} 
                    onClick={() => abrirDetalhes(usuario)}
                    className={`hover:bg-brand/5 cursor-pointer transition-colors ${!usuario.ativo ? 'opacity-50 grayscale' : ''}`}
                  >
                    <td className="p-4 flex items-center gap-3">
                      {usuario.avatar_url ? (
                        <img src={usuario.avatar_url} alt={usuario.nome} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black">
                          {usuario.nome?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm text-text-base">{usuario.nome}</p>
                        {!usuario.ativo && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">Inativo</span>}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-text-muted">
                      <div className="flex flex-col gap-1">
                        {usuario.whatsapp && <span className="flex items-center gap-1"><Phone size={12}/> {usuario.whatsapp}</span>}
                        {usuario.email && <span className="flex items-center gap-1"><Mail size={12}/> {usuario.email}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-text-base">{usuario.cpf || '-'}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider
                        ${usuario.role === 'admin' ? 'bg-brand text-white' : 
                          usuario.role === 'gerente' ? 'bg-amber-500/20 text-amber-600' : 
                          usuario.role === 'funcionario' ? 'bg-blue-500/20 text-blue-600' : 
                          'bg-gray-200 text-gray-600'}`}>
                        {usuario.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES E EDIÇÃO */}
      {usuarioSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-5 border-b border-border-line bg-background">
              <h3 className="font-black text-lg text-text-base flex items-center gap-2">
                <User size={20} className="text-brand"/> Detalhes do Perfil
              </h3>
              <button onClick={fecharModal} className="p-2 text-text-muted hover:bg-border-line rounded-full transition">
                <X size={20} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-20 w-20 rounded-full bg-brand/10 border-2 border-brand text-brand flex items-center justify-center font-black text-3xl">
                  {usuarioSelecionado.avatar_url ? (
                    <img src={usuarioSelecionado.avatar_url} alt="Foto" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    usuarioSelecionado.nome?.charAt(0)
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{usuarioSelecionado.nome}</h2>
                  <p className="text-sm text-text-muted capitalize">Cargo: {usuarioSelecionado.role}</p>
                  {!usuarioSelecionado.ativo && <p className="text-xs text-red-500 font-bold mt-1">Status: Conta Desativada</p>}
                </div>
              </div>

              {/* Formulário de Dados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">Nome Completo</label>
                  <input type="text" name="nome" value={formData.nome || ''} onChange={handleInputChange} disabled={!modoEdicao}
                    className="w-full p-2.5 bg-background border border-border-line rounded-lg text-sm outline-none disabled:opacity-70 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">CPF</label>
                  <input type="text" name="cpf" value={formData.cpf || ''} onChange={handleInputChange} disabled={!modoEdicao}
                    className="w-full p-2.5 bg-background border border-border-line rounded-lg text-sm outline-none disabled:opacity-70 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">E-mail</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} disabled={!modoEdicao}
                    className="w-full p-2.5 bg-background border border-border-line rounded-lg text-sm outline-none disabled:opacity-70 focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1">WhatsApp</label>
                  <input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleInputChange} disabled={!modoEdicao}
                    className="w-full p-2.5 bg-background border border-border-line rounded-lg text-sm outline-none disabled:opacity-70 focus:border-brand" />
                </div>
                
                {/* Permissões - Apenas ADMIN pode editar */}
                {profile.role === 'admin' && modoEdicao && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-text-muted mb-1">Nível de Permissão</label>
                    <select name="role" value={formData.role || 'cliente'} onChange={handleInputChange}
                      className="w-full p-2.5 bg-background border border-border-line rounded-lg text-sm outline-none focus:border-brand">
                      <option value="cliente">Cliente</option>
                      <option value="funcionario">Funcionário / Barbeiro</option>
                      <option value="gerente">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal (Ações) */}
            <div className="p-5 border-t border-border-line bg-background flex justify-between items-center flex-wrap gap-3">
              {profile.role === 'admin' && !modoEdicao && (
                <button 
                  onClick={() => alternarStatusUsuario(usuarioSelecionado)} 
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition ${
                    usuarioSelecionado.ativo ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {usuarioSelecionado.ativo ? <><Ban size={16}/> Desativar Usuário</> : <><ShieldCheck size={16}/> Reativar Usuário</>}
                </button>
              )}
              
              <div className="flex gap-2 ml-auto">
                {profile.role === 'admin' && !modoEdicao && (
                  <button onClick={() => setModoEdicao(true)} className="flex items-center gap-1.5 text-xs font-bold bg-brand/10 text-brand px-4 py-2 rounded-lg hover:bg-brand/20 transition">
                    <Edit size={16}/> Editar Dados
                  </button>
                )}

                {modoEdicao && (
                  <>
                    <button onClick={() => {setModoEdicao(false); setFormData(usuarioSelecionado);}} className="text-xs font-bold text-text-muted px-4 py-2 hover:bg-border-line rounded-lg transition">
                      Cancelar
                    </button>
                    <button onClick={salvarEdicao} className="flex items-center gap-1.5 text-xs font-bold bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-hover transition shadow-sm">
                      <Save size={16}/> Salvar
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}