import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Crown, Check, Sparkles, Users, CalendarDays, Loader2,
  ExternalLink, CreditCard, AlertCircle,
} from 'lucide-react';
import { useTenantPlan } from '../../context/PlanContext';
import { PLAN_SLUGS, isProOrAbove } from '../../constants/planFeatures';
import {
  createBillingCheckout,
  createBillingPortal,
  syncBillingSession,
  fetchAvailablePlans,
  formatData,
  formatPrecoBRL,
  SUBSCRIPTION_STATUS_LABELS,
} from '../../services/billingService';

const PRO_FEATURES = [
  'Funcionários e agendamentos ilimitados',
  'Destaque no marketplace',
  'Agenda, WhatsApp e financeiro inteligentes',
  'Estoque, fidelidade e dashboard avançados',
  'Personalização e gorjeta digital',
];

const PLUS_FEATURES = [
  'Tudo do Horza Pro',
  'Controle de comissões',
  'Múltiplas unidades',
  'Heatmap e backup automático',
  'Pacote completo de IA',
];

const PLAN_COMPARISON = [
  { feature: 'Funcionários', free: 'Até 3', pro: 'Ilimitado', plus: 'Ilimitado' },
  { feature: 'Agendamentos / mês', free: 'Até 50', pro: 'Ilimitado', plus: 'Ilimitado' },
  { feature: 'Dashboard avançado', free: '—', pro: '✓', plus: '✓' },
  { feature: 'Agenda & WhatsApp inteligentes', free: '—', pro: '✓', plus: '✓' },
  { feature: 'Financeiro & estoque inteligentes', free: '—', pro: '✓', plus: '✓' },
  { feature: 'Gorjeta digital & QR na cadeira', free: '—', pro: '✓', plus: '✓' },
  { feature: 'Comissões & multi-unidades', free: '—', pro: '—', plus: '✓' },
  { feature: 'Heatmap, backup & domínio', free: '—', pro: '—', plus: '✓' },
  { feature: 'Pacote IA Horza', free: '—', pro: '—', plus: '✓' },
];

export default function AdminMeuPlano() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { barbeariaId, planInfo, planSlug, planNome, loading, reload } = useTenantPlan();
  const [plans, setPlans] = useState([]);
  const [carregandoPlanos, setCarregandoPlanos] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [sincronizandoCheckout, setSincronizandoCheckout] = useState(false);
  const checkoutHandled = useRef(false);
  const billingTabOpened = useRef(false);

  const billing = planInfo?.billing;
  const team = planInfo ? { usage: planInfo.team_count ?? 0, limit: planInfo.features?.max_employees?.limit } : null;
  const appts = planInfo ? { usage: planInfo.appointments_month ?? 0, limit: planInfo.features?.max_appointments_month?.limit } : null;

  useEffect(() => {
    fetchAvailablePlans()
      .then(setPlans)
      .catch((err) => toast.error(err.message || 'Erro ao carregar planos.'))
      .finally(() => setCarregandoPlanos(false));
  }, []);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (!checkout || checkoutHandled.current) return;

    if (checkout === 'cancel') {
      checkoutHandled.current = true;
      toast.error('Checkout cancelado.');
      setSearchParams({}, { replace: true });
      return;
    }

    if (checkout !== 'success') return;
    if (!barbeariaId) return;

    const sessionId = searchParams.get('session_id');
    checkoutHandled.current = true;
    setSincronizandoCheckout(true);

    (async () => {
      try {
        if (sessionId) {
          const result = await syncBillingSession({ barbeariaId, sessionId });
          toast.success(`Plano ${result.planSlug === 'plus' ? 'Horza Plus' : 'Horza Pro'} ativado!`);
        } else {
          toast.success('Pagamento recebido! Sincronizando plano…');
        }
        await reload(true, { background: true });
      } catch (err) {
        toast.error(err.message || 'Pagamento ok, mas falhou ao ativar o plano. Tente recarregar a página.');
        await reload(true, { background: true });
      } finally {
        setSincronizandoCheckout(false);
        setSearchParams({}, { replace: true });
      }
    })();
  }, [searchParams, barbeariaId, reload, setSearchParams]);

  useEffect(() => {
    const onFocus = () => {
      if (!billingTabOpened.current) return;
      billingTabOpened.current = false;
      reload(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const abrirEmNovaAba = (url, mensagem = 'Pagamento aberto em nova aba. Volte aqui após concluir.') => {
    const novaAba = window.open(url, '_blank', 'noopener,noreferrer');
    if (!novaAba) {
      toast.error('Pop-up bloqueado. Permita pop-ups para este site ou tente novamente.');
      return false;
    }
    billingTabOpened.current = true;
    toast.success(mensagem);
    return true;
  };

  const planCards = useMemo(() => {
    return plans
      .filter((p) => p.slug !== PLAN_SLUGS.FREE)
      .map((p) => ({
        ...p,
        features: p.slug === PLAN_SLUGS.PLUS ? PLUS_FEATURES : PRO_FEATURES,
        highlight: p.slug === PLAN_SLUGS.PRO,
      }));
  }, [plans]);

  const iniciarCheckout = async (targetSlug) => {
    if (!barbeariaId) return;
    setProcessando(targetSlug);
    try {
      const { url } = await createBillingCheckout({
        barbeariaId,
        planSlug: targetSlug,
      });
      abrirEmNovaAba(url);
      setProcessando(null);
    } catch (err) {
      toast.error(err.message || 'Erro ao iniciar checkout.');
      setProcessando(null);
    }
  };

  const abrirPortal = async () => {
    if (!barbeariaId) return;
    setProcessando('portal');
    try {
      const { url } = await createBillingPortal({ barbeariaId });
      abrirEmNovaAba(url, 'Portal de cobrança aberto em nova aba.');
      setProcessando(null);
    } catch (err) {
      toast.error(err.message || 'Portal indisponível.');
      setProcessando(null);
    }
  };

  if (loading || carregandoPlanos || sincronizandoCheckout) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  const statusLabel = SUBSCRIPTION_STATUS_LABELS[planInfo?.subscription_status] || planInfo?.subscription_status;
  const temStripe = Boolean(billing?.stripe_subscription_id);

  return (
    <div className="w-full space-y-6 pb-8">
      <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${isProOrAbove(planSlug) ? 'bg-amber-500/10 text-amber-500' : 'bg-brand/10 text-brand'}`}>
            {isProOrAbove(planSlug) ? <Crown size={28} /> : <Sparkles size={28} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-text-muted">Meu plano Horza</p>
            <h1 className="text-2xl font-black text-text-base mt-1">{planNome}</h1>
            <p className="text-sm text-text-muted mt-1">
              Status: <span className="font-bold text-text-base">{statusLabel}</span>
              {billing?.current_period_end && (
                <> · Renova em <span className="font-bold">{formatData(billing.current_period_end)}</span></>
              )}
            </p>
          </div>
          {temStripe && (
            <button
              type="button"
              onClick={abrirPortal}
              disabled={processando === 'portal'}
              className="shrink-0 inline-flex items-center gap-2 bg-background border border-border-line px-4 py-2.5 rounded-xl text-sm font-bold hover:border-brand disabled:opacity-50"
            >
              {processando === 'portal' ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Gerenciar cobrança
            </button>
          )}
        </div>

        {!isProOrAbove(planSlug) && team && appts && (
          <div className="mt-6 flex flex-wrap gap-3">
            {team.limit != null && (
              <span className="inline-flex items-center gap-2 text-xs font-bold bg-background border border-border-line px-3 py-2 rounded-xl">
                <Users size={14} className="text-brand" />
                {team.usage}/{team.limit} funcionários
              </span>
            )}
            {appts.limit != null && (
              <span className="inline-flex items-center gap-2 text-xs font-bold bg-background border border-border-line px-3 py-2 rounded-xl">
                <CalendarDays size={14} className="text-brand" />
                {appts.usage}/{appts.limit} agendamentos/mês
              </span>
            )}
          </div>
        )}

        {billing?.cancel_at_period_end && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-2xl p-4 flex gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>Assinatura marcada para cancelar ao fim do período atual ({formatData(billing.current_period_end)}).</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {planCards.map((plan) => {
          const isCurrent = planSlug === plan.slug;
          const isUpgrade =
            (planSlug === PLAN_SLUGS.FREE) ||
            (planSlug === PLAN_SLUGS.PRO && plan.slug === PLAN_SLUGS.PLUS);
          const semPrice = !plan.stripe_price_id;

          return (
            <div
              key={plan.slug}
              className={`bg-surface border rounded-3xl p-6 shadow-sm flex flex-col ${
                plan.highlight ? 'border-brand ring-1 ring-brand/20' : 'border-border-line'
              } ${isCurrent ? 'opacity-95' : ''}`}
            >
              {plan.highlight && (
                <span className="self-start text-[10px] font-black uppercase tracking-wider bg-brand text-white px-2.5 py-1 rounded-lg mb-3">
                  Mais popular
                </span>
              )}
              <h2 className="text-xl font-black text-text-base">{plan.nome}</h2>
              <p className="text-sm text-text-muted mt-1 mb-4 min-h-[40px]">{plan.descricao}</p>
              <p className="text-3xl font-black text-text-base mb-1">
                {formatPrecoBRL(plan.preco_centavos)}
                <span className="text-sm font-bold text-text-muted">/mês</span>
              </p>

              <ul className="space-y-2 my-6 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-text-muted">
                    <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <span className="w-full text-center py-3 rounded-xl text-sm font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Plano atual
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!isUpgrade || semPrice || processando === plan.slug}
                  onClick={() => iniciarCheckout(plan.slug)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black bg-brand text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {processando === plan.slug ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ExternalLink size={16} />
                  )}
                  {semPrice ? 'Configure Stripe Price' : isUpgrade ? `Assinar ${plan.nome}` : 'Plano inferior'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-black text-text-base mb-1">Compare os planos</h2>
        <p className="text-sm text-text-muted mb-6">Visão geral do que cada plano inclui. A validação completa virá nos testes passo a passo.</p>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-border-line text-left">
              <th className="py-3 pr-4 font-black text-text-muted">Recurso</th>
              <th className="py-3 px-3 font-black text-text-muted text-center">Free</th>
              <th className="py-3 px-3 font-black text-brand text-center">Pro</th>
              <th className="py-3 pl-3 font-black text-violet-600 text-center">Plus</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_COMPARISON.map((row) => (
              <tr key={row.feature} className="border-b border-border-line/60 last:border-0">
                <td className="py-3 pr-4 font-bold text-text-base">{row.feature}</td>
                <td className="py-3 px-3 text-center text-text-muted">{row.free}</td>
                <td className="py-3 px-3 text-center text-text-base">{row.pro}</td>
                <td className="py-3 pl-3 text-center text-text-base">{row.plus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-text-base">Faturas da assinatura</h2>
            <p className="text-sm text-text-muted mt-1">
              Histórico de cobrança Horza (Stripe Billing). Estrutura pronta — dados reais após integração completa.
            </p>
          </div>
          {temStripe && (
            <button
              type="button"
              onClick={abrirPortal}
              disabled={processando === 'portal'}
              className="shrink-0 inline-flex items-center gap-2 bg-background border border-border-line px-4 py-2.5 rounded-xl text-sm font-bold hover:border-brand disabled:opacity-50"
            >
              {processando === 'portal' ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
              Ver faturas no Stripe
            </button>
          )}
        </div>

        {temStripe ? (
          <div className="border border-dashed border-border-line rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 gap-2 bg-background px-4 py-3 text-[10px] font-black uppercase text-text-muted tracking-wider">
              <span>Referência</span>
              <span>Período</span>
              <span>Valor</span>
              <span>Status</span>
            </div>
            <div className="px-4 py-6 text-center text-sm text-text-muted">
              {billing?.current_period_end ? (
                <p>
                  Período atual até <strong className="text-text-base">{formatData(billing.current_period_end)}</strong>.
                  {' '}Use &quot;Gerenciar cobrança&quot; para PDFs e histórico completo no portal Stripe.
                </p>
              ) : (
                <p>Nenhuma fatura listada localmente ainda. O portal Stripe concentra recibos e notas fiscais.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-border-line rounded-2xl p-8 text-center text-sm text-text-muted">
            Assine Horza Pro ou Plus para ver faturas da plataforma aqui.
          </div>
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-700">
        <p className="font-bold mb-1">Horza cobra a assinatura da plataforma</p>
        <p className="opacity-90">
          Esta página é para o plano Horza (Free / Pro / Plus). Pagamentos dos clientes da barbearia continuam em{' '}
          <strong>Pagamentos</strong>, via Stripe Connect ou PIX.
        </p>
        <p className="opacity-80 mt-2 text-xs">
          Administradores master podem alterar o plano manualmente em{' '}
          <strong>/master</strong> (override para testes e suporte).
        </p>
      </div>
    </div>
  );
}
