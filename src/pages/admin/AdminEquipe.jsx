import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { useModal } from '../../context/ModalContext';
import { Users, UserPlus, Search, Shield, Trash2, Phone, Check, Mail, AlertCircle } from 'lucide-react';
import { useTenantPlan } from '../../context/PlanContext';
import { FEATURE_KEYS, parsePlanLimitError } from '../../constants/planFeatures';

const soDigitos = (v) => (v || '').replace(/\D/g, '');

export default function AdminEquipe() {
  const { profile } = useAuth();
  const { adminBarbeariaId } = useOutletContext();
  const { showAlert, showConfirm } = useModal();
  const plan = useTenantPlan();

  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('lista');

  const [termoBusca, setTermoBusca] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [roleSelecionada, setRoleSelecionada] = useState('funcionario');
  const [statusBusca, setStatusBusca] = useState('');

  useEffect(() => {
    if (adminBarbeariaId) buscarEquipe();
  }, [adminBarbeariaId]);

  const buscarEquipe = async () => {
    if (equipe.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('barbearia_id', adminBarbeariaId)
        .in('role', ['admin', 'gerente', 'funcionario'])
        .order('nome');
      if (error) throw error;
      setEquipe(data || []);
    } catch (err) {
      showAlert('Erro', 'Não foi possível carregar a equipe.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pesquisarUsuario = async (e) => {
    e.preventDefault();
    if (!termoBusca.trim()) {
      showAlert('Atenção', 'Digite e-mail, telefone, CPF ou nome.', 'info');
      return;
    }

    setBuscando(true);
    setUsuarioEncontrado(null);
    setStatusBusca('');

    try {
      const termo = termoBusca.trim();
      const digitos = soDigitos(termo);

      let query = supabase.from('usuarios').select('*').neq('id', profile.id);

      if (termo.includes('@')) {
        query = query.ilike('email', termo);
      } else if (digitos.length >= 10) {
        query = query.or(`whatsapp.ilike.%${digitos.slice(-8)}%,cpf.ilike.%${digitos}%`);
      } else if (digitos.length === 11) {
        query = query.eq('cpf', termo).or(`cpf.eq.${digitos}`);
      } else {
        query = query.ilike('nome', `%${termo}%`);
      }

      const { data, error } = await query.limit(5);
      if (error) throw error;

      if (!data?.length) {
        setStatusBusca('Nenhum usuário encontrado. A pessoa precisa criar conta no app primeiro (como cliente).');
        return;
      }

      const candidato =
        data.find((u) => u.email?.toLowerCase() === termo.toLowerCase()) ||
        data.find((u) => soDigitos(u.whatsapp) === digitos) ||
        data.find((u) => u.cpf === termo || soDigitos(u.cpf) === digitos) ||
        data[0];

      if (candidato.barbearia_id === adminBarbeariaId && candidato.role !== 'cliente') {
        setStatusBusca(`${candidato.nome} já faz parte da sua equipe (${candidato.role}). Veja na aba Membros.`);
        setUsuarioEncontrado(null);
        return;
      }

      if (candidato.barbearia_id && candidato.barbearia_id !== adminBarbeariaId) {
        setStatusBusca('Este usuário já está vinculado a outra barbearia e não pode ser adicionado.');
        return;
      }

      setUsuarioEncontrado(candidato);
      setStatusBusca(
        candidato.barbearia_id === adminBarbeariaId
          ? 'Cliente da sua barbearia — pronto para promover à equipe.'
          : 'Usuário encontrado — pode ser adicionado à equipe.'
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro na busca. Tente e-mail ou telefone completo.');
    } finally {
      setBuscando(false);
    }
  };

  const adicionarAEquipe = async () => {
    const limite = plan.checkPlanLimit(FEATURE_KEYS.MAX_EMPLOYEES);
    if (!limite.ok) {
      showAlert(
        'Limite do plano Free',
        `Seu plano permite até ${limite.limit} funcionários (${limite.usage} em uso). Faça upgrade para o Horza Pro.`,
        'info'
      );
      return;
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          role: roleSelecionada,
          barbearia_id: adminBarbeariaId,
          exibe_na_agenda: true,
          ativo: true,
        })
        .eq('id', usuarioEncontrado.id);

      if (error) throw error;
      toast.success(`${usuarioEncontrado.nome} adicionado à equipe!`);
      setUsuarioEncontrado(null);
      setTermoBusca('');
      setStatusBusca('');
      buscarEquipe();
      setTab('lista');
    } catch (err) {
      const parsed = parsePlanLimitError(err.message);
      if (parsed?.featureKey === FEATURE_KEYS.MAX_EMPLOYEES) {
        showAlert('Limite atingido', `Máximo de ${parsed.limit} funcionários no plano Free. Conheça o Horza Pro.`, 'info');
        plan.reload();
        return;
      }
      showAlert('Erro', 'Não foi possível adicionar: ' + err.message, 'error');
    }
  };

  const removerMembro = (membro) => {
    if (membro.id === profile.id) return showAlert('Atenção', 'Você não pode remover a si próprio.', 'info');
    showConfirm('Remover da Equipe?', `Deseja remover "${membro.nome}"?`, async () => {
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({ role: 'cliente', exibe_na_agenda: false })
          .eq('id', membro.id);
        if (error) throw error;
        setEquipe((prev) => prev.filter((m) => m.id !== membro.id));
        toast.success('Membro removido da equipe.');
      } catch (err) {
        showAlert('Erro', 'Falha ao remover.', 'error');
      }
    });
  };

  const isDono = profile.role === 'admin';

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto mb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-text-base">Equipe de Barbeiros</h1>
        <p className="text-sm text-text-muted mt-1">Gerencie os profissionais que aparecem na agenda.</p>
        {!plan.loading && plan.checkPlanLimit(FEATURE_KEYS.MAX_EMPLOYEES).limit != null && (
          <p className="text-xs font-bold text-brand mt-2">
            {plan.checkPlanLimit(FEATURE_KEYS.MAX_EMPLOYEES).usage}/{plan.checkPlanLimit(FEATURE_KEYS.MAX_EMPLOYEES).limit} funcionários no plano {plan.planNome}
          </p>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-surface border border-border-line rounded-xl mb-8 w-full max-w-md">
        <button onClick={() => setTab('lista')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === 'lista' ? 'bg-brand text-white shadow-sm' : 'text-text-muted'}`}>
          <Users size={18}/> Membros ({equipe.length})
        </button>
        <button onClick={() => setTab('adicionar')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${tab === 'adicionar' ? 'bg-brand text-white shadow-sm' : 'text-text-muted'}`}>
          <UserPlus size={18}/> Adicionar
        </button>
      </div>

      {tab === 'lista' && (
        <div className="animate-fadeIn">
          {loading && equipe.length === 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-36 bg-surface rounded-2xl border border-border-line animate-pulse" />)}
            </div>
          ) : equipe.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-dashed border-border-line rounded-2xl">
              <p className="font-bold text-text-muted">Nenhum membro na equipe.</p>
              <button onClick={() => setTab('adicionar')} className="mt-4 text-brand font-bold text-sm cursor-pointer">Adicionar primeiro membro</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipe.map((membro) => (
                <div key={membro.id} className="bg-surface border border-border-line rounded-2xl p-5 relative hover:border-brand/30">
                  <span className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl font-bold text-[10px] uppercase ${membro.role === 'admin' ? 'bg-brand text-white' : 'bg-background border-b border-l border-border-line text-text-muted'}`}>
                    {membro.role}
                  </span>
                  <div className="flex items-center gap-4 mb-4 mt-2">
                    <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-lg">{membro.nome.charAt(0)}</div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold truncate">{membro.nome}</h3>
                      {membro.email && <p className="text-xs text-text-muted flex items-center gap-1 truncate"><Mail size={10}/> {membro.email}</p>}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border-line flex justify-between items-center">
                    <span className={`text-[10px] font-bold ${membro.exibe_na_agenda !== false ? 'text-green-600' : 'text-text-muted'}`}>
                      {membro.exibe_na_agenda !== false ? 'Na agenda' : 'Oculto na agenda'}
                    </span>
                    {(isDono || (profile.role === 'gerente' && membro.role === 'funcionario')) && membro.id !== profile.id && (
                      <button onClick={() => removerMembro(membro)} className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer">
                        <Trash2 size={14}/> Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'adicionar' && (
        <div className="animate-fadeIn max-w-xl space-y-4">
          <div className="bg-brand/5 border border-brand/20 p-5 rounded-2xl">
            <h4 className="font-bold text-brand flex items-center gap-2 mb-2"><Shield size={18}/> Como adicionar</h4>
            <ul className="text-sm text-text-muted space-y-1 list-disc pl-4">
              <li>A pessoa precisa ter conta no HorzaApp (cadastro como cliente).</li>
              <li>Busque por <strong>e-mail</strong>, <strong>telefone</strong>, <strong>CPF</strong> ou <strong>nome</strong>.</li>
              <li>Se já está na equipe (aba Permissões), ela aparece em Membros.</li>
            </ul>
          </div>

          <form onSubmit={pesquisarUsuario} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />
              <input type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} placeholder="E-mail, telefone, CPF ou nome..." className="w-full pl-12 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
            </div>
            <button type="submit" disabled={buscando} className="bg-brand text-white px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer">
              {buscando ? '...' : 'Buscar'}
            </button>
          </form>

          {statusBusca && (
            <div className={`p-4 rounded-xl text-sm flex items-start gap-2 ${usuarioEncontrado ? 'bg-green-500/10 text-green-700 border border-green-500/20' : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'}`}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {statusBusca}
            </div>
          )}

          {usuarioEncontrado && (
            <div className="bg-surface p-6 rounded-2xl border border-brand/30 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-xl">{usuarioEncontrado.nome.charAt(0)}</div>
                <div>
                  <p className="font-black text-lg">{usuarioEncontrado.nome}</p>
                  <p className="text-sm text-text-muted">{usuarioEncontrado.email}</p>
                  {usuarioEncontrado.whatsapp && <p className="text-xs text-text-muted flex items-center gap-1"><Phone size={10}/> {usuarioEncontrado.whatsapp}</p>}
                </div>
              </div>
              <div className="flex gap-4">
                <select value={roleSelecionada} onChange={(e) => setRoleSelecionada(e.target.value)} className="flex-1 bg-background border border-border-line rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-brand">
                  <option value="funcionario">Barbeiro / Funcionário</option>
                  {isDono && <option value="gerente">Gerente</option>}
                  {isDono && <option value="admin">Dono (Admin)</option>}
                </select>
                <button onClick={adicionarAEquipe} className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-600 flex items-center gap-2 cursor-pointer">
                  <Check size={18}/> Adicionar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
