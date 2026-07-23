import { Search, Crown, Sparkles, Eye, Edit, Settings, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPlanBadgeClass, getPlanCardBorderClass, getPlanLabel } from '../../constants/planDisplay';

const FILTRO_PLANOS = [
  { value: 'todos', label: 'Todos os planos' },
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'plus', label: 'Plus' },
  { value: 'pending', label: 'Pendente aprovação' },
];

export default function MasterPlanosSection({
  empresas,
  busca,
  onBuscaChange,
  filtroPlano,
  onFiltroChange,
  onAlterarPlano,
  onQuickView,
  onEdit,
  alterandoPlanoId,
}) {
  const filtradas = empresas.filter((emp) => {
    const termo = busca.toLowerCase().trim();
    const matchNome =
      !termo ||
      emp.nome?.toLowerCase().includes(termo) ||
      emp.slug?.toLowerCase().includes(termo) ||
      emp.cidade?.toLowerCase().includes(termo);

    const slugPlano = emp.status === 'pendente' ? 'pending' : (emp.plan_slug || 'free');
    const matchPlano = filtroPlano === 'todos' || slugPlano === filtroPlano;

    return matchNome && matchPlano;
  });

  const contagem = {
    pro: empresas.filter((e) => e.plan_slug === 'pro').length,
    plus: empresas.filter((e) => e.plan_slug === 'plus').length,
    free: empresas.filter((e) => e.status !== 'pendente' && (e.plan_slug === 'free' || !e.plan_slug)).length,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-amber-500/10 via-brand/5 to-violet-500/10 border border-amber-500/20 p-6 rounded-3xl">
        <h2 className="text-lg font-black text-text-base flex items-center gap-2 mb-2">
          <Crown size={22} className="text-amber-500" /> Gestão de planos
        </h2>
        <p className="text-sm text-text-muted">
          {contagem.pro} Pro · {contagem.plus} Plus · {contagem.free} Free · {empresas.length} total
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 bg-surface border border-border-line rounded-2xl p-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Filtrar por nome, slug ou cidade..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={filtroPlano}
          onChange={(e) => onFiltroChange(e.target.value)}
          className="rounded-xl border border-border-line bg-background px-4 py-3 text-sm font-bold outline-none focus:border-brand min-w-[180px]"
        >
          {FILTRO_PLANOS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <p className="text-xs font-bold text-text-muted">{filtradas.length} empresa(s) encontrada(s)</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtradas.map((emp) => {
          const slugPlano = emp.status === 'pendente' ? 'pending' : (emp.plan_slug || 'free');
          const isPending = emp.status === 'pendente';
          const loading = alterandoPlanoId === emp.id;

          return (
            <div
              key={emp.id}
              className={`bg-surface border p-6 rounded-3xl shadow-sm ${getPlanCardBorderClass(slugPlano)}`}
            >
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-text-base flex items-center gap-2 truncate">
                    {emp.nome}
                    {slugPlano === 'pro' && <Crown size={16} className="text-brand shrink-0" />}
                    {slugPlano === 'plus' && <Sparkles size={16} className="text-violet-500 shrink-0" />}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">/{emp.slug}</p>
                  <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {emp.cidade ? `${emp.cidade} - ${emp.estado}` : 'Sem endereço'}
                  </p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 ${getPlanBadgeClass(slugPlano)}`}>
                  {getPlanLabel(slugPlano, emp.plan_nome)}
                </span>
              </div>

              <div className="flex gap-3 mb-5 text-center">
                <div className="flex-1 bg-background rounded-xl p-2.5 border border-border-line">
                  <p className="text-[10px] font-black uppercase text-text-muted">Membros</p>
                  <p className="text-base font-black">{emp.usuarios?.[0]?.count || 0}</p>
                </div>
                <div className="flex-1 bg-background rounded-xl p-2.5 border border-border-line">
                  <p className="text-[10px] font-black uppercase text-text-muted">Reservas</p>
                  <p className="text-base font-black">{emp.agendamentos?.[0]?.count || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {['free', 'pro', 'plus'].map((plano) => {
                  const ativo = !isPending && emp.plan_slug === plano;
                  const styles =
                    plano === 'pro'
                      ? ativo
                        ? 'bg-brand text-white border-brand'
                        : 'border-brand/30 text-brand hover:bg-brand/10'
                      : plano === 'plus'
                        ? ativo
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-violet-500/30 text-violet-600 hover:bg-violet-500/10'
                        : ativo
                          ? 'bg-text-muted/20 text-text-base border-border-line'
                          : 'border-border-line text-text-muted hover:border-brand';

                  return (
                    <button
                      key={plano}
                      type="button"
                      disabled={isPending || loading || ativo}
                      onClick={() => onAlterarPlano(emp.id, plano)}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed ${styles}`}
                    >
                      {plano === 'free' ? 'Free' : plano === 'pro' ? 'Pro' : 'Plus'}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onQuickView(emp)}
                  className="flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-bold bg-background border border-border-line hover:border-brand flex items-center justify-center gap-1.5"
                >
                  <Eye size={16} /> Ver
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(emp)}
                  className="flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-bold bg-background border border-border-line hover:border-brand flex items-center justify-center gap-1.5"
                >
                  <Edit size={16} /> Editar
                </button>
                {!isPending && (
                  <Link
                    to={`/${emp.slug}/admin`}
                    className="flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-bold bg-brand text-white hover:brightness-110 flex items-center justify-center gap-1.5"
                  >
                    <Settings size={16} /> Painel
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtradas.length === 0 && (
        <div className="text-center py-12 text-text-muted bg-surface border border-border-line rounded-2xl">
          Nenhuma empresa encontrada com os filtros atuais.
        </div>
      )}
    </div>
  );
}
