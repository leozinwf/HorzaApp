import { useState, useEffect } from 'react';
import { Link, useParams, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Clock, ArrowLeft, Rocket, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { PlanProvider } from '../../context/PlanContext';
import PlanUsageBanner from '../shared/PlanUsageBanner';
import {
  AdminNavShell,
} from './AdminNav';
export default function AdminLayout() {
  const location = useLocation();
  const { slug } = useParams();
  const [menuSheetAberto, setMenuSheetAberto] = useState(false);
  
  // Estados para a trava de aprovação e onboarding
  const [dadosEmpresa, setDadosEmpresa] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`admin_empresa_${slug}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loadingStatus, setLoadingStatus] = useState(!dadosEmpresa);
  const [salvandoOnboarding, setSalvandoOnboarding] = useState(false);
  const [onboardingCompleto, setOnboardingCompleto] = useState(true);

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
          .select('id, status, razao_social, hora_abertura, hora_fechamento, dias_funcionamento, redes_sociais')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setDadosEmpresa(data);
        sessionStorage.setItem(`admin_empresa_${slug}`, JSON.stringify(data));

        const precisaOnboarding = data?.status === 'aprovada' && !data?.razao_social;
        setOnboardingCompleto(!precisaOnboarding);

        if (data && precisaOnboarding) {
          setFormOnboarding({
            razao_social: data.razao_social || '',
            instagram: data.redes_sociais?.instagram || '',
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
          razao_social: formOnboarding.razao_social,
          hora_abertura: formOnboarding.hora_abertura,
          hora_fechamento: formOnboarding.hora_fechamento,
          dias_funcionamento: formOnboarding.dias_funcionamento,
          redes_sociais: formOnboarding.instagram
            ? { ...(dadosEmpresa.redes_sociais || {}), instagram: formOnboarding.instagram }
            : dadosEmpresa.redes_sociais
        })
        .eq('id', dadosEmpresa.id);

      if (error) throw error;

      toast.success('Tudo pronto! Bem-vindo ao painel.');
      setDadosEmpresa(prev => ({ ...prev, ...formOnboarding }));
      setOnboardingCompleto(true);
    } catch (err) {
      toast.error('Erro ao salvar os dados.');
      console.error(err);
    } finally {
      setSalvandoOnboarding(false);
    }
  };

  if (loadingStatus && !dadosEmpresa) {
    return null;
  }

  if (!dadosEmpresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="bg-surface border border-border-line p-8 rounded-3xl max-w-md w-full shadow-lg">
          <h1 className="text-xl font-black text-text-base mb-3">Barbearia não encontrada</h1>
          <p className="text-text-muted mb-6 text-sm">Não foi possível carregar os dados desta barbearia.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-bold">
            <ArrowLeft size={18} /> Voltar para o início
          </Link>
        </div>
      </div>
    );
  }

  const isPendente = dadosEmpresa.status === 'pendente';

  // TELA 1: BLOQUEIO - PENDENTE APROVAÇÃO
  if (isPendente) {
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
  if (dadosEmpresa?.status === 'aprovada' && !onboardingCompleto) {
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
    <PlanProvider barbeariaId={dadosEmpresa.id}>
      <div className="w-full font-sans md:pb-10 relative">
        <AdminPanelContent
        slug={slug}
        location={location}
        menuSheetAberto={menuSheetAberto}
        setMenuSheetAberto={setMenuSheetAberto}
        dadosEmpresa={dadosEmpresa}
        />
      </div>
    </PlanProvider>
  );
}

function AdminPanelContent({ slug, location, menuSheetAberto, setMenuSheetAberto, dadosEmpresa }) {
  return (
    <AdminNavShell
      slug={slug}
      location={location}
      menuOpen={menuSheetAberto}
      setMenuOpen={setMenuSheetAberto}
    >
      <div className="animate-fadeIn px-4 md:px-8 max-w-6xl mx-auto w-full mt-4 md:mt-6 relative z-0 flex-1 pb-8 md:pb-10">
        <PlanUsageBanner />
        <Outlet context={{ adminBarbeariaId: dadosEmpresa.id, barbeariaInfo: dadosEmpresa }} />
      </div>
    </AdminNavShell>
  );
}