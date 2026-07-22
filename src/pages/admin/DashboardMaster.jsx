import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Shield, Users, CalendarCheck, TrendingUp, Edit, ExternalLink, X, MapPin, Building2, Crown, Search, CheckCircle, Ban, Filter, Trash2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DashboardMaster() {
  const [abaAtiva, setAbaAtiva] = useState('empresas'); // 'empresas', 'agendamentos', 'usuarios'
  const [loading, setLoading] = useState(true);

  // Estados Globais
  const [resumo, setResumo] = useState({ totalBarbearias: 0, totalUsuarios: 0, totalAgendamentos: 0, premium: 0 });

  // Estados Empresas
  const [empresas, setEmpresas] = useState([]);
  const [buscaEmpresa, setBuscaEmpresa] = useState('');
  
  // Estados Agendamentos
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Estados Usuários
  const [usuarios, setUsuarios] = useState([]);

  // Estados do Modal de Edição (Empresa Manual / Edição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Estados do Modal de Exclusão de Usuário
  const [isModalDeleteUserOpen, setIsModalDeleteUserOpen] = useState(false);
  const [usuarioParaDeletar, setUsuarioParaDeletar] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);

    // Carrega Barbearias
    const { data: bData } = await supabase.from('barbearias').select('*, usuarios(count), agendamentos(count)').order('criado_em', { ascending: false });
    if (bData) {
      setEmpresas(bData);
      setResumo({
        totalBarbearias: bData.length,
        totalUsuarios: bData.reduce((acc, curr) => acc + (curr.usuarios?.[0]?.count || 0), 0),
        totalAgendamentos: bData.reduce((acc, curr) => acc + (curr.agendamentos?.[0]?.count || 0), 0),
        premium: bData.filter(b => b.plano_ativo === 'premium').length
      });
    }

    // Carrega Usuários
    const { data: uData } = await supabase.from('usuarios').select('*').order('criado_em', { ascending: false });
    if (uData) setUsuarios(uData);

    setLoading(false);
  };

  // ----- Ações de Agendamentos -----
  const buscarAgendamentos = async () => {
    let query = supabase.from('agendamentos').select('*, barbearias(nome), cliente:usuarios!agendamentos_cliente_id_fkey(nome), barbeiro:usuarios!agendamentos_barbeiro_id_fkey(nome)').order('data_hora', { ascending: false });
    
    if (dataInicio) query = query.gte('data_hora', `${dataInicio}T00:00:00`);
    if (dataFim) query = query.lte('data_hora', `${dataFim}T23:59:59`);
    
    const { data } = await query;
    if (data) setAgendamentos(data);
  };

  useEffect(() => {
    if (abaAtiva === 'agendamentos' && agendamentos.length === 0) {
      buscarAgendamentos();
    }
  }, [abaAtiva]);

  // ----- Ações de Barbearia -----
  const aprovarBarbearia = async (id) => {
    if(!window.confirm("Aprovar essa barbearia?")) return;
    // Atualizamos o plano_ativo e o status para integrar com o AdminLayout
    await supabase.from('barbearias').update({ plano_ativo: 'free', status: 'aprovada' }).eq('id', id);
    toast.success('Barbearia aprovada com sucesso!');
    carregarDados();
  };

  const recusarBarbearia = async (id) => {
    if(!window.confirm("Isso irá apagar a barbearia. Tem certeza?")) return;
    await supabase.from('barbearias').delete().eq('id', id);
    toast.success('Barbearia recusada/apagada.');
    carregarDados();
  };

  const togglePremium = async (id, planoAtual) => {
    const novoPlano = planoAtual === 'premium' ? 'free' : 'premium';
    await supabase.from('barbearias').update({ plano_ativo: novoPlano }).eq('id', id);
    toast.success(`Plano alterado para ${novoPlano.toUpperCase()}`);
    carregarDados();
  };

  // ----- Ações de Usuário -----
  const toggleBanirUsuario = async (id, ativo) => {
    if(!window.confirm(`Deseja ${ativo ? 'BANIR' : 'DESBANIR'} este usuário?`)) return;
    await supabase.from('usuarios').update({ ativo: !ativo }).eq('id', id);
    toast.success(`Usuário ${ativo ? 'banido' : 'desbanido'} com sucesso!`);
    carregarDados();
  };

  const abrirModalDeletarUsuario = (usuario) => {
    setUsuarioParaDeletar(usuario);
    setIsModalDeleteUserOpen(true);
  };

  const confirmarExclusaoUsuario = async (comHistorico) => {
    if (!usuarioParaDeletar) return;
    setLoading(true);

    try {
      if (comHistorico) {
        // Excluir todos os agendamentos onde ele é cliente ou barbeiro
        await supabase.from('agendamentos').delete().or(`cliente_id.eq.${usuarioParaDeletar.id},barbeiro_id.eq.${usuarioParaDeletar.id}`);
      } else {
        // Desvincular agendamentos para manter o histórico (caso o banco permita null)
        await supabase.from('agendamentos').update({ cliente_id: null }).eq('cliente_id', usuarioParaDeletar.id);
        await supabase.from('agendamentos').update({ barbeiro_id: null }).eq('barbeiro_id', usuarioParaDeletar.id);
      }
      
      // Excluir o usuário da tabela 'usuarios'
      const { error } = await supabase.from('usuarios').delete().eq('id', usuarioParaDeletar.id);
      
      if (error) throw error;
      
      toast.success('Usuário excluído com sucesso!');
      setIsModalDeleteUserOpen(false);
      setUsuarioParaDeletar(null);
      carregarDados();
    } catch (err) {
      toast.error('Erro ao excluir usuário. Verifique as restrições do banco (FKs).');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ----- Funções do Modal de Edição/Criação Manual -----
  const abrirModalEdicao = (empresa = null) => {
    if (empresa) {
      setEmpresaEditando({ ...empresa });
    } else {
      setEmpresaEditando({ nome: '', slug: '', cnpj: '', telefone: '', cidade: '', estado: '', plano_ativo: 'free', status: 'aprovada' });
    }
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEmpresaEditando(null);
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const isNew = !empresaEditando.id;
      let error;

      if (isNew) {
        const { error: insertError } = await supabase.from('barbearias').insert([empresaEditando]);
        error = insertError;
      } else {
        const { error: updateError } = await supabase.from('barbearias').update(empresaEditando).eq('id', empresaEditando.id);
        error = updateError;
      }

      if (error) throw error;

      toast.success(`Empresa ${isNew ? 'criada' : 'atualizada'} com sucesso!`);
      fecharModal();
      carregarDados();
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-background min-h-screen pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 shadow-sm">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-text-base">Painel Master</h1>
              <p className="text-text-muted font-medium">Controle total da plataforma</p>
            </div>
          </div>
        </div>

        {/* MÉTRICAS GLOBAIS */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-brand mb-2"><Building2 size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Barbearias</p>
              <p className="text-2xl font-black text-text-base">{resumo.totalBarbearias}</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-blue-500 mb-2"><Users size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Usuários Totais</p>
              <p className="text-2xl font-black text-text-base">{resumo.totalUsuarios}</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-green-500 mb-2"><CalendarCheck size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Agendamentos</p>
              <p className="text-2xl font-black text-text-base">{resumo.totalAgendamentos}</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-amber-500 mb-2"><Crown size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Planos Premium</p>
              <p className="text-2xl font-black text-text-base">{resumo.premium}</p>
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO DAS ABAS */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setAbaAtiva('empresas')} className={`px-5 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${abaAtiva === 'empresas' ? 'bg-brand text-white shadow-md' : 'bg-surface border border-border-line text-text-muted hover:border-brand'}`}>
            Empresas
          </button>
          <button onClick={() => setAbaAtiva('agendamentos')} className={`px-5 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${abaAtiva === 'agendamentos' ? 'bg-brand text-white shadow-md' : 'bg-surface border border-border-line text-text-muted hover:border-brand'}`}>
            Lista de Agendamentos
          </button>
          <button onClick={() => setAbaAtiva('usuarios')} className={`px-5 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${abaAtiva === 'usuarios' ? 'bg-brand text-white shadow-md' : 'bg-surface border border-border-line text-text-muted hover:border-brand'}`}>
            Lista de Usuários
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div></div>
        ) : (
          <>
            {/* ==================== ABA EMPRESAS ==================== */}
            {abaAtiva === 'empresas' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface p-4 rounded-2xl border border-border-line shadow-sm">
                  <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar barbearia..." 
                      value={buscaEmpresa} 
                      onChange={(e) => setBuscaEmpresa(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <button onClick={() => abrirModalEdicao(null)} className="w-full md:w-auto bg-brand text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:brightness-110 transition-all cursor-pointer">
                    + Adicionar Manual
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {empresas.filter(e => e.nome.toLowerCase().includes(buscaEmpresa.toLowerCase())).map((emp) => (
                    <div key={emp.id} className="bg-surface border border-border-line p-6 rounded-3xl shadow-sm hover:border-brand/40 transition-colors flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-black text-text-base flex items-center gap-2">
                              {emp.nome} 
                              {emp.plano_ativo === 'premium' && <Crown size={18} className="text-amber-500" />}
                            </h3>
                            <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
                              <MapPin size={14} /> {emp.cidade ? `${emp.cidade} - ${emp.estado}` : 'Sem endereço'}
                            </p>
                          </div>
                          {emp.plano_ativo === 'pendente_aprovacao' || emp.status === 'pendente' ? (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">Pendente</span>
                          ) : (
                            <button onClick={() => togglePremium(emp.id, emp.plano_ativo)} className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg tracking-wider cursor-pointer transition-colors ${emp.plano_ativo === 'premium' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-background border border-border-line text-text-muted hover:border-brand'}`}>
                              {emp.plano_ativo === 'premium' ? 'Remover Premium' : 'Ativar Premium'}
                            </button>
                          )}
                        </div>

                        <div className="flex gap-4 mb-6 pb-6 border-b border-border-line">
                          <div className="flex-1 bg-background rounded-xl p-3 text-center border border-border-line">
                            <p className="text-[10px] font-black uppercase text-text-muted mb-0.5">Membros</p>
                            <p className="text-lg font-black text-text-base">{emp.usuarios?.[0]?.count || 0}</p>
                          </div>
                          <div className="flex-1 bg-background rounded-xl p-3 text-center border border-border-line">
                            <p className="text-[10px] font-black uppercase text-text-muted mb-0.5">Reservas</p>
                            <p className="text-lg font-black text-text-base">{emp.agendamentos?.[0]?.count || 0}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-auto">
                        {emp.plano_ativo === 'pendente_aprovacao' || emp.status === 'pendente' ? (
                          <>
                            <button onClick={() => aprovarBarbearia(emp.id)} className="flex-1 bg-green-500/10 text-green-600 py-2.5 rounded-xl text-sm font-bold hover:bg-green-500 hover:text-white transition-colors flex justify-center items-center gap-2 cursor-pointer">
                              <CheckCircle size={16} /> Aprovar
                            </button>
                            <button onClick={() => recusarBarbearia(emp.id)} className="flex-1 bg-red-500/10 text-red-500 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-colors flex justify-center items-center gap-2 cursor-pointer">
                              <X size={16} /> Recusar
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => abrirModalEdicao(emp)} className="flex-1 bg-background border border-border-line text-text-base py-2.5 rounded-xl text-sm font-bold hover:border-brand transition-colors flex justify-center items-center gap-2 cursor-pointer">
                              <Edit size={16} /> Editar
                            </button>
                            {/* ✨ Link para acessar o painel de admin como Master */}
                            <Link to={`/${emp.slug}/admin`} className="flex-1 bg-brand text-white py-2.5 rounded-xl text-sm font-bold hover:brightness-110 shadow-sm transition-colors flex justify-center items-center gap-2 cursor-pointer">
                              <Settings size={16} /> Acessar Painel
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==================== ABA AGENDAMENTOS ==================== */}
            {abaAtiva === 'agendamentos' && (
              <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm animate-fadeIn overflow-hidden">
                <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                  <div className="w-full md:w-auto">
                    <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Data Início</label>
                    <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-background border border-border-line rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" />
                  </div>
                  <div className="w-full md:w-auto">
                    <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Data Fim</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-background border border-border-line rounded-xl px-4 py-3 text-sm focus:border-brand outline-none" />
                  </div>
                  <button onClick={buscarAgendamentos} className="w-full md:w-auto bg-brand text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:brightness-110 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Filter size={18} /> Filtrar
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-line">
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Data/Hora</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Barbearia</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Cliente</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Barbeiro</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendamentos.map(ag => (
                        <tr key={ag.id} className="border-b border-border-line hover:bg-background/50 transition-colors">
                          <td className="py-4 px-4 text-sm font-bold text-text-base">{new Date(ag.data_hora).toLocaleString('pt-BR')}</td>
                          <td className="py-4 px-4 text-sm text-text-muted">{ag.barbearias?.nome || '-'}</td>
                          <td className="py-4 px-4 text-sm font-bold text-text-base">{ag.cliente?.nome || ag.nome_cliente_avulso}</td>
                          <td className="py-4 px-4 text-sm text-text-muted">{ag.barbeiro?.nome || '-'}</td>
                          <td className="py-4 px-4">
                            <span className="bg-background border border-border-line text-[10px] font-black uppercase px-2 py-1 rounded-md">{ag.status_atendimento}</span>
                          </td>
                        </tr>
                      ))}
                      {agendamentos.length === 0 && (
                        <tr><td colSpan="5" className="py-8 text-center text-text-muted font-bold">Nenhum agendamento encontrado no período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==================== ABA USUÁRIOS ==================== */}
            {abaAtiva === 'usuarios' && (
              <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm animate-fadeIn overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-line">
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Nome</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Email / Contato</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Role</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Status</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map(u => (
                        <tr key={u.id} className={`border-b border-border-line transition-colors ${!u.ativo ? 'bg-red-500/5' : 'hover:bg-background/50'}`}>
                          <td className="py-4 px-4">
                            <p className="text-sm font-bold text-text-base">{u.nome}</p>
                            <p className="text-xs text-text-muted">{u.cpf || 'Sem CPF'}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-text-base">{u.email}</p>
                            <p className="text-xs text-text-muted">{u.whatsapp}</p>
                          </td>
                          <td className="py-4 px-4 text-sm font-bold text-brand capitalize">{u.role}</td>
                          <td className="py-4 px-4">
                            {u.ativo ? (
                              <span className="bg-green-500/10 text-green-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">Ativo</span>
                            ) : (
                              <span className="bg-red-500/10 text-red-500 text-[10px] font-black uppercase px-2 py-1 rounded-md">Banido</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => toggleBanirUsuario(u.id, u.ativo)} className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${u.ativo ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'}`}>
                                {u.ativo ? 'Banir' : 'Desbanir'}
                              </button>
                              {/* ✨ Botão para excluir usuário */}
                              <button onClick={() => abrirModalDeletarUsuario(u)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer" title="Excluir Usuário">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* MODAL DE EXCLUSÃO DE USUÁRIO */}
      {isModalDeleteUserOpen && usuarioParaDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative text-center">
            
            <button onClick={() => setIsModalDeleteUserOpen(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-base transition-colors cursor-pointer">
              <X size={20} />
            </button>
            
            <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            
            <h2 className="text-xl font-black text-text-base mb-2">
              Excluir {usuarioParaDeletar.nome.split(' ')[0]}?
            </h2>
            <p className="text-sm text-text-muted mb-6">
              Como deseja lidar com o histórico de agendamentos e pontos deste usuário?
            </p>

            <div className="space-y-3">
              <button 
                onClick={() => confirmarExclusaoUsuario(false)} 
                className="w-full bg-background border border-border-line text-text-base py-3 rounded-xl text-sm font-bold hover:border-red-500 hover:text-red-500 transition-colors cursor-pointer"
              >
                Só excluir o usuário (Manter histórico)
              </button>
              
              <button 
                onClick={() => confirmarExclusaoUsuario(true)} 
                className="w-full bg-red-500 text-white py-3 rounded-xl text-sm font-bold hover:brightness-110 transition-colors shadow-md cursor-pointer"
              >
                Excluir Usuário + Histórico (Destrutivo)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO / CRIAÇÃO MANUAL DA BARBEARIA */}
      {isModalOpen && empresaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-surface border border-border-line w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative my-auto">
            
            <button onClick={fecharModal} className="absolute top-6 right-6 text-text-muted hover:text-red-500 transition-colors cursor-pointer">
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black text-text-base mb-6 flex items-center gap-2">
              <Edit className="text-brand" /> {empresaEditando.id ? 'Editar Empresa' : 'Nova Empresa Manual'}
            </h2>

            <form onSubmit={salvarEdicao} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Nome da Barbearia</label>
                  <input required name="nome" value={empresaEditando.nome || ''} onChange={(e) => setEmpresaEditando({...empresaEditando, nome: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Slug (Link URL)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">app.com/</span>
                    <input required name="slug" value={empresaEditando.slug || ''} onChange={(e) => setEmpresaEditando({...empresaEditando, slug: e.target.value})} className="w-full bg-background border border-border-line rounded-xl py-3 pr-3 pl-20 text-sm font-bold focus:border-brand outline-none lowercase" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Plano Ativo</label>
                  <select name="plano_ativo" value={empresaEditando.plano_ativo || 'free'} onChange={(e) => setEmpresaEditando({...empresaEditando, plano_ativo: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none cursor-pointer">
                    <option value="pendente_aprovacao">Pendente</option>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Status do Painel</label>
                  <select name="status" value={empresaEditando.status || 'pendente'} onChange={(e) => setEmpresaEditando({...empresaEditando, status: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none cursor-pointer">
                    <option value="pendente">Pendente (Bloqueado)</option>
                    <option value="aprovada">Aprovada (Liberado)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">CNPJ</label>
                  <input name="cnpj" value={empresaEditando.cnpj || ''} onChange={(e) => setEmpresaEditando({...empresaEditando, cnpj: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Telefone</label>
                  <input name="telefone" value={empresaEditando.telefone || ''} onChange={(e) => setEmpresaEditando({...empresaEditando, telefone: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Cidade</label>
                  <input name="cidade" value={empresaEditando.cidade || ''} onChange={(e) => setEmpresaEditando({...empresaEditando, cidade: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
                </div>
              </div>

              <div className="pt-6 border-t border-border-line flex gap-3">
                <button type="button" onClick={fecharModal} className="flex-1 bg-background border border-border-line py-3.5 rounded-xl text-sm font-bold text-text-base hover:border-brand transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex-1 bg-brand text-white py-3.5 rounded-xl text-sm font-black hover:brightness-105 transition-colors disabled:opacity-50 cursor-pointer">
                  {salvando ? 'Salvando...' : 'Salvar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}