import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Headphones, Loader2, Mail, Send, User } from 'lucide-react';
import {
  fetchAllSupportTickets,
  fetchTicketMessages,
  masterReplyTicket,
  updateTicketStatus,
  SUPPORT_CATEGORIES,
  SUPPORT_STATUS_LABELS,
  getSupportStatusClass,
} from '../../services/supportService';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MasterSuporteSection() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllSupportTickets();
      setTickets(data);
      setSelectedId((prev) => prev || data[0]?.id || null);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    setLoadingMessages(true);
    try {
      const data = await fetchTicketMessages(ticketId);
      setMessages(data);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar mensagens.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  const selected = tickets.find((t) => t.id === selectedId);

  const filtered = tickets.filter((t) => {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'nao_lidos') return !t.cliente_leu && t.ultima_resposta_master;
    return t.status === statusFilter;
  });

  const handleReply = async (e) => {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await masterReplyTicket({ ticketId: selectedId, mensagem: reply.trim() });
      toast.success('Resposta enviada.');
      setReply('');
      await loadMessages(selectedId);
      await loadTickets();
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar resposta.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedId) return;
    try {
      await updateTicketStatus(selectedId, status);
      toast.success('Status atualizado.');
      await loadTickets();
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar status.');
    }
  };

  const categoryLabel = (value) =>
    SUPPORT_CATEGORIES.find((c) => c.value === value)?.label || value;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-text-base flex items-center gap-2">
            <Headphones size={22} className="text-brand" /> Suporte
          </h2>
          <p className="text-sm text-text-muted mt-1">Tickets enviados pelo formulário público ou clientes logados.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-border-line bg-background px-4 py-2.5 text-sm font-bold outline-none focus:border-brand"
        >
          <option value="todos">Todos</option>
          <option value="aberto">Abertos</option>
          <option value="em_andamento">Em andamento</option>
          <option value="respondido">Respondidos</option>
          <option value="fechado">Fechados</option>
          <option value="nao_lidos">Aguardando leitura do cliente</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border-line rounded-2xl p-10 text-center text-text-muted">
          Nenhum ticket encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,340px)_1fr] gap-5 min-h-[420px]">
          <div className="bg-surface border border-border-line rounded-2xl overflow-hidden flex flex-col max-h-[520px]">
            <div className="px-4 py-3 border-b border-border-line text-xs font-black uppercase text-text-muted">
              {filtered.length} ticket(s)
            </div>
            <ul className="horza-scroll overflow-y-auto flex-1 divide-y divide-border-line">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors ${
                      selectedId === t.id ? 'bg-brand/10 border-l-4 border-brand' : 'hover:bg-background'
                    }`}
                  >
                    <p className="font-black text-sm text-text-base truncate">{t.assunto}</p>
                    <p className="text-xs text-text-muted mt-0.5 truncate">{t.nome} · {t.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${getSupportStatusClass(t.status)}`}>
                        {SUPPORT_STATUS_LABELS[t.status] || t.status}
                      </span>
                      {!t.cliente_leu && t.ultima_resposta_master && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-brand/15 text-brand">
                          Nova resposta
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface border border-border-line rounded-2xl flex flex-col min-h-[420px]">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-text-muted p-8">Selecione um ticket</div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-border-line space-y-2">
                  <h3 className="font-black text-lg text-text-base">{selected.assunto}</h3>
                  <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><User size={12} /> {selected.nome}</span>
                    <span className="flex items-center gap-1"><Mail size={12} /> {selected.email}</span>
                    <span>{categoryLabel(selected.categoria)}</span>
                    <span>{formatDate(selected.created_at)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['aberto', 'em_andamento', 'respondido', 'fechado'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStatusChange(s)}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border transition-colors ${
                          selected.status === s
                            ? getSupportStatusClass(s)
                            : 'border-border-line text-text-muted hover:border-brand'
                        }`}
                      >
                        {SUPPORT_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 horza-scroll overflow-y-auto p-5 space-y-4 min-h-[200px]">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand" size={24} /></div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                          m.autor_tipo === 'master'
                            ? 'ml-auto bg-brand text-white'
                            : 'mr-auto bg-background border border-border-line text-text-base'
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase opacity-70 mb-1">
                          {m.autor_tipo === 'master' ? 'Equipe Horza' : 'Cliente'} · {formatDate(m.created_at)}
                        </p>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.mensagem}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleReply} className="p-4 border-t border-border-line flex gap-2">
                  <textarea
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Escreva sua resposta..."
                    className="flex-1 rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand resize-none min-h-[52px]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="shrink-0 self-end bg-brand text-white px-4 py-3 rounded-xl font-black text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Enviar
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
