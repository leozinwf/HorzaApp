import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Headphones, Calendar, Megaphone, Sparkles, Building2 } from 'lucide-react';
import {
  fetchMyNotifications,
  formatNotificationDate,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_LABELS,
  syncUpcomingAppointmentNotifications,
} from '../../services/notificationService';

const TYPE_ICONS = {
  agendamento: Calendar,
  suporte: Headphones,
  barbearia: Building2,
  novidade: Megaphone,
  sistema: Sparkles,
};

export default function NotificacoesSino({ className = '' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const unread = items.filter((n) => !n.lida).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await syncUpcomingAppointmentNotifications();
      const data = await fetchMyNotifications();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) load();
  };

  const handleRead = async (item) => {
    if (!item.lida) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, lida: true } : n)));
      } catch {
        /* ignore */
      }
    }
    if (item.tipo === 'suporte') setOpen(false);
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2.5 rounded-xl text-text-muted hover:text-brand hover:bg-brand/5 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,380px)] bg-surface border border-border-line rounded-2xl shadow-2xl z-[80] overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-line bg-background/50">
            <p className="font-black text-sm text-text-base">Notificações</p>
            {unread > 0 && (
              <button type="button" onClick={handleReadAll} className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                <Check size={14} /> Marcar todas lidas
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,420px)] horza-scroll overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-10">Carregando...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-10 px-4">Nenhuma notificação por enquanto.</p>
            ) : (
              <ul className="divide-y divide-border-line">
                {items.map((item) => {
                  const Icon = TYPE_ICONS[item.tipo] || Sparkles;
                  return (
                    <li key={item.id}>
                      {item.tipo === 'suporte' ? (
                        <Link
                          to="/area-cliente"
                          onClick={() => handleRead(item)}
                          className={`block px-4 py-3 hover:bg-background transition-colors ${!item.lida ? 'bg-brand/5' : ''}`}
                        >
                          <NotificationRow item={item} Icon={Icon} />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRead(item)}
                          className={`w-full text-left px-4 py-3 hover:bg-background transition-colors ${!item.lida ? 'bg-brand/5' : ''}`}
                        >
                          <NotificationRow item={item} Icon={Icon} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ item, Icon }) {
  return (
    <div className="flex gap-3">
      <div className={`shrink-0 p-2 rounded-xl border ${NOTIFICATION_TYPE_COLORS[item.tipo] || NOTIFICATION_TYPE_COLORS.sistema}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-black truncate ${item.lida ? 'text-text-muted' : 'text-text-base'}`}>{item.titulo}</p>
          <span className="text-[10px] text-text-muted shrink-0">{formatNotificationDate(item.created_at)}</span>
        </div>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{item.mensagem}</p>
        <span className="inline-block mt-1.5 text-[10px] font-black uppercase text-text-muted">
          {NOTIFICATION_TYPE_LABELS[item.tipo] || item.tipo}
        </span>
      </div>
    </div>
  );
}
