import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Shield, Users, CalendarCheck, TrendingUp, Edit, ExternalLink, X, MapPin, Building2, Crown, Search, CheckCircle, Ban, Filter, Trash2, Settings, Plus, UserPlus, Image, Headphones, Eye, Coins, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MASTER_ASSIGNABLE_ROLES, getRoleLabel } from '../../constants/roles';
import { masterSetTenantPlan, ensureFreeSubscription } from '../../services/planService';
import { fetchSupportNavStats } from '../../services/masterService';
import { fetchAllSupportTickets } from '../../services/supportService';
import { getPlanBadgeClass, getPlanLabel } from '../../constants/planDisplay';
import { uploadImagemBarbearia } from '../../utils/uploadBarbearia';
import { PanelNavShell, groupPanelItems } from '../../components/layout/PanelNav';
import { MASTER_MENU_ITEMS, MASTER_GROUP_ORDER } from '../../constants/masterModules';
import MasterSuporteSection from '../../components/support/MasterSuporteSection';
import MasterDashboardSection from '../../components/master/MasterDashboardSection';
import MasterPlanosSection from '../../components/master/MasterPlanosSection';
import MasterEmpresaQuickModal from '../../components/master/MasterEmpresaQuickModal';
import MasterMoedasModal from '../../components/master/MasterMoedasModal';

const CAMPOS_EMPRESA_SALVAR = [
  'nome', 'slug', 'cnpj', 'telefone', 'cidade', 'estado', 'status',
  'logo_url', 'capa_url', 'bairro', 'cep', 'rua', 'numero', 'razao_social',
];

export default function DashboardMaster() {
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [menuSheetAberto, setMenuSheetAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buscaPlano, setBuscaPlano] = useState('');
  const [filtroPlano, setFiltroPlano] = useState('todos');
  const [empresaQuickView, setEmpresaQuickView] = useState(null);
  const [moedasUsuario, setMoedasUsuario] = useState(null);
  const [alterandoPlanoId, setAlterandoPlanoId] = useState(null);
  const [supportStats, setSupportStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);

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
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [isModalUserOpen, setIsModalUserOpen] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({
    nome: '', email: '', whatsapp: '', password: '', role: 'cliente', barbearia_id: ''
  });
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);

  // Estados do Modal de Edição de Usuário
  const [isModalEditUserOpen, setIsModalEditUserOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [salvandoEdicaoUsuario, setSalvandoEdicaoUsuario] = useState(false);

  // Estados do Modal de Edição (Empresa Manual / Edição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoLogoMaster, setEnviandoLogoMaster] = useState(false);
  const [enviandoCapaMaster, setEnviandoCapaMaster] = useState(false);

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
      let empresasComPlano = bData;
      const ids = bData.map((b) => b.id);
      if (ids.length) {
        const { data: planos } = await supabase
          .from('barbearia_plano_atual')
          .select('barbearia_id, plan_slug, plan_nome')
          .in('barbearia_id', ids);
        const mapa = new Map((planos || []).map((p) => [p.barbearia_id, p]));
        empresasComPlano = bData.map((b) => ({
          ...b,
          plan_slug: mapa.get(b.id)?.plan_slug || (b.status === 'pendente' ? 'pending' : 'free'),
          plan_nome: mapa.get(b.id)?.plan_nome || 'Horza Free',
        }));
      }
      setEmpresas(empresasComPlano);
      setResumo({
        totalBarbearias: empresasComPlano.length,
        totalUsuarios: empresasComPlano.reduce((acc, curr) => acc + (curr.usuarios?.[0]?.count || 0), 0),
        totalAgendamentos: empresasComPlano.reduce((acc, curr) => acc + (curr.agendamentos?.[0]?.count || 0), 0),
        premium: empresasComPlano.filter(b => b.plan_slug === 'pro' || b.plan_slug === 'plus').length
      });
    }

    // Carrega Usuários
    const { data: uData } = await supabase.from('usuarios').select('*').order('criado_em', { ascending: false });
    if (uData) setUsuarios(uData);

    try {
      const stats = await fetchSupportNavStats();
      setSupportStats(stats);
      const tickets = await fetchAllSupportTickets();
      setRecentTickets((tickets || []).slice(0, 5));
    } catch {
      setSupportStats(null);
      setRecentTickets([]);
    }

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
    const { error } = await supabase.from('barbearias').update({ status: 'aprovada' }).eq('id', id);
    if (error) {
      toast.error('Erro ao aprovar barbearia.');
      return;
    }
    try {
      await ensureFreeSubscription(id);
    } catch (err) {
      console.warn('Subscription free:', err);
    }
    toast.success('Barbearia aprovada com sucesso!');
    carregarDados();
  };

  const recusarBarbearia = async (id) => {
    if(!window.confirm("Isso irá apagar a barbearia. Tem certeza?")) return;
    const { error } = await supabase.from('barbearias').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao recusar barbearia.');
      return;
    }
    toast.success('Barbearia recusada/apagada.');
    carregarDados();
  };

  const alterarPlanoEmpresa = async (id, planSlug) => {
    setAlterandoPlanoId(id);
    try {
      await masterSetTenantPlan(id, planSlug);
      toast.success(`Plano alterado para ${getPlanLabel(planSlug)}`);
      await carregarDados();
    } catch (err) {
      toast.error('Erro ao alterar plano: ' + err.message);
    } finally {
      setAlterandoPlanoId(null);
    }
  };

  const toggleBanirUsuario = async (id, ativo) => {
    if (!window.confirm(`Deseja ${ativo ? 'BANIR' : 'DESBANIR'} este usuário?`)) return;
    const { error } = await supabase.from('usuarios').update({ ativo: !ativo }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar status do usuário.');
      return;
    }
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
      setEmpresaEditando({ nome: '', slug: '', cnpj: '', telefone: '', cidade: '', estado: '', status: 'aprovada', logo_url: '', capa_url: '' });
    }
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEmpresaEditando(null);
  };

  const montarPayloadEmpresa = (empresa) => {
    const payload = {};
    CAMPOS_EMPRESA_SALVAR.forEach((campo) => {
      if (empresa[campo] !== undefined) payload[campo] = empresa[campo] || null;
    });
    return payload;
  };

  const handleUploadImagemMaster = async (file, tipo) => {
    if (!empresaEditando?.id) {
      toast.error('Salve a empresa primeiro ou edite uma existente para enviar imagens.');
      return null;
    }
    const setLoading = tipo === 'logo' ? setEnviandoLogoMaster : setEnviandoCapaMaster;
    setLoading(true);
    try {
      const url = await uploadImagemBarbearia(empresaEditando.id, file, tipo);
      setEmpresaEditando((prev) => ({ ...prev, [`${tipo === 'logo' ? 'logo' : 'capa'}_url`]: url }));
      toast.success(`${tipo === 'logo' ? 'Foto' : 'Capa'} enviada! Clique em Salvar.`);
      return url;
    } catch (err) {
      toast.error(err.message || 'Erro no upload. Configure o bucket barbearias.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const isNew = !empresaEditando.id;
      const payload = montarPayloadEmpresa(empresaEditando);
      let error;

      if (isNew) {
        const { error: insertError } = await supabase.from('barbearias').insert([payload]);
        error = insertError;
      } else {
        const { error: updateError } = await supabase.from('barbearias').update(payload).eq('id', empresaEditando.id);
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

  const atualizarRoleUsuario = async (usuarioId, novaRole) => {
    const rolesValidas = MASTER_ASSIGNABLE_ROLES.map((r) => r.value);
    if (!rolesValidas.includes(novaRole)) {
      toast.error('Permissão inválida.');
      return;
    }

    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuarioId ? { ...u, role: novaRole } : u))
    );

    const { error } = await supabase.from('usuarios').update({ role: novaRole }).eq('id', usuarioId);
    if (error) {
      toast.error('Erro ao atualizar permissão.');
      carregarDados();
      return;
    }
    toast.success(`Permissão alterada para ${getRoleLabel(novaRole)}`);
  };

  const criarUsuarioManual = async (e) => {
    e.preventDefault();
    if (!novoUsuario.nome || !novoUsuario.email || !novoUsuario.password || !novoUsuario.whatsapp) {
      toast.error('Preencha nome, e-mail, WhatsApp e senha.');
      return;
    }

    setSalvandoUsuario(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: novoUsuario.email,
        password: novoUsuario.password,
      });
      if (signUpError) throw signUpError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('Usuário não criado no auth.');

      const { error: profileError } = await supabase.from('usuarios').insert([{
        id: userId,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        whatsapp: novoUsuario.whatsapp,
        role: novoUsuario.role,
        barbearia_id: novoUsuario.barbearia_id || null,
        ativo: true,
      }]);

      if (profileError) throw profileError;

      toast.success('Usuário criado com sucesso!');
      setIsModalUserOpen(false);
      carregarDados();
    } catch (err) {
      toast.error('Erro ao criar usuário: ' + err.message);
    } finally {
      setSalvandoUsuario(false);
    }
  };

  const abrirModalNovoUsuario = () => {
    setNovoUsuario({ nome: '', email: '', whatsapp: '', password: '', role: 'cliente', barbearia_id: '' });
    setIsModalUserOpen(true);
  };

  const abrirModalEditarUsuario = (usuario) => {
    setUsuarioEditando({ ...usuario, exibe_na_agenda: usuario.exibe_na_agenda !== false });
    setIsModalEditUserOpen(true);
  };

  const fecharModalEditarUsuario = () => {
    setIsModalEditUserOpen(false);
    setUsuarioEditando(null);
  };

  const handleEditUserChange = (campo, valor) => {
    setUsuarioEditando((prev) => ({ ...prev, [campo]: valor }));
  };

  const salvarEdicaoUsuario = async (e) => {
    e.preventDefault();
    if (!usuarioEditando?.id) return;

    setSalvandoEdicaoUsuario(true);
    try {
      const payload = {
        nome: usuarioEditando.nome,
        whatsapp: usuarioEditando.whatsapp,
        cpf: usuarioEditando.cpf || null,
        role: usuarioEditando.role,
        ativo: usuarioEditando.ativo,
        barbearia_id: usuarioEditando.barbearia_id || null,
        cep: usuarioEditando.cep || null,
        endereco: usuarioEditando.endereco || null,
        numero: usuarioEditando.numero || null,
        data_nascimento: usuarioEditando.data_nascimento || null,
        genero: usuarioEditando.genero || null,
        saldo_pontos: Number(usuarioEditando.saldo_pontos) || 0,
        exibe_na_agenda: usuarioEditando.exibe_na_agenda !== false,
        avatar_url: usuarioEditando.avatar_url || null,
      };

      const rolesValidas = MASTER_ASSIGNABLE_ROLES.map((r) => r.value);
      if (!rolesValidas.includes(payload.role)) {
        toast.error('Permissão inválida.');
        return;
      }

      const { error } = await supabase.from('usuarios').update(payload).eq('id', usuarioEditando.id);
      if (error) throw error;

      toast.success('Usuário atualizado com sucesso!');
      fecharModalEditarUsuario();
      carregarDados();
    } catch (err) {
      toast.error('Erro ao salvar usuário: ' + err.message);
    } finally {
      setSalvandoEdicaoUsuario(false);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = buscaUsuario.toLowerCase();
    return (
      u.nome?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo) ||
      u.whatsapp?.includes(buscaUsuario) ||
      u.cpf?.includes(buscaUsuario)
    );
  });

  const masterNavItems = useMemo(
    () =>
      MASTER_MENU_ITEMS.map((item) => {
        const Icon = item.icon;
        const suporteBadge = item.id === 'suporte' && supportStats?.badgeCount > 0
          ? String(supportStats.badgeCount)
          : undefined;
        return {
          ...item,
          icon: <Icon size={18} strokeWidth={2.25} />,
          onSelect: () => setAbaAtiva(item.id),
          badge: suporteBadge,
          badgeNumeric: Boolean(suporteBadge),
        };
      }),
    [supportStats?.badgeCount]
  );

  const masterGroups = useMemo(
    () => groupPanelItems(masterNavItems, MASTER_GROUP_ORDER),
    [masterNavItems]
  );

  return (
    <PanelNavShell
      title="Painel Master"
      subtitle="Controle da plataforma"
      groups={masterGroups}
      items={masterNavItems}
      activeKey={abaAtiva}
      menuOpen={menuSheetAberto}
      setMenuOpen={setMenuSheetAberto}
    >
    <div className="p-6 md:p-10 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 shadow-sm">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-text-base">Painel Master</h1>
              <p className="text-text-muted font-medium">Controle total da plataforma</p>
            </div>
          </div>
          {(supportStats?.badgeCount || 0) > 0 && (
            <button
              type="button"
              onClick={() => setAbaAtiva('suporte')}
              className="relative p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-600 hover:bg-red-500/15 transition-colors"
              title="Chamados de suporte abertos"
            >
              <Headphones size={22} />
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {supportStats.badgeCount}
              </span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div></div>
        ) : (
          <>
            {abaAtiva === 'dashboard' && (
              <MasterDashboardSection
                resumo={resumo}
                empresas={empresas}
                usuarios={usuarios}
                supportStats={supportStats}
                recentTickets={recentTickets}
                onNavigate={setAbaAtiva}
                loading={loading}
              />
            )}

            {abaAtiva !== 'dashboard' && (
            <>
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
                              {emp.plan_slug === 'pro' && <Crown size={18} className="text-brand" />}
                              {emp.plan_slug === 'plus' && <Sparkles size={18} className="text-violet-500" />}
                            </h3>
                            <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
                              <MapPin size={14} /> {emp.cidade ? `${emp.cidade} - ${emp.estado}` : 'Sem endereço'}
                            </p>
                          </div>
                          {emp.status === 'pendente' ? (
                            <span className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20">Pendente</span>
                          ) : (
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg ${getPlanBadgeClass(emp.plan_slug || 'free')}`}>
                              {getPlanLabel(emp.plan_slug, emp.plan_nome)}
                            </span>
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
                        {emp.status === 'pendente' ? (
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
                            <button onClick={() => setEmpresaQuickView(emp)} className="flex-1 bg-background border border-border-line text-text-base py-2.5 rounded-xl text-sm font-bold hover:border-brand transition-colors flex justify-center items-center gap-2 cursor-pointer">
                              <Eye size={16} /> Ver
                            </button>
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
              <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm animate-fadeIn overflow-hidden space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, e-mail, CPF ou telefone..."
                      value={buscaUsuario}
                      onChange={(e) => setBuscaUsuario(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <button
                    onClick={abrirModalNovoUsuario}
                    className="w-full md:w-auto bg-brand text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={18} /> Criar Usuário
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-line">
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Nome</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Email / Contato</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Permissão</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase">Status</th>
                        <th className="py-3 px-4 text-xs font-black text-text-muted uppercase text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.map(u => (
                        <tr key={u.id} className={`border-b border-border-line transition-colors ${!u.ativo ? 'bg-red-500/5' : 'hover:bg-background/50'}`}>
                          <td className="py-4 px-4">
                            <p className="text-sm font-bold text-text-base">{u.nome}</p>
                            <p className="text-xs text-text-muted">{u.cpf || 'Sem CPF'}</p>
                            <p className="text-xs text-brand font-bold mt-0.5">{u.saldo_pontos || 0} moedas</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-text-base">{u.email}</p>
                            <p className="text-xs text-text-muted">{u.whatsapp}</p>
                          </td>
                          <td className="py-4 px-4">
                            <select
                              value={u.role || 'cliente'}
                              onChange={(e) => atualizarRoleUsuario(u.id, e.target.value)}
                              className="bg-background border border-border-line text-sm font-bold text-text-base rounded-lg px-2 py-1.5 outline-none focus:border-brand cursor-pointer capitalize"
                            >
                              {MASTER_ASSIGNABLE_ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4 px-4">
                            {u.ativo ? (
                              <span className="bg-green-500/10 text-green-600 text-[10px] font-black uppercase px-2 py-1 rounded-md">Ativo</span>
                            ) : (
                              <span className="bg-red-500/10 text-red-500 text-[10px] font-black uppercase px-2 py-1 rounded-md">Banido</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setMoedasUsuario(u)} className="p-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition-colors cursor-pointer" title="Dar moedas">
                                <Coins size={16} />
                              </button>
                              <button onClick={() => abrirModalEditarUsuario(u)} className="p-1.5 bg-brand/10 text-brand hover:bg-brand hover:text-white rounded-lg transition-colors cursor-pointer" title="Editar usuário">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => toggleBanirUsuario(u.id, u.ativo)} className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${u.ativo ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'}`}>
                                {u.ativo ? 'Banir' : 'Desbanir'}
                              </button>
                              <button onClick={() => abrirModalDeletarUsuario(u)} className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer" title="Excluir Usuário">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {usuariosFiltrados.length === 0 && (
                        <tr><td colSpan="5" className="py-8 text-center text-text-muted font-bold">Nenhum usuário encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {abaAtiva === 'suporte' && <MasterSuporteSection />}

            {/* ==================== ABA PLANOS PREMIUM ==================== */}
            {abaAtiva === 'planos' && (
              <MasterPlanosSection
                empresas={empresas}
                busca={buscaPlano}
                onBuscaChange={setBuscaPlano}
                filtroPlano={filtroPlano}
                onFiltroChange={setFiltroPlano}
                onAlterarPlano={alterarPlanoEmpresa}
                onQuickView={setEmpresaQuickView}
                onEdit={abrirModalEdicao}
                alterandoPlanoId={alterandoPlanoId}
              />
            )}
            </>
            )}
          </>
        )}

      </div>

      <MasterEmpresaQuickModal
        empresa={empresaQuickView}
        onClose={() => setEmpresaQuickView(null)}
        onEdit={abrirModalEdicao}
      />

      <MasterMoedasModal
        usuario={moedasUsuario}
        onClose={() => setMoedasUsuario(null)}
        onSuccess={carregarDados}
      />

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

      {/* MODAL CRIAR USUÁRIO */}
      {isModalUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative">
            <button onClick={() => setIsModalUserOpen(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-base cursor-pointer">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-text-base mb-6 flex items-center gap-2">
              <UserPlus className="text-brand" /> Novo Usuário Manual
            </h2>
            <form onSubmit={criarUsuarioManual} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1">Nome *</label>
                <input required value={novoUsuario.nome} onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1">E-mail *</label>
                <input required type="email" value={novoUsuario.email} onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1">WhatsApp *</label>
                <input required value={novoUsuario.whatsapp} onChange={(e) => setNovoUsuario({ ...novoUsuario, whatsapp: e.target.value })} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1">Senha *</label>
                <input required type="password" minLength={6} value={novoUsuario.password} onChange={(e) => setNovoUsuario({ ...novoUsuario, password: e.target.value })} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1">Permissão *</label>
                <select value={novoUsuario.role} onChange={(e) => setNovoUsuario({ ...novoUsuario, role: e.target.value })} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand cursor-pointer">
                  {MASTER_ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1">Barbearia (opcional)</label>
                <select value={novoUsuario.barbearia_id} onChange={(e) => setNovoUsuario({ ...novoUsuario, barbearia_id: e.target.value })} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand cursor-pointer">
                  <option value="">Nenhuma (cliente avulso / master)</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={salvandoUsuario} className="w-full bg-brand text-white py-3.5 rounded-xl text-sm font-black hover:brightness-105 disabled:opacity-50 cursor-pointer">
                {salvandoUsuario ? 'Criando...' : 'Criar Usuário'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR USUÁRIO */}
      {isModalEditUserOpen && usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-surface border border-border-line w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative my-auto">
            <button onClick={fecharModalEditarUsuario} className="absolute top-4 right-4 text-text-muted hover:text-text-base cursor-pointer">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-text-base mb-2 flex items-center gap-2">
              <Edit className="text-brand" /> Editar Usuário
            </h2>
            <p className="text-xs text-text-muted mb-6">E-mail e senha não podem ser alterados por política de privacidade.</p>

            <form onSubmit={salvarEdicaoUsuario} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Nome *</label>
                  <input required value={usuarioEditando.nome || ''} onChange={(e) => handleEditUserChange('nome', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">E-mail (somente leitura)</label>
                  <input disabled value={usuarioEditando.email || ''} className="w-full bg-background/50 border border-border-line rounded-xl p-3 text-sm font-bold text-text-muted outline-none cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">WhatsApp</label>
                  <input value={usuarioEditando.whatsapp || ''} onChange={(e) => handleEditUserChange('whatsapp', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">CPF</label>
                  <input value={usuarioEditando.cpf || ''} onChange={(e) => handleEditUserChange('cpf', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Permissão</label>
                  <select value={usuarioEditando.role || 'cliente'} onChange={(e) => handleEditUserChange('role', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand cursor-pointer">
                    {MASTER_ASSIGNABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Barbearia</label>
                  <select value={usuarioEditando.barbearia_id || ''} onChange={(e) => handleEditUserChange('barbearia_id', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand cursor-pointer">
                    <option value="">Nenhuma</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Status</label>
                  <select value={usuarioEditando.ativo ? 'ativo' : 'inativo'} onChange={(e) => handleEditUserChange('ativo', e.target.value === 'ativo')} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand cursor-pointer">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Banido / Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Saldo de pontos</label>
                  <input type="number" min="0" value={usuarioEditando.saldo_pontos ?? 0} onChange={(e) => handleEditUserChange('saldo_pontos', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Data de nascimento</label>
                  <input type="date" value={usuarioEditando.data_nascimento || ''} onChange={(e) => handleEditUserChange('data_nascimento', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Gênero</label>
                  <select value={usuarioEditando.genero || ''} onChange={(e) => handleEditUserChange('genero', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand cursor-pointer">
                    <option value="">Não informado</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">CEP</label>
                  <input value={usuarioEditando.cep || ''} onChange={(e) => handleEditUserChange('cep', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Número</label>
                  <input value={usuarioEditando.numero || ''} onChange={(e) => handleEditUserChange('numero', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">Endereço</label>
                  <input value={usuarioEditando.endereco || ''} onChange={(e) => handleEditUserChange('endereco', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-text-muted uppercase mb-1">URL do avatar</label>
                  <input value={usuarioEditando.avatar_url || ''} onChange={(e) => handleEditUserChange('avatar_url', e.target.value)} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                </div>
                <div className="md:col-span-2 flex items-center gap-3 bg-background border border-border-line rounded-xl p-4">
                  <input
                    id="exibe_na_agenda_master"
                    type="checkbox"
                    checked={usuarioEditando.exibe_na_agenda !== false}
                    onChange={(e) => handleEditUserChange('exibe_na_agenda', e.target.checked)}
                    className="h-4 w-4 accent-brand cursor-pointer"
                  />
                  <label htmlFor="exibe_na_agenda_master" className="text-sm font-bold text-text-base cursor-pointer">
                    Aparece na agenda pública
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-border-line flex gap-3">
                <button type="button" onClick={fecharModalEditarUsuario} className="flex-1 bg-background border border-border-line py-3 rounded-xl text-sm font-bold cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoEdicaoUsuario} className="flex-1 bg-brand text-white py-3 rounded-xl text-sm font-black disabled:opacity-50 cursor-pointer">
                  {salvandoEdicaoUsuario ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
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
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Plano (via assinatura)</label>
                  <p className="w-full bg-background/50 border border-border-line rounded-xl p-3 text-sm font-bold text-text-muted">
                    Gerenciado em Assinaturas — não editar aqui.
                  </p>
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

                <div className="md:col-span-2 border-t border-border-line pt-5 space-y-4">
                  <h4 className="text-sm font-black flex items-center gap-2"><Image size={16} className="text-brand" /> Imagens da barbearia</h4>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-text-muted uppercase">Foto (listagem)</label>
                      {empresaEditando.logo_url && (
                        <img src={empresaEditando.logo_url} alt="" className="w-full h-24 object-cover rounded-xl border border-border-line" />
                      )}
                      <input value={empresaEditando.logo_url || ''} onChange={(e) => setEmpresaEditando({ ...empresaEditando, logo_url: e.target.value })} placeholder="URL da foto" className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                      <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer text-brand">
                        {enviandoLogoMaster ? 'Enviando...' : 'Enviar arquivo'}
                        <input type="file" accept="image/*" className="hidden" disabled={enviandoLogoMaster || !empresaEditando.id} onChange={(e) => e.target.files?.[0] && handleUploadImagemMaster(e.target.files[0], 'logo')} />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black text-text-muted uppercase">Capa (banner)</label>
                      {empresaEditando.capa_url && (
                        <img src={empresaEditando.capa_url} alt="" className="w-full h-24 object-cover rounded-xl border border-border-line" />
                      )}
                      <input value={empresaEditando.capa_url || ''} onChange={(e) => setEmpresaEditando({ ...empresaEditando, capa_url: e.target.value })} placeholder="URL da capa" className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold outline-none focus:border-brand" />
                      <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer text-brand">
                        {enviandoCapaMaster ? 'Enviando...' : 'Enviar capa'}
                        <input type="file" accept="image/*" className="hidden" disabled={enviandoCapaMaster || !empresaEditando.id} onChange={(e) => e.target.files?.[0] && handleUploadImagemMaster(e.target.files[0], 'capa')} />
                      </label>
                      {!empresaEditando.id && <p className="text-[10px] text-text-muted">Crie a empresa primeiro; depois edite para enviar arquivos.</p>}
                    </div>
                  </div>
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
    </PanelNavShell>
  );
}