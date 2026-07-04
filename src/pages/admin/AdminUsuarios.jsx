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
  
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (profile?.barbearia_id) buscarUsuarios();
  }, [profile]);

  // ✨ BUSCA ABRANGENTE: Vinculados + Clientes de Agendamentos
  const buscarUsuarios = async () => {
    setLoading(true);
    try {
      // 1. Busca usuários vinculados diretamente (Equipe/Clientes fidelizados)
      const { data: vinculados, error: err1 } = await supabase.from('usuarios').select('*').eq('barbearia_id', profile.barbearia_id);
      if (err1) throw err1;

      // 2. Busca IDs únicos de clientes que já agendaram
      const { data: agendamentos, error: err2 } = await supabase.from('agendamentos').select('cliente_id').eq('barbearia_id', profile.barbearia_id).not('cliente_id', 'is', null);
      if (err2) throw err2;

      const idsAgendados = [...new Set(agendamentos.map(ag => ag.cliente_id))];

      // 3. Busca os dados desses clientes, caso existam
      let agendadosData = [];
      if (idsAgendados.length > 0) {
        const { data: agData, error: err3 } = await supabase.from('usuarios').select('*').in('id', idsAgendados);
        if (err3) throw err3;
        agendadosData = agData;
      }

      // 4. Junta as duas listas removendo duplicados (pelo ID)
      const unificadosMap = new Map();
      [...(vinculados || []), ...agendadosData].forEach(user => {
        unificadosMap.set(user.id, user);
      });

      const listaFinal = Array.from(unificadosMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
      setUsuarios(listaFinal);

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

  const salvarEdicao = async () => {
    try {
      const { error } = await supabase.from('usuarios').update({ nome: formData.nome, email: formData.email, whatsapp: formData.whatsapp, cpf: formData.cpf, role: formData.role, ativo: formData.ativo }).eq('id', usuarioSelecionado.id);
      if (error) throw error;
      showAlert('Sucesso', 'Atualizado com sucesso!', 'success');
      buscarUsuarios();
      setUsuarioSelecionado(null);
    } catch (err) { showAlert('Erro', 'Não foi possível atualizar.', 'error'); }
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.nome?.toLowerCase().includes(termoBusca.toLowerCase()) ||
    u.email?.toLowerCase().includes(termoBusca.toLowerCase()) ||
    u.whatsapp?.includes(termoBusca) || u.cpf?.includes(termoBusca)
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto mb-20 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-base">Base de Clientes e Equipe</h1>
        <p className="text-sm text-text-muted mt-1">Todos que estão vinculados ou já agendaram na sua barbearia.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />
        <input type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} placeholder="Buscar por nome, e-mail, CPF ou telefone..." className="w-full pl-12 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
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
                  <th className="p-4 font-bold text-xs text-text-muted uppercase tracking-wider">Permissão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-line">
                {usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} onClick={() => abrirDetalhes(usuario)} className="hover:bg-brand/5 cursor-pointer transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black">{usuario.nome?.charAt(0) || '?'}</div>
                      <div>
                        <p className="font-bold text-sm text-text-base">{usuario.nome}</p>
                        <p className="text-xs text-text-muted mt-0.5">{usuario.cpf || 'Sem CPF'}</p>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-text-muted">
                      {usuario.whatsapp && <span className="flex items-center gap-1 mb-1"><Phone size={12}/> {usuario.whatsapp}</span>}
                      {usuario.email && <span className="flex items-center gap-1"><Mail size={12}/> {usuario.email}</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${usuario.role === 'admin' ? 'bg-brand text-white' : usuario.role === 'gerente' ? 'bg-amber-500/20 text-amber-600' : usuario.role === 'funcionario' ? 'bg-blue-500/20 text-blue-600' : 'bg-surface border border-border-line text-text-muted'}`}>{usuario.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL IDÊNTICO AO DE ANTES, RESUMIDO POR ESPAÇO */}
      {usuarioSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setUsuarioSelecionado(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-base p-2"><X size={20}/></button>
            <h3 className="font-black text-xl mb-6">Perfil do Usuário</h3>
            <div className="space-y-4">
              <input type="text" name="nome" value={formData.nome || ''} onChange={handleInputChange} disabled={!modoEdicao} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm font-bold" />
              <input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleInputChange} disabled={!modoEdicao} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm font-bold" />
              
              {profile.role === 'admin' && modoEdicao && (
                <select name="role" value={formData.role || 'cliente'} onChange={handleInputChange} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm font-bold">
                  <option value="cliente">Cliente</option>
                  <option value="funcionario">Barbeiro</option>
                  <option value="gerente">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              )}

              <div className="pt-4 flex gap-2 justify-end border-t border-border-line">
                {!modoEdicao && profile.role === 'admin' && <button onClick={() => setModoEdicao(true)} className="bg-brand/10 text-brand px-4 py-2 rounded-xl text-sm font-bold">Editar</button>}
                {modoEdicao && <button onClick={salvarEdicao} className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold">Salvar</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}