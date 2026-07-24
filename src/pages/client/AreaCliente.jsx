import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  User, Calendar, Scissors, Clock,
  CheckCircle2, AlertCircle, XCircle, Coins, Gift, Ticket,
  Sparkles, Star, Settings, Headphones,
} from 'lucide-react';
import FormularioPerfil from '../../components/shared/FormularioPerfil';
import AccordionSection from '../../components/shared/AccordionSection';
import HorzaFooter from '../../components/layout/HorzaFooter';
import ClienteSuporteSection from '../../components/support/ClienteSuporteSection';

export default function AreaCliente() {
  const { user, profile } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const [openSections, setOpenSections] = useState({
    fidelidade: true,
    historico: false,
    suporte: false,
    conta: false,
  });
  const [openedOnce, setOpenedOnce] = useState({
    fidelidade: true,
    historico: false,
    suporte: false,
    conta: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => {
      const nextOpen = !prev[key];
      if (nextOpen) {
        setOpenedOnce((o) => ({ ...o, [key]: true }));
      }
      return { ...prev, [key]: nextOpen };
    });
  };

  const getIniciais = () => {
    const nome = profile?.nome || user?.user_metadata?.nome;
    if (nome) return nome.substring(0, 2).toUpperCase();
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const getPrimeiroNome = () => {
    const nome = profile?.nome || user?.user_metadata?.nome || 'Usuário';
    return nome.split(' ')[0];
  };

  return (
    <div className="flex flex-col text-text-base bg-background min-h-screen font-sans">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-5 pt-6 md:pt-10 pb-8 space-y-5">
        <div className="bg-surface border border-border-line p-5 sm:p-6 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-xl font-black border border-brand/15 shrink-0">
            {getIniciais()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-text-muted">Minha conta</p>
            <h1 className="text-xl sm:text-2xl font-black text-text-base truncate">
              Olá, {getPrimeiroNome()}
            </h1>
            <span className="inline-flex items-center gap-1.5 mt-2 bg-brand/10 text-brand px-3 py-1 rounded-xl text-sm font-black">
              <Coins size={15} /> {profile?.saldo_pontos || 0} moedas
            </span>
          </div>
        </div>

        <AccordionSection
          title="Fidelidade"
          subtitle="Prêmios, vouchers e troca de moedas"
          icon={<Star size={22} />}
          open={openSections.fidelidade}
          onToggle={() => toggleSection('fidelidade')}
          badge={
            <span className="text-xs font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg shrink-0">
              {profile?.saldo_pontos || 0}
            </span>
          }
        >
          {openedOnce.fidelidade && <ClubeFidelidade user={user} profile={profile} />}
        </AccordionSection>

        <AccordionSection
          title="Histórico"
          subtitle="Últimos agendamentos e status"
          icon={<Calendar size={22} />}
          open={openSections.historico}
          onToggle={() => toggleSection('historico')}
        >
          {openedOnce.historico && <ListaAgendamentos user={user} previewLimit={5} />}
        </AccordionSection>

        <AccordionSection
          title="Suporte"
          subtitle="Mensagens e respostas da equipe Horza"
          icon={<Headphones size={22} />}
          open={openSections.suporte}
          onToggle={() => toggleSection('suporte')}
        >
          {openedOnce.suporte && <ClienteSuporteSection />}
        </AccordionSection>

        <AccordionSection
          title="Configurações da conta"
          subtitle="Dados pessoais, tema e segurança"
          icon={<Settings size={22} />}
          open={openSections.conta}
          onToggle={() => toggleSection('conta')}
        >
          {openedOnce.conta && <FormularioPerfil user={user} profile={profile} embedded />}
        </AccordionSection>
      </div>
      <HorzaFooter />
    </div>
  );
}

function ClubeFidelidade({ user, profile }) {
  const [recompensas, setRecompensas] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resgatando, setResgatando] = useState(false);
  const loadedRef = useRef(false);
  const saldoAtual = profile?.saldo_pontos || 0;

  useEffect(() => {
    if (!user?.id) return;
    carregarFidelidade(!loadedRef.current);
  }, [user?.id, profile?.barbearia_id]);

  const carregarFidelidade = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      let currentBarbeariaId = profile?.barbearia_id;
      if (!currentBarbeariaId) {
        const { data: ultimoAgendamento } = await supabase
          .from('agendamentos')
          .select('barbearia_id')
          .eq('cliente_id', user.id)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ultimoAgendamento) currentBarbeariaId = ultimoAgendamento.barbearia_id;
      }
      if (currentBarbeariaId) {
        const { data: recData } = await supabase
          .from('recompensas_fidelidade')
          .select('*')
          .eq('barbearia_id', currentBarbeariaId)
          .eq('ativo', true)
          .order('pontos_necessarios', { ascending: true });
        if (recData) setRecompensas(recData);
      }
      const { data: vouchData } = await supabase
        .from('resgates_fidelidade')
        .select('*')
        .eq('cliente_id', user.id)
        .eq('status', 'pendente')
        .order('criado_em', { ascending: false });
      if (vouchData) setVouchers(vouchData);
      loadedRef.current = true;
    } catch (error) {
      console.error('Erro ao carregar fidelidade:', error);
    } finally {
      setLoading(false);
    }
  };

  const resgatarPremio = async (recompensa) => {
    if (saldoAtual < recompensa.pontos_necessarios) {
      showAlert('Atenção', 'Você não tem moedas suficientes para este prêmio.', 'info');
      return;
    }

    showConfirm('Resgatar prêmio', `Deseja gastar ${recompensa.pontos_necessarios} moedas para resgatar "${recompensa.titulo}"?`, async () => {
      setResgatando(true);
      try {
        const codigoGerado = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: sucesso, error } = await supabase.rpc('gerar_codigo_resgate', {
          p_cliente_id: user.id,
          p_barbearia_id: recompensa.barbearia_id,
          p_recompensa_id: recompensa.id,
          p_recompensa_nome: recompensa.titulo,
          p_custo: recompensa.pontos_necessarios,
          p_codigo: codigoGerado,
        });
        if (error) throw error;
        if (sucesso) {
          showAlert('Prêmio resgatado!', 'Mostre o código no balcão da barbearia.', 'success');
          await carregarFidelidade(false);
        } else {
          showAlert('Erro', 'Saldo insuficiente ou erro ao processar.', 'error');
        }
      } catch (err) {
        showAlert('Erro', 'Erro ao resgatar o prêmio: ' + err.message, 'error');
      } finally {
        setResgatando(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {vouchers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Ticket size={16} className="text-brand" /> Seus prêmios para usar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vouchers.map((v) => (
              <div key={v.id} className="bg-brand text-white p-6 rounded-3xl relative overflow-hidden shadow-lg shadow-brand/30">
                <div className="absolute -right-4 -bottom-4 bg-white/10 p-8 rounded-full">
                  <Gift size={64} className="text-white/20" />
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-lg inline-block mb-3">
                    Voucher válido
                  </span>
                  <h3 className="text-xl font-black mb-1">{v.recompensa_nome}</h3>
                  <p className="text-sm text-white/80 mb-6">Apresente o código abaixo no balcão.</p>
                  <div className="bg-white text-brand text-center py-3 rounded-2xl border-2 border-dashed border-brand/30">
                    <span className="text-2xl font-black tracking-[0.3em]">{v.codigo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-brand" /> Troque suas moedas
        </h2>
        {recompensas.length === 0 ? (
          <div className="bg-surface p-8 border border-dashed border-border-line rounded-3xl text-center">
            <p className="font-bold text-text-muted">Nenhum prêmio disponível na barbearia visitada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recompensas.map((rec) => {
              const percentual = Math.min((saldoAtual / rec.pontos_necessarios) * 100, 100);
              const podeResgatar = saldoAtual >= rec.pontos_necessarios;
              const falta = rec.pontos_necessarios - saldoAtual;
              return (
                <div
                  key={rec.id}
                  className="bg-background p-5 sm:p-6 rounded-3xl border border-border-line flex flex-col justify-between hover:border-brand/40 transition-colors"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black text-text-base pr-4">{rec.titulo}</h3>
                      <span className="shrink-0 bg-brand/10 text-brand px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                        <Coins size={12} /> {rec.pontos_necessarios}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mb-6 leading-relaxed min-h-[40px]">{rec.descricao}</p>
                  </div>
                  <div>
                    <div className="mb-4">
                      <div className="flex justify-between text-[10px] font-black uppercase text-text-muted mb-1.5">
                        <span>Progresso</span>
                        <span>{percentual >= 100 ? 'Liberado!' : `Faltam ${falta} moedas`}</span>
                      </div>
                      <div className="w-full h-2 bg-background border border-border-line rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ease-out ${podeResgatar ? 'bg-green-500' : 'bg-brand'}`}
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => resgatarPremio(rec)}
                      disabled={!podeResgatar || resgatando}
                      className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        podeResgatar
                          ? 'bg-brand text-white shadow-md hover:brightness-105'
                          : 'bg-background border border-border-line text-text-muted opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {podeResgatar ? 'Resgatar prêmio' : 'Moedas insuficientes'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ListaAgendamentos({ user, previewLimit = null }) {
  const [ags, setAgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchAgs = async () => {
      if (!loadedRef.current) setLoading(true);
      try {
        const { data } = await supabase
          .from('agendamentos')
          .select('*, servicos(nome_servico, duracao_minutos, preco), barbeiros:usuarios!agendamentos_barbeiro_id_fkey(nome)')
          .eq('cliente_id', user.id)
          .order('data_hora', { ascending: false });
        setAgs(data || []);
        loadedRef.current = true;
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgs();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const usarPreview = previewLimit && !showAll;
  const lista = usarPreview ? ags.slice(0, previewLimit) : ags;

  return (
    <div className="space-y-3">
      {ags.length === 0 ? (
        <div className="text-center py-12 bg-background rounded-2xl border border-dashed border-border-line">
          <div className="bg-surface w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border-line">
            <Calendar size={24} className="text-text-muted" />
          </div>
          <h3 className="font-black text-base text-text-base mb-1">Nenhum histórico</h3>
          <p className="text-sm text-text-muted">Você ainda não possui agendamentos conosco.</p>
        </div>
      ) : (
        <>
          {lista.map((ag) => {
          const dataFormatada = new Date(ag.data_hora).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          const horaFormatada = new Date(ag.data_hora).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          });
          const isCancelado = ag.status_atendimento === 'cancelado';
          const isConcluido = ag.status_atendimento === 'concluido';
          const isAusente = ag.status_atendimento === 'ausente';
          return (
            <div
              key={ag.id}
              className={`bg-background p-4 rounded-2xl border ${
                isCancelado
                  ? 'border-red-500/20 opacity-80'
                  : isConcluido
                    ? 'border-green-500/20'
                    : isAusente
                      ? 'border-amber-500/20 opacity-80'
                      : 'border-border-line'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="bg-background border border-border-line text-text-base text-center px-3 py-2 rounded-2xl shrink-0">
                    <span className="block text-[10px] font-black uppercase text-text-muted leading-none mb-1">
                      {dataFormatada.split(' de ')[1]}
                    </span>
                    <span className="block text-lg font-black leading-none">{dataFormatada.split(' de ')[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg inline-flex items-center gap-1 ${
                        isCancelado
                          ? 'bg-red-500/10 text-red-500'
                          : isConcluido
                            ? 'bg-green-500/10 text-green-600'
                            : isAusente
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-brand/10 text-brand'
                      }`}
                    >
                      {isCancelado ? <XCircle size={12} /> : isConcluido ? <CheckCircle2 size={12} /> : isAusente ? <AlertCircle size={12} /> : <Clock size={12} />}
                      {ag.status_atendimento}
                    </span>
                    <p className="text-sm font-bold text-text-base mt-1.5 flex items-center gap-1.5">
                      <Clock size={14} className="text-text-muted shrink-0" /> {horaFormatada}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Scissors size={16} className="text-brand shrink-0" />
                    <span className="font-bold truncate">{ag.servicos?.nome_servico}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <User size={16} className="text-text-muted shrink-0" />
                    <span className="font-medium truncate">{ag.barbeiros?.nome}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
          {usarPreview && ags.length > previewLimit && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full py-3 rounded-2xl border border-border-line bg-background text-sm font-bold text-brand hover:border-brand transition-colors"
            >
              Ver todos ({ags.length} agendamentos)
            </button>
          )}
        </>
      )}
    </div>
  );
}
