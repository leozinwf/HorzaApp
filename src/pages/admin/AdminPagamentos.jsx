import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { CreditCard, Wallet, QrCode, CheckCircle2, AlertCircle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import ProSection from '../../components/shared/ProSection';
import { GorjetaDigitalBlock } from '../../components/shared/ProModuleBlocks';
import { FEATURE_KEYS } from '../../constants/planFeatures';

export default function AdminPagamentos() {
  const { slug } = useParams();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [dadosPagamento, setDadosPagamento] = useState({
    gateway_pagamento: 'nenhum',
    chave_pix: ''
  });

  useEffect(() => {
    if (profile?.barbearia_id) {
      buscarConfiguracoes();
    }
  }, [profile]);

  const buscarConfiguracoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('barbearias')
        .select('gateway_pagamento, chave_pix')
        .eq('id', profile.barbearia_id)
        .single();

      if (error) throw error;
      if (data) {
        setDadosPagamento({
          gateway_pagamento: data.gateway_pagamento || 'nenhum',
          chave_pix: data.chave_pix || ''
        });
      }
    } catch (err) {
      console.error('Erro ao buscar integrações:', err);
    } finally {
      setLoading(false);
    }
  };

  const conectarStripe = () => {
    if (dadosPagamento.gateway_pagamento === 'stripe') {
      alert('A funcionalidade de desconectar pode ser feita diretamente no painel da Stripe.');
      return;
    }

    setSalvando(true);

    const clientId = import.meta.env.VITE_STRIPE_CLIENT_ID || 'org_6UwAv1Cg9PgXfMjbNSqb6NU';
    const redirectUri = `${window.location.origin}/${slug}/admin/pagamentos/callback`;
    const state = profile.barbearia_id;
    const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = stripeAuthUrl;
  };

  const atualizarGateway = (gateway) => {
    if (gateway === 'stripe') {
      conectarStripe();
      return;
    }

    if (gateway === 'mercadopago') {
      alert('Integração com Mercado Pago em breve.');
    }
  };

  const salvarChavePix = async () => {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('barbearias')
        .update({ chave_pix: dadosPagamento.chave_pix })
        .eq('id', profile.barbearia_id);

      if (error) throw error;
      alert('Chave PIX atualizada com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar PIX:', err);
      alert('Erro ao salvar chave PIX.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-6">
      
      {/* CABEÇALHO */}
      <div className="bg-surface p-6 rounded-3xl border border-border-line shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand/10 p-2.5 rounded-xl text-brand">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-text-base">Pagamentos & Cobranças</h1>
            <p className="text-sm text-text-muted mt-0.5">Conecte gateways para cobrar antecipadamente e reduzir faltas.</p>
          </div>
        </div>
      </div>

      {/* AVISO IMPORTANTE */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3 text-blue-600">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">Como funcionam os pagamentos?</p>
          <p className="opacity-90">
            Ao conectar um gateway de pagamento, você permite que seus clientes paguem no ato do agendamento (cartão ou PIX automático). O dinheiro cai direto na sua conta do Mercado Pago ou Stripe.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD STRIPE */}
        <div className={`bg-surface border rounded-3xl p-6 relative overflow-hidden transition-all ${
          dadosPagamento.gateway_pagamento === 'stripe' ? 'border-[#635BFF] shadow-md shadow-[#635BFF]/10' : 'border-border-line shadow-sm hover:border-[#635BFF]/50'
        }`}>
          <div className="flex justify-between items-start mb-6">
            <div className="bg-[#635BFF]/10 p-3 rounded-2xl">
              <CreditCard size={28} color="#635BFF" />
            </div>
            {dadosPagamento.gateway_pagamento === 'stripe' && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#635BFF]/10 text-[#635BFF] px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={14} /> Conectado
              </span>
            )}
          </div>
          
          <h2 className="text-xl font-black text-text-base mb-1">Stripe</h2>
          <p className="text-sm text-text-muted mb-6 h-10">Aceite pagamentos com Cartão de Crédito, Apple Pay e Google Pay do mundo todo.</p>
          
          <button 
            onClick={() => atualizarGateway('stripe')}
            disabled={salvando}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
              dadosPagamento.gateway_pagamento === 'stripe' 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                : 'bg-[#635BFF] text-white hover:brightness-110'
            }`}
          >
            {dadosPagamento.gateway_pagamento === 'stripe' ? 'Desconectar Stripe' : <><LinkIcon size={16} /> Conectar Conta Stripe</>}
          </button>
        </div>

        {/* CARD MERCADO PAGO */}
        <div className={`bg-surface border rounded-3xl p-6 relative overflow-hidden transition-all ${
          dadosPagamento.gateway_pagamento === 'mercadopago' ? 'border-[#009EE3] shadow-md shadow-[#009EE3]/10' : 'border-border-line shadow-sm hover:border-[#009EE3]/50'
        }`}>
          <div className="flex justify-between items-start mb-6">
            <div className="bg-[#009EE3]/10 p-3 rounded-2xl">
              <Wallet size={28} color="#009EE3" />
            </div>
            {dadosPagamento.gateway_pagamento === 'mercadopago' && (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-[#009EE3]/10 text-[#009EE3] px-3 py-1.5 rounded-lg">
                <CheckCircle2 size={14} /> Conectado
              </span>
            )}
          </div>
          
          <h2 className="text-xl font-black text-text-base mb-1">Mercado Pago</h2>
          <p className="text-sm text-text-muted mb-6 h-10">Aceite pagamentos com Cartão de Crédito e PIX automático com taxas locais.</p>
          
          <button 
            onClick={() => atualizarGateway('mercadopago')}
            disabled={salvando}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
              dadosPagamento.gateway_pagamento === 'mercadopago' 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                : 'bg-[#009EE3] text-white hover:brightness-110'
            }`}
          >
            {dadosPagamento.gateway_pagamento === 'mercadopago' ? 'Desconectar Mercado Pago' : <><LinkIcon size={16} /> Conectar Mercado Pago</>}
          </button>
        </div>
      </div>

      {/* CARD PIX MANUAL */}
      <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-500">
            <QrCode size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-text-base">PIX Direto (Manual)</h2>
            <p className="text-sm text-text-muted">Apresente a sua chave para os clientes transferirem manualmente.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 block">Sua Chave PIX</label>
            <input
              type="text"
              value={dadosPagamento.chave_pix}
              onChange={(e) => setDadosPagamento({...dadosPagamento, chave_pix: e.target.value})}
              placeholder="CPF, CNPJ, E-mail ou Telefone"
              className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="sm:pt-6">
            <button 
              onClick={salvarChavePix}
              disabled={salvando}
              className="w-full sm:w-auto bg-brand text-white px-6 py-3 rounded-xl text-sm font-bold hover:brightness-95 transition-all disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Chave PIX'}
            </button>
          </div>
        </div>
      </div>

      <ProSection
        featureKey={FEATURE_KEYS.GORJETA_DIGITAL}
        title="Gorjeta Digital"
        description="PIX ou cartão após o atendimento — Horza Pro."
        overlay
      >
        <GorjetaDigitalBlock />
      </ProSection>

    </div>
  );
}