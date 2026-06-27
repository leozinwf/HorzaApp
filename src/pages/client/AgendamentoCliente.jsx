import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Calendar, Clock, User, CheckCircle2, ArrowRight, ArrowLeft, X, AlertTriangle, Mail, Phone, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ✨ Recebemos a função onOpenLogin aqui:
export default function AgendamentoCliente({ onOpenLogin }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);

  const [passo, setPasso] = useState(1);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState(null);
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');

  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nomeGuest, setNomeGuest] = useState('');
  const [whatsappGuest, setWhatsappGuest] = useState('');
  const [emailGuest, setEmailGuest] = useState('');
  const [jaTinhaConta, setJaTinhaConta] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  useEffect(() => {
    carregarDadosPublicos();
    recuperarRascunho();
  }, []);

  useEffect(() => {
    if (passo === 3 && data && barbeiroSelecionado) {
      buscarDisponibilidade();
      setHorario('');
    }
  }, [data, barbeiroSelecionado, passo]);

  const recuperarRascunho = () => {
    const rascunho = localStorage.getItem('agendamento_pendente');
    if (rascunho) {
      const dados = JSON.parse(rascunho);
      setServicoSelecionado(dados.servico);
      setBarbeiroSelecionado(dados.barbeiro);
      setData(dados.data);
      setHorario(dados.horario);
      setPasso(3);
    }
  };

  const carregarDadosPublicos = async () => {
    try {
      const { data: servicosData } = await supabase.from('servicos').select('*');
      if (servicosData) setServicos(servicosData);

      const { data: barbeirosData } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('barbearia_id', servicoSelecionado.barbearia_id)
        .eq('exibe_na_agenda', true)
        .eq('ativo', true);

      if (barbeirosData) setBarbeiros(barbeirosData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err.message);
    }
  };

  const buscarDisponibilidade = async () => {
    setCarregandoHorarios(true);
    try {
      // 1. Pega regras da Empresa
      const { data: config } = await supabase.from('barbearias').select('hora_abertura, hora_fechamento, dias_funcionamento').eq('id', servicoSelecionado.barbearia_id).single();

      // 2. Pega Exceções (Bloqueios / Extras do barbeiro)
      const { data: excecoes } = await supabase.from('excecoes_agenda').select('*').eq('barbeiro_id', barbeiroSelecionado.id).eq('data', data);

      // 3. Pega Agendamentos já feitos naquele dia
      const dataInicio = new Date(`${data}T00:00:00`).toISOString();
      const dataFim = new Date(`${data}T23:59:59`).toISOString();
      const { data: agendamentosDia } = await supabase.from('agendamentos').select('data_hora, servicos(duracao_minutos)').eq('barbeiro_id', barbeiroSelecionado.id).not('status_atendimento', 'eq', 'cancelado').not('status_atendimento', 'eq', 'ausente').gte('data_hora', dataInicio).lte('data_hora', dataFim);

      // 4. Gera os horários passando todas essas novas regras
      const horarios = gerarHorarios(config, excecoes || [], agendamentosDia || [], data);
      setHorariosDisponiveis(horarios);

    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoHorarios(false);
    }
  };

  const gerarHorarios = (config, excecoes, agendamentosDia, dataEscolhida) => {
    if (!config) return [];
    const diaSemana = new Date(`${dataEscolhida}T12:00:00`).getDay();
    const isDiaPadrao = config.dias_funcionamento.includes(diaSemana);

    const agoraBrString = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const agora = new Date(agoraBrString);
    const duracaoDesejada = servicoSelecionado?.duracao_minutos || 30;

    let horariosLivres = [];

    // Vasculha o dia todo (06h às 23:30h)
    for (let h = 6; h <= 23; h++) {
      for (let m = 0; m < 60; m += 30) {
        const horaStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        const isHoraPadrao = horaStr >= config.hora_abertura.substring(0, 5) && horaStr < config.hora_fechamento.substring(0, 5);
        const isAbertoPadrao = isDiaPadrao && isHoraPadrao;

        const excecao = excecoes.find(e => e.horario.startsWith(horaStr));

        // Regra de Ouro: Está aberto se (É Padrão e não tem bloqueio) OU (Não é padrão mas tem liberação)
        const isAberto = (isAbertoPadrao && (!excecao || excecao.tipo !== 'bloqueio')) || (!isAbertoPadrao && excecao?.tipo === 'liberacao');

        if (!isAberto) continue; // Pula se estiver fechado

        // Verifica se a hora já passou no dia de hoje
        const horaAtualSlot = new Date(`${dataEscolhida}T${horaStr}:00`);
        if (dataEscolhida === hoje && horaAtualSlot < agora) continue;

        // Verifica se choca com algum agendamento existente
        const slotFim = new Date(horaAtualSlot.getTime() + duracaoDesejada * 60000);
        const conflito = agendamentosDia.some(ag => {
          const agInicio = new Date(ag.data_hora);
          const duracaoConcorrente = ag.servicos?.duracao_minutos || 30;
          const agFim = new Date(agInicio.getTime() + duracaoConcorrente * 60000);
          return (horaAtualSlot < agFim && slotFim > agInicio);
        });

        if (!conflito) horariosLivres.push(horaStr);
      }
    }
    return horariosLivres;
  };
  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setWhatsappGuest(value.substring(0, 15));
  };

  const handleConfirmarAgendamento = async (e) => {
    e.preventDefault();

    // 1. Pega o IP (usando um serviço público simples)
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = await res.json();

    // 2. Verifica limite no banco
    const { data: podeAgendar } = await supabase.rpc('verificar_limite_agendamentos', { ip_requisitante: ip });

    if (!podeAgendar) {
      alert('Muitas tentativas de agendamento detectadas. Tente novamente em uma hora.');
      return;
    }

    // 3. Registra o log
    await supabase.from('agendamento_logs').insert([{ ip_address: ip }]);

    if (!data || !horario) return alert('Selecione uma data e um horário válidos.');

    setLoading(true);
    try {
      const dataHoraIso = new Date(`${data}T${horario}:00`).toISOString();

      if (user) {
        const { error } = await supabase.from('agendamentos').insert([{
          barbearia_id: servicoSelecionado.barbearia_id,
          cliente_id: user.id,
          barbeiro_id: barbeiroSelecionado.id,
          servico_id: servicoSelecionado.id,
          data_hora: dataHoraIso,
          status_pagamento: 'pagar_na_hora',
          status_atendimento: 'agendado'
        }]);

        if (error) throw error;
        setPasso(4);
      }
      else {
        if (!nomeGuest || !whatsappGuest || !emailGuest) {
          alert('Preencha os seus dados para podermos confirmar a sua reserva.');
          setLoading(false);
          return;
        }

        const senhaTemporaria = Math.random().toString(36).slice(-10) + 'A1!';
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailGuest,
          password: senhaTemporaria
        });

        let novoUserId = null;

        if (authError) {
          if (authError.message.includes('User already registered')) {
            setJaTinhaConta(true);
          } else {
            throw authError;
          }
        } else {
          novoUserId = authData.user?.id;
          if (novoUserId) {
            await supabase.from('usuarios').insert([{
              id: novoUserId,
              nome: nomeGuest,
              whatsapp: whatsappGuest,
              role: 'cliente'
            }]);
          }
        }

        const { error: agError } = await supabase.from('agendamentos').insert([{
          barbearia_id: servicoSelecionado.barbearia_id,
          cliente_id: novoUserId || null,
          barbeiro_id: barbeiroSelecionado.id,
          servico_id: servicoSelecionado.id,
          data_hora: dataHoraIso,
          status_pagamento: 'pagar_na_hora',
          status_atendimento: 'agendado',
          nome_cliente_avulso: nomeGuest,
          whatsapp_cliente_avulso: whatsappGuest
        }]);

        if (agError) throw agError;

        localStorage.removeItem('agendamento_pendente');
        setPasso(4);
      }
    } catch (err) {
      alert('Erro ao processar agendamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetarECancelarTudo = () => {
    localStorage.removeItem('agendamento_pendente');
    setServicoSelecionado(null);
    setBarbeiroSelecionado(null);
    setData('');
    setHorario('');
    setNomeGuest('');
    setWhatsappGuest('');
    setEmailGuest('');
    setJaTinhaConta(false);
    setPasso(1);
    setIsCancelModalOpen(false);
    navigate('/');
  };

  return (
    <div className="flex flex-col text-text-base pb-12">
      <div className="flex-1 flex justify-center p-4">
        <div className="w-full max-w-lg mt-4 md:mt-8">

          {passo < 4 && (
            <div className="flex justify-between mb-8 px-4 relative">
              <div className="absolute top-4 left-0 h-0.5 bg-border-line w-full -z-10"></div>
              <button onClick={() => passo > 1 && setPasso(1)} className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${passo >= 1 ? 'bg-brand text-white shadow-sm' : 'bg-surface border border-border-line text-text-muted'}`}>1</button>
              <button onClick={() => passo > 2 && setPasso(2)} className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${passo >= 2 ? 'bg-brand text-white shadow-sm' : 'bg-surface border border-border-line text-text-muted'}`}>2</button>
              <button onClick={() => passo > 3 && setPasso(3)} className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${passo >= 3 ? 'bg-brand text-white shadow-sm' : 'bg-surface border border-border-line text-text-muted'}`}>3</button>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${passo >= 4 ? 'bg-green-500 text-white shadow-sm' : 'bg-surface border border-border-line text-text-muted'}`}>✓</div>
            </div>
          )}

          {/* PASSO 1: Selecionar Serviço */}
          {passo === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-sm font-bold text-text-muted mb-4 uppercase tracking-wider">1. O que vamos fazer hoje?</h2>
              <div className="space-y-3">
                {servicos.map((servico) => (
                  <button
                    key={servico.id}
                    onClick={() => { setServicoSelecionado(servico); setPasso(2); }}
                    className="w-full bg-surface p-4 rounded-2xl border border-border-line shadow-sm hover:border-brand hover:shadow-md transition-all text-left flex justify-between items-center group cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-text-base text-lg">{servico.nome_servico}</p>
                      <p className="text-xs text-text-muted mt-1 flex items-center gap-1"><Clock size={12} /> {servico.duracao_minutos} minutos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-brand">R$ {Number(servico.preco).toFixed(2)}</p>
                      <div className="mt-1 h-6 w-6 bg-background rounded-full flex items-center justify-center ml-auto group-hover:bg-brand group-hover:text-white transition-colors">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsCancelModalOpen(true)} className="w-full text-center text-xs font-bold text-text-muted hover:text-red-500 pt-4 transition-colors cursor-pointer">Cancelar e Voltar ao Início</button>
            </div>
          )}

          {/* PASSO 2: Selecionar Profissional */}
          {passo === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPasso(1)} className="p-1.5 bg-surface border border-border-line rounded-lg text-text-muted hover:text-text-base cursor-pointer"><ArrowLeft size={16} /></button>
                  <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">2. Escolha o Profissional</h2>
                </div>
                <button onClick={() => setIsCancelModalOpen(true)} className="text-xs font-bold text-red-500/80 hover:text-red-500 cursor-pointer">Cancelar</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {barbeiros.map((barbeiro) => (
                  <button
                    key={barbeiro.id}
                    onClick={() => { setBarbeiroSelecionado(barbeiro); setPasso(3); }}
                    className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm hover:border-brand hover:shadow-md transition-all flex flex-col items-center text-center gap-3 cursor-pointer"
                  >
                    <div className="h-16 w-16 bg-brand/10 rounded-full flex items-center justify-center text-brand border border-brand/20"><User size={32} /></div>
                    <p className="font-bold text-text-base">{barbeiro.nome.split(' ')[0]}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASSO 3: Data, Hora e Cadastro de Convidado Alternativo */}
          {passo === 3 && (
            <form onSubmit={handleConfirmarAgendamento} className="space-y-6 bg-surface p-6 rounded-2xl border border-border-line shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setPasso(2); setHorario(''); }} className="p-1.5 bg-background border border-border-line rounded-lg text-text-muted hover:text-text-base cursor-pointer"><ArrowLeft size={16} /></button>
                  <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">3. Detalhes do Agendamento</h2>
                </div>
                <button type="button" onClick={() => setIsCancelModalOpen(true)} className="text-xs font-bold text-red-500/80 hover:text-red-500 cursor-pointer">Cancelar</button>
              </div>

              <div className="grid grid-cols-1 gap-4 border-b border-border-line pb-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider flex items-center gap-1.5"><Calendar size={14} /> Data do Atendimento</label>
                  <input required type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none text-text-base cursor-pointer" />
                </div>

                {data && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-bold text-text-muted mb-3 uppercase tracking-wider flex items-center gap-1.5"><Clock size={14} /> Horários Livres na Agenda</label>
                    {carregandoHorarios ? (
                      <div className="flex items-center justify-center p-4"><div className="h-6 w-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin"></div></div>
                    ) : horariosDisponiveis.length === 0 ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                        <p className="text-sm font-bold text-red-500">Nenhum horário livre.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5 max-h-40 overflow-y-auto pr-1">
                        {horariosDisponiveis.map(hora => (
                          <button
                            type="button"
                            key={hora}
                            onClick={() => setHorario(hora)}
                            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${horario === hora ? 'bg-brand text-white shadow-md' : 'bg-background border border-border-line text-text-base hover:border-brand'}`}
                          >
                            {hora}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!user && horario && (
                <div className="space-y-4 animate-fadeIn bg-background/50 p-4 rounded-2xl border border-border-line">
                  <span className="text-[10px] font-black text-brand uppercase tracking-wider block">Insira seus dados para finalizar</span>

                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Seu Nome Completo *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-3 text-text-muted" />
                      <input required={!user} type="text" value={nomeGuest} onChange={(e) => setNomeGuest(e.target.value)} placeholder="Ex: Lucas Ramos" className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs text-text-base outline-none focus:border-brand" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">WhatsApp / Celular *</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3 top-3 text-text-muted" />
                        <input required={!user} type="tel" value={whatsappGuest} onChange={handleWhatsappChange} placeholder="(11) 99999-0000" className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs text-text-base outline-none focus:border-brand" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Seu Melhor E-mail *</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-3 text-text-muted" />
                        <input required={!user} type="email" value={emailGuest} onChange={(e) => setEmailGuest(e.target.value)} placeholder="exemplo@email.com" className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs text-text-base outline-none focus:border-brand" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-background p-4 rounded-xl border border-border-line text-xs text-text-muted space-y-1">
                <p><span className="font-semibold text-text-base">Serviço:</span> {servicoSelecionado?.nome_servico}</p>
                <p><span className="font-semibold text-text-base">Profissional:</span> {barbeiroSelecionado?.nome}</p>
                {horario && <p className="text-brand font-bold mt-1 text-sm">Reserva: {data.split('-').reverse().join('/')} às {horario}</p>}
              </div>

              <button type="submit" disabled={loading || !horario} className="w-full cursor-pointer rounded-xl bg-brand p-3.5 text-sm font-bold text-white hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                {loading ? 'Processando Reserva...' : 'Garantir Meu Horário'}
              </button>
            </form>
          )}

          {/* 🚀 PASSO 4: SUCESSO COM BOTÃO DE LOGIN */}
          {passo === 4 && (
            <div className="bg-surface p-8 rounded-2xl border border-border-line shadow-sm text-center animate-fadeIn">
              <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6"><CheckCircle2 size={40} /></div>
              <h2 className="text-2xl font-black text-text-base mb-2">Horário Reservado!</h2>

              {jaTinhaConta ? (
                <p className="text-sm text-text-muted mb-8 leading-relaxed">
                  Tudo certo! O horário foi garantido para você. Notamos que o e-mail <strong>{emailGuest}</strong> já possui cadastro. <strong>Faça login</strong> para acompanhar o seu agendamento!
                </p>
              ) : !user && emailGuest ? (
                <p className="text-sm text-text-muted mb-8 leading-relaxed">
                  O horário foi bloqueado para você! Enviamos um link de confirmação para o e-mail <strong>{emailGuest}</strong>. Abra seu e-mail e clique no link para validar o seu cadastro.
                </p>
              ) : (
                <p className="text-sm text-text-muted mb-8">O seu agendamento foi concluído com sucesso e adicionado ao seu painel!</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                {jaTinhaConta && (
                  <button onClick={() => { onOpenLogin(); navigate('/'); }} className="w-full bg-brand text-white p-3 rounded-xl text-sm font-bold hover:bg-brand-hover transition-colors cursor-pointer flex items-center justify-center gap-2">
                    <LogIn size={18} /> Fazer Login
                  </button>
                )}
                <button onClick={() => navigate('/')} className={`w-full bg-background border border-border-line p-3 rounded-xl text-sm font-bold text-text-base hover:bg-border-line transition-colors cursor-pointer ${jaTinhaConta ? '' : 'sm:col-span-2'}`}>
                  Voltar para o Início
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL DE CANCELAMENTO */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button type="button" onClick={() => setIsCancelModalOpen(false)} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-1 rounded-lg bg-background transition-colors cursor-pointer"><X size={16} /></button>
            <div className="text-center">
              <div className="h-14 w-14 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4"><AlertTriangle size={28} /></div>
              <h3 className="text-lg font-bold text-text-base mb-1">Cancelar Agendamento?</h3>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">Tem certeza de que deseja desistir? Todo o progresso da sua escolha será perdido.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCancelModalOpen(false)} className="flex-1 p-3 rounded-xl bg-background border border-border-line text-xs font-bold text-text-base hover:bg-border-line transition-colors cursor-pointer">Continuar</button>
                <button type="button" onClick={resetarECancelarTudo} className="flex-1 p-3 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer">Sim, Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}