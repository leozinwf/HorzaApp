import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Headphones, Loader2, MessageCircle, Send } from 'lucide-react';
import {
  clientReplyTicket,
  fetchMySupportTickets,
  fetchTicketMessages,
  markTicketRead,
  SUPPORT_STATUS_LABELS,
} from '../../services/supportService';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ClienteSuporteSection() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [messagesByTicket, setMessagesByTicket] = useState({});
  const [loadingMessages, setLoadingMessages] = useState({});
  const [replies, setReplies] = useState({});
  const [sending, setSending] = useState(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMySupportTickets();
      setTickets(data);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar suporte.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const unreadCount = tickets.filter((t) => !t.cliente_leu && t.ultima_resposta_master).length;

  const toggleTicket = async (ticketId) => {
    if (expandedId === ticketId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ticketId);
    if (!messagesByTicket[ticketId]) {
      setLoadingMessages((p) => ({ ...p, [ticketId]: true }));
      try {
        const msgs = await fetchTicketMessages(ticketId);
        setMessagesByTicket((p) => ({ ...p, [ticketId]: msgs }));
        const ticket = tickets.find((t) => t.id === ticketId);
        if (ticket && !ticket.cliente_leu) {
          await markTicketRead(ticketId);
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, cliente_leu: true } : t))
          );
        }
      } catch (err) {
        toast.error(err.message || 'Erro ao abrir conversa.');
      } finally {
        setLoadingMessages((p) => ({ ...p, [ticketId]: false }));
      }
    } else {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (ticket && !ticket.cliente_leu) {
        try {
          await markTicketRead(ticketId);
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? { ...t, cliente_leu: true } : t))
          );
        } catch {
          /* ignore */
        }
      }
    }
  };

  const handleReply = async (e, ticketId) => {
    e.preventDefault();
    const text = replies[ticketId]?.trim();
    if (!text) return;
    setSending(ticketId);
    try {
      await clientReplyTicket({ ticketId, mensagem: text });
      toast.success('Mensagem enviada.');
      setReplies((p) => ({ ...p, [ticketId]: '' }));
      const msgs = await fetchTicketMessages(ticketId);
      setMessagesByTicket((p) => ({ ...p, [ticketId]: msgs }));
      await loadTickets();
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar.');
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-6 space-y-4">
        <MessageCircle size={40} className="mx-auto text-text-muted opacity-40" />
        <p className="text-sm text-text-muted">Você ainda não abriu nenhum ticket de suporte.</p>
        <Link
          to="/suporte"
          className="inline-flex items-center gap-2 text-sm font-black text-brand hover:underline"
        >
          <Headphones size={16} /> Enviar mensagem ao suporte
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <p className="text-xs font-black text-brand bg-brand/10 px-3 py-2 rounded-xl">
          {unreadCount} resposta(s) nova(s) da equipe Horza
        </p>
      )}

      {tickets.map((t) => {
        const open = expandedId === t.id;
        const msgs = messagesByTicket[t.id] || [];
        return (
          <div key={t.id} className="border border-border-line rounded-2xl overflow-hidden bg-background">
            <button
              type="button"
              onClick={() => toggleTicket(t.id)}
              className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 hover:bg-surface transition-colors"
            >
              <div className="min-w-0">
                <p className="font-black text-sm text-text-base truncate">{t.assunto}</p>
                <p className="text-xs text-text-muted mt-0.5">{formatDate(t.updated_at)}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-surface border border-border-line">
                  {SUPPORT_STATUS_LABELS[t.status] || t.status}
                </span>
                {!t.cliente_leu && t.ultima_resposta_master && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-brand text-white">
                    Nova
                  </span>
                )}
              </div>
            </button>

            {open && (
              <div className="border-t border-border-line px-4 py-4 space-y-3 bg-surface/50">
                {loadingMessages[t.id] ? (
                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand" size={22} /></div>
                ) : (
                  <div className="space-y-3 max-h-64 horza-scroll overflow-y-auto">
                    {msgs.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded-xl px-3 py-2.5 text-sm max-w-[95%] ${
                          m.autor_tipo === 'master'
                            ? 'bg-brand/10 border border-brand/20 text-text-base'
                            : 'bg-background border border-border-line ml-auto'
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase text-text-muted mb-1">
                          {m.autor_tipo === 'master' ? 'Suporte Horza' : 'Você'} · {formatDate(m.created_at)}
                        </p>
                        <p className="whitespace-pre-wrap">{m.mensagem}</p>
                      </div>
                    ))}
                  </div>
                )}

                {t.status !== 'fechado' && (
                  <form onSubmit={(e) => handleReply(e, t.id)} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={replies[t.id] || ''}
                      onChange={(e) => setReplies((p) => ({ ...p, [t.id]: e.target.value }))}
                      placeholder="Continuar conversa..."
                      className="flex-1 rounded-xl bg-background border border-border-line px-3 py-2.5 text-sm font-bold outline-none focus:border-brand"
                    />
                    <button
                      type="submit"
                      disabled={sending === t.id || !replies[t.id]?.trim()}
                      className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-50"
                    >
                      {sending === t.id ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Link to="/suporte" className="inline-flex items-center gap-2 text-xs font-bold text-brand hover:underline pt-2">
        Abrir novo ticket
      </Link>
    </div>
  );
}
