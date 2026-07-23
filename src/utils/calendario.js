import { montarEndereco } from './endereco';
import { TIMEZONE_BR } from './formatters';

const pad = (n) => String(n).padStart(2, '0');

/** Formata Date para ICS (YYYYMMDDTHHMMSS) em horário local BR */
function formatarIcsLocal(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_BR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`;
}

/** Formata para URLs Google/Outlook (YYYYMMDDTHHMMSS) */
function formatarUrlLocal(date) {
  return formatarIcsLocal(date);
}

export function montarEventoAgendamento({
  barbearia,
  servico,
  barbeiro,
  data,
  horario,
  clienteNome,
  clienteEmail,
  clienteWhatsapp,
}) {
  const inicio = new Date(`${data}T${horario}:00-03:00`);
  const duracaoMin = servico?.duracao_minutos || 30;
  const fim = new Date(inicio.getTime() + duracaoMin * 60000);

  const titulo = `${servico?.nome_servico || 'Agendamento'} — ${barbearia?.nome || 'Barbearia'}`;
  const local = montarEndereco(barbearia) || barbearia?.nome || '';
  const descricao = [
    `Serviço: ${servico?.nome_servico || '—'}`,
    `Profissional: ${barbeiro?.nome || '—'}`,
    `Barbearia: ${barbearia?.nome || '—'}`,
    clienteNome ? `Cliente: ${clienteNome}` : null,
    clienteEmail ? `E-mail: ${clienteEmail}` : null,
    clienteWhatsapp ? `WhatsApp: ${clienteWhatsapp}` : null,
    `Valor: R$ ${Number(servico?.preco || 0).toFixed(2)}`,
  ].filter(Boolean).join('\n');

  return { titulo, local, descricao, inicio, fim, duracaoMin };
}

export function urlGoogleCalendar(evento) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.titulo,
    dates: `${formatarUrlLocal(evento.inicio)}/${formatarUrlLocal(evento.fim)}`,
    details: evento.descricao,
    location: evento.local,
    ctz: TIMEZONE_BR,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function urlOutlookCalendar(evento) {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: evento.titulo,
    body: evento.descricao,
    location: evento.local,
    startdt: evento.inicio.toISOString(),
    enddt: evento.fim.toISOString(),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function gerarArquivoIcs(evento) {
  const uid = `${Date.now()}@horza.app`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Horza App//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatarIcsLocal(new Date())}`,
    `DTSTART;TZID=${TIMEZONE_BR}:${formatarIcsLocal(evento.inicio)}`,
    `DTEND;TZID=${TIMEZONE_BR}:${formatarIcsLocal(evento.fim)}`,
    `SUMMARY:${evento.titulo.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${evento.descricao.replace(/\n/g, '\\n')}`,
    `LOCATION:${evento.local.replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Blob([ics], { type: 'text/calendar;charset=utf-8' });
}

export function baixarIcs(evento, nomeArquivo = 'agendamento-horza.ics') {
  const blob = gerarArquivoIcs(evento);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
