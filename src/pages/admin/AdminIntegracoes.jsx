import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, CheckCircle2, Link2, Unlink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  conectarGoogleCalendar,
  desconectarGoogleCalendar,
} from '../../services/agendamentoNotificacaoService';
import ProSection from '../../components/shared/ProSection';
import { WhatsAppAutomaticoBlock } from '../../components/shared/ProModuleBlocks';
import { FEATURE_KEYS } from '../../constants/planFeatures';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function AdminIntegracoes() {
  const { user, profile } = useAuth();
  const [conectado, setConectado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [gsiPronto, setGsiPronto] = useState(false);

  useEffect(() => {
    if (profile?.google_calendar_token) {
      try {
        const parsed = JSON.parse(profile.google_calendar_token);
        setConectado(!!parsed?.refresh_token || !!parsed?.access_token);
      } catch {
        setConectado(!!profile.google_calendar_token);
      }
    } else {
      setConectado(false);
    }
  }, [profile?.google_calendar_token]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    if (window.google?.accounts?.oauth2) {
      setGsiPronto(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setGsiPronto(true);
    document.body.appendChild(script);
  }, []);

  const conectarGoogle = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Configure VITE_GOOGLE_CLIENT_ID no projeto.');
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      toast.error('Google Identity ainda carregando. Tente novamente.');
      return;
    }

    setCarregando(true);

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      ux_mode: 'popup',
      callback: async (response) => {
        try {
          if (response.error) throw new Error(response.error);
          await conectarGoogleCalendar(response.code, user.id);
          setConectado(true);
          toast.success('Google Calendar conectado! Novos agendamentos cairão na sua agenda.');
          window.location.reload();
        } catch (err) {
          toast.error(err.message || 'Erro ao conectar Google Calendar');
        } finally {
          setCarregando(false);
        }
      },
    });

    client.requestCode();
  }, [user?.id]);

  const desconectarGoogle = async () => {
    setCarregando(true);
    try {
      await desconectarGoogleCalendar(user.id);
      setConectado(false);
      toast.success('Google Calendar desconectado.');
      window.location.reload();
    } catch {
      toast.error('Erro ao desconectar.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-black text-text-base">Integrações</h1>
        <p className="text-sm text-text-muted mt-1">
          Conecte sua agenda e receba avisos automáticos de novos agendamentos.
        </p>
      </header>

      <div className="bg-surface border border-border-line rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-brand/10 text-brand shrink-0">
            <Calendar size={24} />
          </div>
          <div className="flex-1">
            <h2 className="font-black text-lg text-text-base">Google Calendar</h2>
            <p className="text-sm text-text-muted mt-1">
              Ao conectar, cada novo agendamento na sua agenda será criado automaticamente no Google Calendar da sua conta.
            </p>
          </div>
        </div>

        {conectado ? (
          <div className="flex items-center gap-2 text-success text-sm font-bold bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <CheckCircle2 size={18} /> Conta Google conectada
          </div>
        ) : (
          <div className="flex items-start gap-2 text-warning text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>Nenhuma conta Google vinculada. Profissionais precisam conectar para receber eventos automaticamente.</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!conectado ? (
            <button
              type="button"
              onClick={conectarGoogle}
              disabled={carregando || !gsiPronto}
              className="inline-flex items-center gap-2 bg-brand text-white px-5 py-3 rounded-xl text-sm font-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <Link2 size={16} /> {carregando ? 'Conectando...' : 'Conectar Google Calendar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={desconectarGoogle}
              disabled={carregando}
              className="inline-flex items-center gap-2 bg-surface border border-border-line px-5 py-3 rounded-xl text-sm font-bold hover:border-red-500 hover:text-danger cursor-pointer disabled:opacity-50"
            >
              <Unlink size={16} /> Desconectar
            </button>
          )}
        </div>

        {!GOOGLE_CLIENT_ID && (
          <p className="text-xs text-text-muted border-t border-border-line pt-4">
            Admin: adicione <code className="text-brand">VITE_GOOGLE_CLIENT_ID</code> no .env e
            {' '}
            <code className="text-brand">GOOGLE_CLIENT_ID</code> / <code className="text-brand">GOOGLE_CLIENT_SECRET</code> nos secrets do Supabase.
          </p>
        )}

        <div className="border-t border-border-line pt-5 space-y-3 text-sm text-text-muted">
          <p className="font-black text-text-base text-sm">Como configurar o Google Calendar</p>
          <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
            <li>No <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand font-bold hover:underline">Google Cloud Console</a>, crie um projeto e ative a <strong>Google Calendar API</strong>.</li>
            <li>Em Credenciais → OAuth 2.0, crie um ID do cliente tipo <strong>Aplicativo da Web</strong>.</li>
            <li>Em URIs autorizados de JavaScript, inclua <code className="text-brand">{typeof window !== 'undefined' ? window.location.origin : 'https://seu-dominio.com'}</code> e <code className="text-brand">http://localhost:5173</code> (dev).</li>
            <li>Copie o Client ID para <code className="text-brand">VITE_GOOGLE_CLIENT_ID</code> no arquivo <code>.env</code> do frontend.</li>
            <li>No Supabase → Edge Functions → Secrets, configure <code className="text-brand">GOOGLE_CLIENT_ID</code> e <code className="text-brand">GOOGLE_CLIENT_SECRET</code>.</li>
            <li>Deploy das functions: <code className="text-brand">supabase functions deploy google-calendar-auth notificar-agendamento</code></li>
            <li>Cada barbeiro/admin conecta a própria conta em Integrações. Novos agendamentos criam evento no Google Calendar dele.</li>
          </ol>
          <p className="text-xs">
            O OAuth usa escopo <code className="text-brand">calendar.events</code>. O token fica salvo em <code>usuarios.google_calendar_token</code>.
          </p>
        </div>
      </div>

      <ProSection
        featureKey={FEATURE_KEYS.WHATSAPP_AUTOMATICO}
        title="WhatsApp Automático"
        description="Confirmação, lembrete 24h e pós-atendimento — Horza Pro."
        overlay
      >
        <WhatsAppAutomaticoBlock />
      </ProSection>
    </div>
  );
}
