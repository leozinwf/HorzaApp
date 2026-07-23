import {
  Building2, Users, CalendarCheck, Crown, Headphones, AlertTriangle,
  TrendingUp, Sparkles, ArrowRight, Coins,
} from 'lucide-react';
import { getPlanBadgeClass, getPlanLabel } from '../../constants/planDisplay';
import { getSupportStatusClass } from '../../services/supportService';

export default function MasterDashboardSection({
  resumo,
  empresas,
  usuarios,
  supportStats,
  recentTickets,
  onNavigate,
  loading,
}) {
  const pendentes = empresas.filter((e) => e.status === 'pendente').length;
  const planCounts = empresas.reduce(
    (acc, e) => {
      const slug = e.status === 'pendente' ? 'pending' : (e.plan_slug || 'free');
      acc[slug] = (acc[slug] || 0) + 1;
      return acc;
    },
    { free: 0, pro: 0, plus: 0, pending: 0 }
  );
  const clientesAtivos = usuarios.filter((u) => u.ativo && u.role === 'cliente').length;
  const admins = usuarios.filter((u) => u.role === 'admin').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-gradient-to-br from-brand/10 via-surface to-violet-500/5 border border-border-line rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-brand mb-1">Visão geral</p>
            <h2 className="text-2xl md:text-3xl font-black text-text-base">Dashboard da plataforma</h2>
            <p className="text-sm text-text-muted mt-2 max-w-xl">
              Acompanhe barbearias, usuários, planos, suporte e operações em um só lugar.
            </p>
          </div>
          {(supportStats?.badgeCount || 0) > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('suporte')}
              className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/25 text-red-600 px-4 py-3 rounded-2xl font-black text-sm hover:bg-red-500/15 transition-colors"
            >
              <span className="relative">
                <Headphones size={20} />
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {supportStats.badgeCount}
                </span>
              </span>
              {supportStats.badgeCount} chamado(s) aberto(s)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building2 size={22} />} label="Barbearias" value={resumo.totalBarbearias} accent="brand" />
        <StatCard icon={<Users size={22} />} label="Usuários" value={resumo.totalUsuarios} accent="blue" />
        <StatCard icon={<CalendarCheck size={22} />} label="Agendamentos" value={resumo.totalAgendamentos} accent="green" />
        <StatCard icon={<Crown size={22} />} label="Premium" value={resumo.premium} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-surface border border-border-line rounded-3xl p-6 space-y-4">
          <h3 className="font-black text-text-base flex items-center gap-2">
            <TrendingUp size={18} className="text-brand" /> Distribuição de planos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['free', 'pro', 'plus', 'pending'].map((slug) => (
              <div key={slug} className="bg-background border border-border-line rounded-2xl p-4 text-center">
                <span className={`inline-block text-[10px] font-black uppercase px-2 py-1 rounded-lg mb-2 ${getPlanBadgeClass(slug)}`}>
                  {getPlanLabel(slug)}
                </span>
                <p className="text-2xl font-black text-text-base">{planCounts[slug] || 0}</p>
              </div>
            ))}
          </div>
          {pendentes > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('empresas')}
              className="w-full flex items-center justify-between gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-3 text-sm font-bold text-orange-700 hover:bg-orange-500/15"
            >
              <span className="flex items-center gap-2"><AlertTriangle size={16} /> {pendentes} barbearia(s) aguardando aprovação</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        <div className="bg-surface border border-border-line rounded-3xl p-6 space-y-4">
          <h3 className="font-black text-text-base flex items-center gap-2">
            <Sparkles size={18} className="text-violet-500" /> Comunidade
          </h3>
          <div className="space-y-3">
            <MiniStat label="Clientes ativos" value={clientesAtivos} />
            <MiniStat label="Donos / admins" value={admins} />
            <MiniStat label="Tickets de suporte" value={supportStats?.total || 0} />
            <MiniStat label="Em aberto" value={supportStats?.badgeCount || 0} highlight />
          </div>
          <button type="button" onClick={() => onNavigate('usuarios')} className="w-full text-sm font-black text-brand hover:underline text-left">
            Gerenciar usuários →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface border border-border-line rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-text-base flex items-center gap-2">
              <Headphones size={18} className="text-brand" /> Suporte recente
            </h3>
            <button type="button" onClick={() => onNavigate('suporte')} className="text-xs font-black text-brand hover:underline">
              Ver todos
            </button>
          </div>
          {recentTickets?.length ? (
            <ul className="space-y-2">
              {recentTickets.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-background border border-border-line">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-base truncate">{t.assunto}</p>
                    <p className="text-xs text-text-muted truncate">{t.nome} · {t.email}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border shrink-0 ${getSupportStatusClass(t.status)}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted py-6 text-center">Nenhum ticket ainda.</p>
          )}
        </div>

        <div className="bg-surface border border-border-line rounded-3xl p-6">
          <h3 className="font-black text-text-base mb-4 flex items-center gap-2">
            <Coins size={18} className="text-brand" /> Ações rápidas
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction label="Aprovar empresas" onClick={() => onNavigate('empresas')} />
            <QuickAction label="Gerenciar planos" onClick={() => onNavigate('planos')} />
            <QuickAction label="Ver agendamentos" onClick={() => onNavigate('agendamentos')} />
            <QuickAction label="Dar moedas" onClick={() => onNavigate('usuarios')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  const colors = {
    brand: 'text-brand',
    blue: 'text-blue-500',
    green: 'text-green-500',
    amber: 'text-amber-500',
  };
  return (
    <div className="bg-surface border border-border-line rounded-2xl p-5 shadow-sm">
      <div className={`mb-2 ${colors[accent] || colors.brand}`}>{icon}</div>
      <p className="text-[10px] font-black uppercase text-text-muted">{label}</p>
      <p className="text-2xl font-black text-text-base mt-0.5">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted font-bold">{label}</span>
      <span className={`font-black ${highlight ? 'text-red-500' : 'text-text-base'}`}>{value}</span>
    </div>
  );
}

function QuickAction({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left px-4 py-3 rounded-xl bg-background border border-border-line text-sm font-bold text-text-base hover:border-brand hover:text-brand transition-colors"
    >
      {label}
    </button>
  );
}
