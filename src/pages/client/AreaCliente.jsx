import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { 
  User, Calendar, Lock, Phone, MapPin, Scissors, Clock, 
  CheckCircle2, AlertCircle, XCircle, Coins, Gift, Ticket, 
  Sparkles, Star, Sun, Moon 
} from 'lucide-react';

export default function AreaCliente() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('fidelidade'); 

  return (
    <div className="flex flex-col text-text-base bg-background min-h-screen pb-24 font-sans">
      <div className="w-full max-w-4xl mx-auto px-5 pt-8 md:pt-12 space-y-8">
        
        <div className="bg-surface border border-border-line p-6 sm:p-8 rounded-[2rem] shadow-sm flex items-center gap-5">
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-brand/10 text-brand flex items-center justify-center text-2xl font-black border-2 border-brand/20 shadow-sm shrink-0">
            {profile?.nome?.charAt(0).toUpperCase() || <User size={32} />}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-black text-text-base mb-1">
              Olá, {profile?.nome?.split(' ')[0]}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-brand/10 text-brand px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 w-fit shadow-xs">
                <Coins size={14} /> {profile?.saldo_pontos || 0} Moedas
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex p-1.5 bg-surface border border-border-line rounded-2xl shadow-xs overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setTab('fidelidade')} 
            className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5 ${tab === 'fidelidade' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:text-text-base'}`}
          >
            <Star size={16}/> Fidelidade
          </button>
          <button 
            onClick={() => setTab('agendamentos')} 
            className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5 ${tab === 'agendamentos' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:text-text-base'}`}
          >
            <Calendar size={16}/> Histórico
          </button>
          <button 
            onClick={() => setTab('perfil')} 
            className={`flex-1 min-w-[120px] py-3 text-sm font-bold rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1.5 ${tab === 'perfil' ? 'bg-brand text-white shadow-md' : 'text-text-muted hover:text-text-base'}`}
          >
            <User size={16}/> Conta
          </button>
        </div>

        <div className="animate-fadeIn">
          {tab === 'fidelidade' && <ClubeFidelidade user={user} profile={profile} />}
          {tab === 'agendamentos' && <ListaAgendamentos user={user} />}
          {tab === 'perfil' && <FormularioPerfil user={user} profile={profile} />}
        </div>

      </div>
    </div>
  );
}

function ClubeFidelidade({ user, profile }) {
  const [recompensas, setRecompensas] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resgatando, setResgatando] = useState(false);

  const saldoAtual = profile?.saldo_pontos || 0;

  useEffect(() => {
    if (user && profile) carregarFidelidade();
  }, [user, profile]);

  const carregarFidelidade = async () => {
    setLoading(true);
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
          
        if (ultimoAgendamento) {
          currentBarbeariaId = ultimoAgendamento.barbearia_id;
        }
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

    } catch (error) {
      console.error('Erro ao carregar fidelidade:', error);
    } finally {
      setLoading(false);
    }
  };

  const resgatarPremio = async (recompensa) => {
    if (saldoAtual < recompensa.pontos_necessarios) {
      alert('Você não tem moedas suficientes para este prêmio.');
      return;
    }

    if (!window.confirm(`Deseja gastar ${recompensa.pontos_necessarios} moedas para resgatar "${recompensa.titulo}"?`)) return;

    setResgatando(true);
    try {
      const codigoGerado = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: sucesso, error } = await supabase.rpc('gerar_codigo_resgate', {
        p_cliente_id: user.id,
        p_barbearia_id: recompensa.barbearia_id, 
        p_recompensa_id: recompensa.id,
        p_recompensa_nome: recompensa.titulo,
        p_custo: recompensa.pontos_necessarios,
        p_codigo: codigoGerado
      });

      if (error) throw error;
      
      if (sucesso) {
        alert('Prêmio resgatado! Mostre o código no balcão da barbearia.');
        window.location.reload(); 
      } else {
        alert('Saldo insuficiente ou erro ao processar.');
      }
    } catch (err) {
      alert('Erro ao resgatar o prêmio: ' + err.message);
    } finally {
      setResgatando(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 animate-fadeIn">
      {vouchers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Ticket size={16} className="text-brand"/> Seus Prêmios para Usar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vouchers.map(v => (
              <div key={v.id} className="bg-brand text-white p-6 rounded-3xl relative overflow-hidden shadow-lg shadow-brand/30">
                <div className="absolute -right-4 -bottom-4 bg-white/10 p-8 rounded-full">
                  <Gift size={64} className="text-white/20" />
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1.5 rounded-lg inline-block mb-3">Voucher Válido</span>
                  <h4 className="text-xl font-black mb-1">{v.recompensa_nome}</h4>
                  <p className="text-sm text-white/80 mb-6">Apresente o código abaixo no balcão.</p>
                  
                  <div className="bg-white text-brand text-center py-3 rounded-2xl border-2 border-dashed border-brand/30">
                    <span className="text-2xl font-black tracking-[0.3em]">{v.codigo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-brand"/> Troque suas moedas
        </h3>

        {recompensas.length === 0 ? (
          <div className="bg-surface p-8 border border-dashed border-border-line rounded-3xl text-center">
            <p className="font-bold text-text-muted">Nenhum prêmio disponível na barbearia visitada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recompensas.map(rec => {
              const percentual = Math.min((saldoAtual / rec.pontos_necessarios) * 100, 100);
              const podeResgatar = saldoAtual >= rec.pontos_necessarios;
              const falta = rec.pontos_necessarios - saldoAtual;

              return (
                <div key={rec.id} className="bg-surface p-5 sm:p-6 rounded-3xl border border-border-line shadow-sm flex flex-col justify-between group hover:border-brand/40 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-black text-text-base pr-4">{rec.titulo}</h4>
                      <span className="shrink-0 bg-brand/10 text-brand px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                        <Coins size={12}/> {rec.pontos_necessarios}
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
                          className={`h-full transition-all duration-1000 ease-out ${podeResgatar ? 'bg-green-500' : 'bg-brand'}`}
                          style={{ width: `${percentual}%` }}
                        ></div>
                      </div>
                    </div>

                    <button
                      onClick={() => resgatarPremio(rec)}
                      disabled={!podeResgatar || resgatando}
                      className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        podeResgatar 
                          ? 'bg-brand text-white shadow-md hover:brightness-105' 
                          : 'bg-background border border-border-line text-text-muted opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {podeResgatar ? 'Resgatar Prêmio' : 'Moedas Insuficientes'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FormularioPerfil({ user, profile }) {
  const [formData, setFormData] = useState(profile || {});
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // ✨ Tema Settings Logic
  const [theme, setTheme] = useState(localStorage.getItem('horza_theme') || 'light');

  useEffect(() => {
    const handleThemeChange = () => setTheme(localStorage.getItem('horza_theme') || 'light');
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('horza_theme', newTheme);
    window.dispatchEvent(new Event('themeChange')); // Sincroniza com o Navbar
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('usuarios').update(formData).eq('id', user.id);
      if (profileError) throw profileError;
      
      if (novaSenha) {
        const { error: authError } = await supabase.auth.updateUser({ password: novaSenha });
        if (authError) throw authError;
      }

      alert('Perfil atualizado com sucesso!');
      setNovaSenha('');
    } catch (err) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCpfChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setFormData({...formData, cpf: value.substring(0, 14)});
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData({...formData, whatsapp: value.substring(0, 15)});
  };

  return (
    <div className="bg-surface p-6 sm:p-8 rounded-[2rem] border border-border-line shadow-sm space-y-8 animate-fadeIn">
      
      {/* ✨ SEÇÃO DE TEMA ADICIONADA AQUI ✨ */}
      <div>
        <h3 className="text-lg font-black text-text-base flex items-center gap-2 mb-6">
          <Sun size={20} className="text-brand"/> Preferências
        </h3>
        <div className="flex items-center justify-between bg-background border border-border-line p-4 rounded-2xl">
          <div>
            <p className="font-bold text-text-base">Tema do Sistema</p>
            <p className="text-xs text-text-muted mt-0.5">Alternar entre modo claro e escuro</p>
          </div>
          <button 
            type="button" 
            onClick={toggleTheme} 
            className="p-3 rounded-xl bg-surface border border-border-line text-text-base hover:border-brand hover:text-brand shadow-sm transition-all cursor-pointer"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>

      <div className="pt-8 border-t border-border-line">
        <h3 className="text-lg font-black text-text-base flex items-center gap-2 mb-6">
          <User size={20} className="text-brand"/> Dados Pessoais
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Nome Completo</label>
            <input type="text" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3.5 outline-none focus:border-brand" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">E-mail (Login)</label>
            <input type="email" disabled className="w-full bg-background/50 border border-border-line text-sm font-bold text-text-muted rounded-2xl px-4 py-3.5 outline-none cursor-not-allowed" value={user?.email || ''} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">WhatsApp</label>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="tel" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-brand" value={formData.whatsapp || ''} onChange={handlePhoneChange} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">CPF</label>
            <input type="text" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3.5 outline-none focus:border-brand" value={formData.cpf || ''} onChange={handleCpfChange} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Endereço Completo</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-brand" value={formData.endereco || ''} onChange={e => setFormData({...formData, endereco: e.target.value})} />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border-line">
        <h3 className="text-lg font-black text-text-base flex items-center gap-2 mb-6">
          <Lock size={20} className="text-brand"/> Segurança
        </h3>
        <div className="max-w-md">
          <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Alterar Senha de Acesso</label>
          <input type="password" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3.5 outline-none focus:border-brand" placeholder="Digite a nova senha (opcional)" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
        </div>
      </div>

      <div className="pt-4">
        <button onClick={handleUpdate} disabled={loading} className="w-full md:w-auto md:min-w-[200px] bg-brand text-white py-4 px-8 rounded-2xl text-sm font-black hover:brightness-105 shadow-md disabled:opacity-50 cursor-pointer">
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}

function ListaAgendamentos({ user }) {
  const [ags, setAgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgs = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('agendamentos').select('*, servicos(nome_servico, duracao_minutos, preco), barbeiros:usuarios!agendamentos_barbeiro_id_fkey(nome)').eq('cliente_id', user.id).order('data_hora', { ascending: false });
        setAgs(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgs();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-10 w-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-4 animate-fadeIn">
      {ags.length === 0 ? (
        <div className="text-center py-24 bg-surface rounded-[2rem] border border-dashed border-border-line">
          <div className="bg-background w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-line"><Calendar size={32} className="text-text-muted" /></div>
          <h3 className="font-black text-xl text-text-base mb-1">Nenhum histórico</h3>
          <p className="text-sm text-text-muted">Você ainda não possui agendamentos conosco.</p>
        </div>
      ) : (
        ags.map(ag => {
          const dataFormatada = new Date(ag.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
          const horaFormatada = new Date(ag.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          const isCancelado = ag.status_atendimento === 'cancelado';
          const isConcluido = ag.status_atendimento === 'concluido';
          const isAusente = ag.status_atendimento === 'ausente';

          return (
            <div key={ag.id} className={`bg-surface p-6 rounded-[2rem] border shadow-sm transition-all ${isCancelado ? 'border-red-500/20 opacity-75 grayscale' : isConcluido ? 'border-green-500/20' : isAusente ? 'border-amber-500/20 opacity-75' : 'border-border-line'}`}>
              <div className="flex justify-between items-start mb-5 pb-4 border-b border-border-line/60">
                <div className="flex items-center gap-4">
                  <div className="bg-background border border-border-line text-text-base text-center px-4 py-2 rounded-2xl shadow-sm">
                    <span className="block text-[10px] font-black uppercase text-text-muted leading-none mb-1">{dataFormatada.split(' de ')[1]}</span>
                    <span className="block text-xl font-black leading-none">{dataFormatada.split(' de ')[0]}</span>
                  </div>
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 w-fit ${isCancelado ? 'bg-red-500/10 text-red-500' : isConcluido ? 'bg-green-500/10 text-green-600' : isAusente ? 'bg-amber-500/10 text-amber-600' : 'bg-brand/10 text-brand'}`}>
                      {isCancelado ? <XCircle size={12}/> : isConcluido ? <CheckCircle2 size={12}/> : isAusente ? <AlertCircle size={12}/> : <Clock size={12}/>}
                      {ag.status_atendimento}
                    </span>
                    <p className="text-sm font-bold text-text-base mt-1.5 flex items-center gap-1.5"><Clock size={14} className="text-text-muted"/> {horaFormatada}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-3">
                  <div className="bg-brand/5 border border-brand/10 p-2.5 rounded-full text-brand"><Scissors size={18}/></div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Serviço</p>
                    <p className="font-black text-text-base text-sm">{ag.servicos?.nome_servico} <span className="font-normal text-text-muted">({ag.servicos?.duracao_minutos} min)</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-background border border-border-line p-2.5 rounded-full text-text-muted"><User size={18}/></div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Profissional</p>
                    <p className="font-bold text-text-base text-sm">{ag.barbeiros?.nome}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}