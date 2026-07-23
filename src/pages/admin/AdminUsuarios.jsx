import { useState, useEffect, useMemo } from 'react';

import { supabase } from '../../services/supabaseClient';

import { useAuth } from '../../context/AuthContext';

import { useModal } from '../../context/ModalContext';

import { Search, Mail, Phone, X, Filter, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';

import { getRoleLabel, BARBEARIA_ROLES } from '../../constants/roles';

import { auditLogService } from '../../services/auditLogService';

import HistoricoMudancas from '../../components/admin/HistoricoMudancas';



export default function AdminUsuarios() {

  const { profile } = useAuth();

  const { showAlert } = useModal();



  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(true);



  const [termoBusca, setTermoBusca] = useState('');

  const [filtroPermissao, setFiltroPermissao] = useState('todos');

  const [ordenacao, setOrdenacao] = useState('az');

  const [filtroCampo, setFiltroCampo] = useState('todos');



  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);

  const [modoEdicao, setModoEdicao] = useState(false);

  const [formData, setFormData] = useState({});



  useEffect(() => {

    if (profile?.barbearia_id) buscarUsuarios();

  }, [profile]);



  const buscarUsuarios = async () => {

    setLoading(true);

    try {

      const { data: vinculados, error: err1 } = await supabase.from('usuarios').select('*').eq('barbearia_id', profile.barbearia_id);

      if (err1) throw err1;



      const { data: agendamentos, error: err2 } = await supabase.from('agendamentos').select('cliente_id').eq('barbearia_id', profile.barbearia_id).not('cliente_id', 'is', null);

      if (err2) throw err2;

      const { data: agendamentosGhost, error: errGhost } = await supabase
        .from('agendamentos')
        .select('nome_cliente_avulso, whatsapp_cliente_avulso, email_cliente_avulso, criado_em')
        .eq('barbearia_id', profile.barbearia_id)
        .is('cliente_id', null)
        .not('nome_cliente_avulso', 'is', null);

      if (errGhost) throw errGhost;



      const idsAgendados = [...new Set(agendamentos.map(ag => ag.cliente_id))];



      let agendadosData = [];

      if (idsAgendados.length > 0) {

        const { data: agData, error: err3 } = await supabase.from('usuarios').select('*').in('id', idsAgendados);

        if (err3) throw err3;

        agendadosData = agData;

      }



      const unificadosMap = new Map();

      [...(vinculados || []), ...agendadosData].forEach(user => {

        unificadosMap.set(user.id, user);

      });

      (agendamentosGhost || []).forEach((ghost) => {
        const chave = ghost.whatsapp_cliente_avulso || ghost.nome_cliente_avulso;
        if (!chave || unificadosMap.has(`ghost-${chave}`)) return;
        unificadosMap.set(`ghost-${chave}`, {
          id: `ghost-${chave}`,
          nome: ghost.nome_cliente_avulso,
          whatsapp: ghost.whatsapp_cliente_avulso,
          email: ghost.email_cliente_avulso,
          role: 'cliente',
          isGhost: true,
          criado_em: ghost.criado_em,
        });
      });



      setUsuarios(Array.from(unificadosMap.values()));

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



  const handleInputChange = (e) => {

    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

  };



  const usuarioPertenceABarbearia = (usuario) =>

    usuario?.barbearia_id === profile.barbearia_id;



  const salvarEdicao = async () => {

    if (usuarioSelecionado?.isGhost) {
      showAlert('Cliente visitante', 'Este cliente ainda não possui conta. Os dados vêm de agendamentos avulsos.', 'info');
      return;
    }

    try {

      const payload = {

        nome: formData.nome,

        whatsapp: formData.whatsapp,

        cpf: formData.cpf,

      };



      if (usuarioPertenceABarbearia(usuarioSelecionado) && profile.role === 'admin') {

        payload.email = formData.email;

        payload.role = formData.role;

        payload.ativo = formData.ativo;

      }



      const { error } = await supabase.from('usuarios').update(payload).eq('id', usuarioSelecionado.id);

      if (error) throw error;



      await auditLogService.registrar({

        barbeariaId: profile.barbearia_id,

        usuarioId: profile.id,

        usuarioNome: profile.nome,

        modulo: 'clientes',

        acao: 'editar',

        descricao: `Usuário "${formData.nome}" atualizado`,

      });



      showAlert('Sucesso', 'Atualizado com sucesso!', 'success');

      buscarUsuarios();

      setUsuarioSelecionado(null);

    } catch (err) {

      showAlert('Erro', 'Não foi possível atualizar.', 'error');

    }

  };



  const usuariosFiltrados = useMemo(() => {

    let lista = [...usuarios];



    if (termoBusca.trim()) {

      const termo = termoBusca.toLowerCase().trim();

      lista = lista.filter((u) => {

        if (filtroCampo === 'nome') return u.nome?.toLowerCase().includes(termo);

        if (filtroCampo === 'email') return u.email?.toLowerCase().includes(termo);

        if (filtroCampo === 'cpf') return u.cpf?.includes(termoBusca);

        if (filtroCampo === 'telefone') return u.whatsapp?.includes(termoBusca);

        if (filtroCampo === 'contato') {

          return u.email?.toLowerCase().includes(termo) || u.whatsapp?.includes(termoBusca);

        }

        return (

          u.nome?.toLowerCase().includes(termo) ||

          u.email?.toLowerCase().includes(termo) ||

          u.whatsapp?.includes(termoBusca) ||

          u.cpf?.includes(termoBusca)

        );

      });

    }



    if (filtroPermissao !== 'todos') {

      lista = lista.filter((u) => u.role === filtroPermissao);

    }



    lista.sort((a, b) => {

      const cmp = (a.nome || '').localeCompare(b.nome || '', 'pt-BR');

      return ordenacao === 'za' ? -cmp : cmp;

    });



    return lista;

  }, [usuarios, termoBusca, filtroPermissao, ordenacao, filtroCampo]);



  return (

    <div className="p-6 md:p-10 max-w-6xl mx-auto mb-20 relative space-y-6">

      <div>

        <h1 className="text-2xl font-black text-text-base">Base de Clientes e Equipe</h1>

        <p className="text-sm text-text-muted mt-1">Todos que estão vinculados ou já agendaram na sua barbearia.</p>

      </div>



      <div className="bg-surface border border-border-line rounded-2xl p-4 shadow-sm space-y-4">

        <div className="relative">

          <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />

          <input

            type="text"

            value={termoBusca}

            onChange={(e) => setTermoBusca(e.target.value)}

            placeholder="Buscar..."

            className="w-full pl-12 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none"

          />

        </div>



        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          <div>

            <label className="block text-[10px] font-black text-text-muted uppercase mb-1 flex items-center gap-1"><Filter size={12}/> Buscar em</label>

            <select value={filtroCampo} onChange={(e) => setFiltroCampo(e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-2.5 text-sm font-bold outline-none cursor-pointer">

              <option value="todos">Todos os campos</option>

              <option value="nome">Nome</option>

              <option value="email">E-mail</option>

              <option value="cpf">CPF</option>

              <option value="telefone">Telefone</option>

              <option value="contato">Contato (e-mail + tel.)</option>

            </select>

          </div>

          <div>

            <label className="block text-[10px] font-black text-text-muted uppercase mb-1">Permissão</label>

            <select value={filtroPermissao} onChange={(e) => setFiltroPermissao(e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-2.5 text-sm font-bold outline-none cursor-pointer">

              <option value="todos">Todas</option>

              {BARBEARIA_ROLES.map((r) => (

                <option key={r.value} value={r.value}>{r.label}</option>

              ))}

            </select>

          </div>

          <div>

            <label className="block text-[10px] font-black text-text-muted uppercase mb-1">Ordenar nome</label>

            <div className="flex gap-2">

              <button type="button" onClick={() => setOrdenacao('az')} className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${ordenacao === 'az' ? 'bg-brand text-white border-brand' : 'bg-background border-border-line'}`}>

                <ArrowUpAZ size={14} /> A–Z

              </button>

              <button type="button" onClick={() => setOrdenacao('za')} className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${ordenacao === 'za' ? 'bg-brand text-white border-brand' : 'bg-background border-border-line'}`}>

                <ArrowDownAZ size={14} /> Z–A

              </button>

            </div>

          </div>

        </div>

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

                      <span className="px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider bg-surface border border-border-line text-text-muted">

                        {usuario.isGhost ? 'Visitante (sem conta)' : getRoleLabel(usuario.role)}

                      </span>

                    </td>

                  </tr>

                ))}

                {usuariosFiltrados.length === 0 && (

                  <tr><td colSpan="3" className="p-8 text-center text-text-muted font-bold">Nenhum usuário encontrado com os filtros atuais.</td></tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      )}



      {usuarioSelecionado && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

          <div className="bg-surface rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 relative">

            <button onClick={() => setUsuarioSelecionado(null)} className="absolute top-4 right-4 text-text-muted hover:text-text-base p-2"><X size={20}/></button>

            <h3 className="font-black text-xl mb-6">Perfil do Usuário</h3>

            <div className="space-y-4">

              <input type="text" name="nome" value={formData.nome || ''} onChange={handleInputChange} disabled={!modoEdicao} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm font-bold" />

              <input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleInputChange} disabled={!modoEdicao} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm font-bold" />



              {profile.role === 'admin' && modoEdicao && usuarioPertenceABarbearia(usuarioSelecionado) && (

                <select name="role" value={formData.role || 'cliente'} onChange={handleInputChange} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm font-bold">

                  {BARBEARIA_ROLES.map((r) => (

                    <option key={r.value} value={r.value}>{r.label}</option>

                  ))}

                </select>

              )}



              <div className="pt-4 flex gap-2 justify-end border-t border-border-line">

                {!modoEdicao && profile.role === 'admin' && usuarioPertenceABarbearia(usuarioSelecionado) && (

                  <button onClick={() => setModoEdicao(true)} className="bg-brand/10 text-brand px-4 py-2 rounded-xl text-sm font-bold cursor-pointer">Editar</button>

                )}

                {modoEdicao && <button onClick={salvarEdicao} className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer">Salvar</button>}

              </div>

            </div>

          </div>

        </div>

      )}



      <HistoricoMudancas barbeariaId={profile?.barbearia_id} modulo="clientes" />

    </div>

  );

}


