import { Calendar, Download, Mail } from 'lucide-react';
import {
  montarEventoAgendamento,
  urlGoogleCalendar,
  urlOutlookCalendar,
  baixarIcs,
} from '../../utils/calendario';

export default function AdicionarCalendario({
  barbearia,
  servico,
  barbeiro,
  data,
  horario,
  clienteNome,
  clienteEmail,
  clienteWhatsapp,
}) {
  if (!data || !horario) return null;

  const evento = montarEventoAgendamento({
    barbearia,
    servico,
    barbeiro,
    data,
    horario,
    clienteNome,
    clienteEmail,
    clienteWhatsapp,
  });

  const abrir = (url) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="space-y-3">
      <p className="text-xs font-black text-text-muted uppercase tracking-wider text-left">
        Adicionar à sua agenda
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => abrir(urlGoogleCalendar(evento))}
          className="flex items-center justify-center gap-2 bg-surface border border-border-line py-3 px-3 rounded-xl text-sm font-bold hover:border-brand transition-colors cursor-pointer"
        >
          <Calendar size={16} className="text-brand" /> Google Calendar
        </button>
        <button
          type="button"
          onClick={() => abrir(urlOutlookCalendar(evento))}
          className="flex items-center justify-center gap-2 bg-surface border border-border-line py-3 px-3 rounded-xl text-sm font-bold hover:border-brand transition-colors cursor-pointer"
        >
          <Mail size={16} className="text-blue-500" /> Outlook
        </button>
        <button
          type="button"
          onClick={() => baixarIcs(evento)}
          className="flex items-center justify-center gap-2 bg-surface border border-border-line py-3 px-3 rounded-xl text-sm font-bold hover:border-brand transition-colors cursor-pointer"
        >
          <Download size={16} className="text-text-muted" /> Celular / Apple
        </button>
      </div>
      <p className="text-[10px] text-text-muted text-left leading-relaxed">
        O arquivo .ics abre no calendário nativo do iPhone, Samsung e outros apps.
      </p>
    </div>
  );
}
