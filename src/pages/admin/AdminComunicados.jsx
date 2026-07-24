import { useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, Send, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import ProSection from '../../components/shared/ProSection';
import { FEATURE_KEYS } from '../../constants/planFeatures';
import { sendBarbershopNotification } from '../../services/notificationService';

const TIPOS = [
  { value: 'barbearia', label: 'Aviso geral', icon: Megaphone },
  { value: 'novidade', label: 'Novidade', icon: Send },
  { value: 'sistema', label: 'Importante', icon: AlertTriangle },
];

export default function AdminComunicados() {
  const { profile } = useAuth();
  const { adminBarbeariaId } = useOutletContext();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState('barbearia');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminBarbeariaId) return;

    setEnviando(true);
    try {
      const count = await sendBarbershopNotification({
        barbeariaId: adminBarbeariaId,
        titulo,
        mensagem,
        tipo,
      });
      toast.success(`Notificação enviada para ${count} cliente(s) com histórico na barbearia.`);
      setTitulo('');
      setMensagem('');
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-black text-text-base">Comunicados</h1>
        <p className="text-sm text-text-muted mt-1">
          Envie avisos in-app para clientes que já agendaram na sua barbearia (fechamento, feriado, novidades).
        </p>
      </header>

      <ProSection
        featureKey={FEATURE_KEYS.NOTIFICACOES_CLIENTES}
        title="Notificações aos clientes"
        description="Disponível nos planos Horza Pro e Plus."
        overlay
      >
        <form onSubmit={handleSubmit} className="bg-surface border border-border-line rounded-3xl p-6 space-y-5">
          <div className="flex items-start gap-3 bg-brand/5 border border-brand/15 rounded-2xl p-4 text-sm text-text-muted">
            <Users size={18} className="text-brand shrink-0 mt-0.5" />
            <p>
              Exemplo: &quot;Amanhã fechamos para manutenção&quot; ou &quot;Promoção na barba esta semana&quot;.
              Os clientes veem no sino de notificações do app.
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-2">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${
                      tipo === t.value ? 'bg-brand text-white border-brand' : 'border-border-line text-text-muted'
                    }`}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Título *</label>
            <input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Fechado amanhã"
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Mensagem *</label>
            <textarea
              required
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Explique o motivo e, se quiser, quando voltam a atender..."
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl text-sm font-black hover:brightness-110 disabled:opacity-50"
          >
            <Send size={16} /> {enviando ? 'Enviando...' : 'Enviar para clientes'}
          </button>
        </form>
      </ProSection>
    </div>
  );
}
