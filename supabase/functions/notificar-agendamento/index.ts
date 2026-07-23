import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIMEZONE = 'America/Sao_Paulo';

function soDigitos(valor: string | null | undefined) {
  return (valor || '').replace(/\D/g, '');
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function refreshGoogleToken(tokens: Record<string, unknown>) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret || !tokens.refresh_token) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: String(tokens.refresh_token),
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) return null;

  return {
    ...tokens,
    access_token: data.access_token,
    expiry: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

async function criarEventoGoogleCalendar(
  tokens: Record<string, unknown>,
  evento: { titulo: string; descricao: string; local: string; inicio: string; fim: string },
) {
  let ativos = tokens;
  if (!ativos.access_token) return { ok: false, tokens: ativos };

  if (ativos.expiry && Number(ativos.expiry) < Date.now() + 60000) {
    const renovados = await refreshGoogleToken(ativos);
    if (!renovados?.access_token) return { ok: false, tokens: ativos };
    ativos = renovados;
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ativos.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: evento.titulo,
      description: evento.descricao,
      location: evento.local,
      start: { dateTime: evento.inicio, timeZone: TIMEZONE },
      end: { dateTime: evento.fim, timeZone: TIMEZONE },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Google Calendar error:', err);
    return { ok: false, tokens: ativos };
  }

  return { ok: true, tokens: ativos };
}

async function enviarWhatsApp(telefone: string, mensagem: string) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  if (!token || !phoneId || !telefone) return false;

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'text',
      text: { body: mensagem },
    }),
  });

  if (!res.ok) {
    console.error('WhatsApp API error:', await res.text());
    return false;
  }

  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { agendamento_id } = await req.json();
    if (!agendamento_id) throw new Error('agendamento_id obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: ag, error } = await supabase
      .from('agendamentos')
      .select(`
        id, data_hora, nome_cliente_avulso, whatsapp_cliente_avulso,
        barbearias ( nome, telefone, rua, numero, bairro, cidade, estado ),
        barbeiros:usuarios!agendamentos_barbeiro_id_fkey ( id, nome, whatsapp, google_calendar_token, email ),
        clientes:usuarios!agendamentos_cliente_id_fkey ( nome, whatsapp, email ),
        servicos ( nome_servico, duracao_minutos, preco )
      `)
      .eq('id', agendamento_id)
      .single();

    if (error || !ag) throw error || new Error('Agendamento não encontrado');

    const clienteNome = ag.nome_cliente_avulso || ag.clientes?.nome || 'Cliente';
    const clienteEmail = ag.clientes?.email || '—';
    const clienteWhatsapp = ag.whatsapp_cliente_avulso || ag.clientes?.whatsapp || '—';
    const dataFmt = formatarDataHora(ag.data_hora);

    const mensagem = [
      '🪒 *Novo agendamento — Horza App*',
      '',
      `🏪 ${ag.barbearias?.nome || 'Barbearia'}`,
      `👤 Cliente: ${clienteNome}`,
      `📧 E-mail: ${clienteEmail}`,
      `📱 Telefone: ${clienteWhatsapp}`,
      `📅 Data/hora: ${dataFmt}`,
      `✂️ Serviço: ${ag.servicos?.nome_servico || '—'}`,
      `💈 Profissional: ${ag.barbeiros?.nome || '—'}`,
    ].join('\n');

    const telefoneBarbeiro = soDigitos(ag.barbeiros?.whatsapp || ag.barbearias?.telefone);
    const telefoneIntl = telefoneBarbeiro.startsWith('55') ? telefoneBarbeiro : `55${telefoneBarbeiro}`;

    let whatsappEnviado = false;
    if (telefoneIntl.length >= 12) {
      whatsappEnviado = await enviarWhatsApp(telefoneIntl, mensagem);
    }

    let calendarCriado = false;
    let tokensAtualizados: Record<string, unknown> | null = null;

    if (ag.barbeiros?.google_calendar_token) {
      try {
        let tokens = JSON.parse(ag.barbeiros.google_calendar_token);
        const inicio = new Date(ag.data_hora);
        const fim = new Date(inicio.getTime() + (ag.servicos?.duracao_minutos || 30) * 60000);
        const endereco = [ag.barbearias?.rua, ag.barbearias?.numero, ag.barbearias?.bairro, ag.barbearias?.cidade]
          .filter(Boolean)
          .join(', ');

        const resultado = await criarEventoGoogleCalendar(tokens, {
          titulo: `${ag.servicos?.nome_servico} — ${clienteNome}`,
          descricao: mensagem,
          local: endereco || ag.barbearias?.nome || '',
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
        });

        calendarCriado = resultado.ok;
        tokensAtualizados = resultado.tokens;

        if (tokensAtualizados && tokensAtualizados !== tokens) {
          await supabase
            .from('usuarios')
            .update({ google_calendar_token: JSON.stringify(tokensAtualizados) })
            .eq('id', ag.barbeiros.id);
        }
      } catch (e) {
        console.error('Erro Google Calendar:', e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        whatsapp_enviado: whatsappEnviado,
        calendar_criado: calendarCriado,
        whatsapp_fallback_url: telefoneIntl.length >= 12
          ? `https://wa.me/${telefoneIntl}?text=${encodeURIComponent(mensagem)}`
          : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
