import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, CheckCircle2, Link2, Unlink, MessageCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  conectarGoogleCalendar,
  desconectarGoogleCalendar,
} from '../../services/agendamentoNotificacaoService';

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
    <div className="p-6 md:p-10 max-w-3xl space-y-8 pb-24">
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
      </div>

      <div className="bg-surface border border-border-line rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-green-500/10 text-success shrink-0">
            <MessageCircle size={24} />
          </div>
          <div>
            <h2 className="font-black text-lg text-text-base">WhatsApp — aviso ao barbeiro</h2>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              Quando um cliente confirma um agendamento, o sistema envia mensagem automática para o WhatsApp do profissional
              (campo WhatsApp no perfil) ou telefone da barbearia.
            </p>
            <ul className="text-sm text-text-muted mt-3 space-y-1 list-disc pl-5">
              <li>Nome, e-mail e telefone do cliente</li>
              <li>Data, horário e serviço</li>
              <li>Nome do profissional</li>
            </ul>
            <p className="text-xs text-text-muted mt-4 bg-background border border-border-line rounded-xl p-3">
              Para envio <strong>automático</strong> via API, configure no Supabase os secrets
              {' '}
              <code className="text-brand">WHATSAPP_ACCESS_TOKEN</code> e
              {' '}
              <code className="text-brand">WHATSAPP_PHONE_ID</code> (WhatsApp Cloud API / Meta).
              Sem isso, o link wa.me fica disponível como fallback interno.
            </p>
            <p className="text-xs text-brand mt-2 font-bold">
              Seu WhatsApp cadastrado: {profile?.whatsapp || '—'} (atualize em Equipe / Perfil)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
