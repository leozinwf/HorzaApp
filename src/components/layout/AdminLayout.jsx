import { useState, useEffect } from 'react';
import { Link, useParams, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { 
  LayoutDashboard, Users, Scissors, Package, DollarSign, 
  Building2, CalendarDays, ShieldCheck, CreditCard, Star,
  UserCheck, Menu, X, ChevronDown, Clock, ArrowLeft, Rocket, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLayout() {
  const location = useLocation();
  const { slug } = useParams();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  
  // Estados para a trava de aprovação e onboarding
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [salvandoOnboarding, setSalvandoOnboarding] = useState(false);

  // Estado do formulário de Onboarding
  const [formOnboarding, setFormOnboarding] = useState({
    razao_social: '',
    instagram: '',
    hora_abertura: '09:00',
    hora_fechamento: '19:00',
    dias_funcionamento: [1, 2, 3, 4, 5, 6] // Seg a Sab por padrão
  });

  const diasSemana = [
    { id: 0, nome: 'Dom' }, { id: 1, nome: 'Seg' }, { id: 2, nome: 'Ter' },
    { id: 3, nome: 'Qua' }, { id: 4, nome: 'Qui' }, { id: 5, nome: 'Sex' }, { id: 6, nome: 'Sáb' }
  ];

  useEffect(() => {
    const verificarStatusEmpresa = async () => {
      try {
        const { data, error } = await supabase
          .from('barbearias')
          .select('id, status, onboarding_completo, razao_social, instagram, hora_abertura, hora_fechamento, dias_funcionamento')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setDadosEmpresa(data);
        
        // Se a empresa já tiver alguns dados preenchidos, joga pro form
        if (data && !data.onboarding_completo) {
          setFormOnboarding({
            razao_social: data.razao_social || '',
            instagram: data.instagram || '',
            hora_abertura: data.hora_abertura || '09:00',
            hora_fechamento: data.hora_fechamento || '19:00',
            dias_funcionamento: data.dias_funcionamento || [1, 2, 3, 4, 5, 6]
          });
        }

      } catch (err) {
        console.error('Erro ao verificar status:', err);
      } finally {
        setLoadingStatus(false);
      }
    };

    if (slug) verificarStatusEmpresa();
  }, [slug]);

  const toggleDia = (diaId) => {
    setFormOnboarding(prev => ({
      ...prev,
      dias_funcionamento: prev.dias_funcionamento.includes(diaId)
        ? prev.dias_funcionamento.filter(d => d !== diaId)
        : [...prev.dias_funcionamento, diaId].sort()
    }));
  };

  const handleSalvarOnboarding = async (e) => {
    e.preventDefault();
    if (formOnboarding.dias_funcionamento.length === 0) {
      toast.error('Selecione pelo menos um dia de funcionamento.');
      return;
    }

    setSalvandoOnboarding(true);
    try {
      const { error } = await supabase
        .from('barbearias')
        .update({ 
          ...formOnboarding, 
          onboarding_completo: true 
        })
        .eq('id', dadosEmpresa.id);

      if (error) throw error;

      toast.success('Tudo pronto! Bem-vindo ao painel.');
      setDadosEmpresa(prev => ({ ...prev, onboarding_completo: true }));
    } catch (err) {
      toast.error('Erro ao salvar os dados.');
      console.error(err);
    } finally {
      setSalvandoOnboarding(false);
    }
  };

  const menuItems = [
    { path: `/${slug}/admin`, icon: <LayoutDashboard size={20} />, label: 'Dashboard', group: 'Geral' },
    { path: `/${slug}/admin/agenda`, icon: <CalendarDays size={20} />, label: 'Agenda Geral', group: 'Operacional' },
    { path: `/${slug}/admin/servicos`, icon: <Scissors size={20} />, label: 'Serviços', group: 'Operacional' },
    { path: `/${slug}/admin/estoque`, icon: <Package size={20} />, label: 'Estoque', group: 'Operacional' },
    { path: `/${slug}/admin/usuarios`, icon: <Users size={20} />, label: 'Clientes', group: 'Pessoas' },
    { path: `/${slug}/admin/equipe`, icon: <UserCheck size={20} />, label: 'Equipe', group: 'Pessoas' },
    { path: `/${slug}/admin/fidelidade`, icon: <Star size={20} />, label: 'Fidelidade', group: 'Pessoas' },
    { path: `/${slug}/admin/pagamentos`, icon: <CreditCard size={20} />, label: 'Pagamentos', group: 'Financeiro' },
    { path: `/${slug}/admin/financeiro`, icon: <DollarSign size={20} />, label: 'Financeiro', group: 'Financeiro' },
    { path: `/${slug}/admin/empresa`, icon: <Building2 size={20} />, label: 'Empresa', group: 'Config' },
    { path: `/${slug}/admin/permissoes`, icon: <ShieldCheck size={20} />, label: 'Permissões', group: 'Config' },
  ];

  const itemAtivo = menuItems.find(i => 
    i.path === `/${slug}/admin` 
      ? location.pathname === `/${slug}/admin` 
      : location.pathname.startsWith(i.path)
  ) || menuItems[0];

  if (loadingStatus) {
    return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div></div>;
  }

  // TELA 1: BLOQUEIO - PENDENTE APROVAÇÃO
  if (dadosEmpresa?.status === 'pendente') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="bg-surface border border-border-line p-8 rounded-3xl max-w-md w-full shadow-lg flex flex-col items-center">
          <div className="h-20 w-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-6">
            <Clock size={40} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-text-base mb-3">Conta em Análise</h1>
          <p className="text-text-muted mb-8 text-sm leading-relaxed">
            Seu cadastro foi recebido com sucesso! Nossa equipe está analisando seus dados e em breve seu painel administrativo será liberado.
          </p>
          <Link to="/" className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all w-full justify-center">
            <ArrowLeft size={18} /> Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  // TELA 2: ONBOARDING INICIAL - OBRIGATÓRIO
  if (dadosEmpresa?.status === 'aprovada' && dadosEmpresa?.onboarding_completo === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-2xl bg-surface border border-border-line rounded-3xl p-8 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border-line">
            <div className="h-14 w-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center"><Rocket size={28} /></div>
            <div>
              <h1 className="text-2xl font-black text-text-base">Quase lá!</h1>
              <p className="text-sm text-text-muted mt-1">Configure o perfil básico da sua barbearia para começarmos.</p>
            </div>
          </div>

          <form onSubmit={handleSalvarOnboarding} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Razão Social / Nome Completo *</label>
                <input required type="text" value={formOnboarding.razao_social} onChange={e => setFormOnboarding({...formOnboarding, razao_social: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" placeholder="Nome jurídico da empresa" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Instagram</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">@</span>
                  <input type="text" value={formOnboarding.instagram} onChange={e => setFormOnboarding({...formOnboarding, instagram: e.target.value})} className="w-full bg-background border border-border-line rounded-xl py-3 pl-8 pr-3 text-sm font-bold focus:border-brand outline-none" placeholder="barbeariadoze" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Horário de Abertura *</label>
                <input required type="time" value={formOnboarding.hora_abertura} onChange={e => setFormOnboarding({...formOnboarding, hora_abertura: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
              </div>

              <div>
                <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Horário de Fechamento *</label>
                <input required type="time" value={formOnboarding.hora_fechamento} onChange={e => setFormOnboarding({...formOnboarding, hora_fechamento: e.target.value})} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-text-muted uppercase mb-3">Dias de Funcionamento *</label>
                <div className="flex flex-wrap gap-2">
                  {diasSemana.map(dia => (
                    <button 
                      key={dia.id} type="button" 
                      onClick={() => toggleDia(dia.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${formOnboarding.dias_funcionamento.includes(dia.id) ? 'bg-brand text-white shadow-md' : 'bg-background border border-border-line text-text-muted hover:border-brand'}`}
                    >
                      {dia.nome}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" disabled={salvandoOnboarding} className="w-full bg-brand text-white py-4 rounded-xl text-sm font-black hover:brightness-105 transition-all shadow-md mt-6 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50">
              {salvandoOnboarding ? 'Salvando...' : <><Check size={18}/> Concluir e Acessar Painel</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TELA 3: PAINEL LIBERADO
  return (
    <div className="w-full font-sans pb-24 md:pb-10 relative">
      <div className="md:hidden sticky top-[60px] z-50 bg-surface border-b border-border-line px-4 py-3 shadow-sm">
        <button onClick={() => setMenuMobileAberto(!menuMobileAberto)} className="w-full bg-background border border-border-line px-4 py-3 rounded-xl flex items-center justify-between font-bold text-sm text-text-base shadow-sm">
          <div className="flex items-center gap-2">
            <Menu size={18} className="text-brand" /> 
            <span>Menu: <span className="text-brand">{itemAtivo.label}</span></span>
          </div>
          {menuMobileAberto ? <X size={18} /> : <ChevronDown size={18} />}
        </button>

        {menuMobileAberto && (
          <div className="absolute left-4 right-4 top-[65px] bg-surface border border-border-line rounded-2xl shadow-xl p-4 grid grid-cols-2 gap-3 z-[60] animate-slideUp max-h-[70vh] overflow-y-auto">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setMenuMobileAberto(false)} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all text-center ${item.path === itemAtivo.path ? 'bg-brand text-white shadow-md' : 'bg-background border border-border-line text-text-muted hover:border-brand/50 hover:text-brand'}`}>
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block sticky top-[68px] z-40 bg-background/80 backdrop-blur-md border-b border-border-line mb-6 shadow-sm">
  {/* Ajustei o flex para garantir nowrap e remover a quebra de linha */}
  <div className="max-w-6xl mx-auto px-8 py-3 flex gap-2 items-center overflow-x-auto whitespace-nowrap hide-scrollbar">
    {menuItems.map((item, index) => {
      const isActive = item.path === itemAtivo.path;
      const showSeparator = index > 0 && menuItems[index - 1].group !== item.group;

      return (
        <div key={item.path} className="flex items-center gap-2">
          {showSeparator && <div className="h-6 w-px bg-border-line mx-2 rounded-full"></div>}
          <Link
            to={item.path}
            // Adicionei flex-shrink-0 aqui para garantir que o botão não encolha nem quebre
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all duration-300 ${
              isActive
                ? 'bg-brand text-white shadow-md'
                : 'bg-surface border border-border-line text-text-muted hover:border-brand/50 hover:text-brand hover:bg-brand/5'
              }`}
          >
            <span className={`${isActive ? 'scale-110' : 'opacity-80'}`}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        </div>
      );
    })}
  </div>
</div>

      <div className="animate-fadeIn px-4 md:px-8 max-w-6xl mx-auto mt-6 md:mt-0 relative z-0">
        <Outlet />
      </div>
    </div>
  );
}