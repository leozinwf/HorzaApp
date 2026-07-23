import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Coins, Loader2 } from 'lucide-react';
import { masterAddCoins } from '../../services/masterService';

export default function MasterMoedasModal({ usuario, onClose, onSuccess }) {
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!usuario) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      toast.error('Informe uma quantidade válida.');
      return;
    }

    setEnviando(true);
    try {
      const novoSaldo = await masterAddCoins(usuario.id, qtd, motivo);
      toast.success(`${qtd} moeda(s) creditadas. Novo saldo: ${novoSaldo}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Erro ao creditar moedas.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-surface border border-border-line w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-base">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-brand/10 text-brand">
            <Coins size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-text-base">Dar moedas</h2>
            <p className="text-xs text-text-muted">{usuario.nome}</p>
          </div>
        </div>

        <p className="text-sm text-text-muted mb-4">
          Saldo atual: <strong className="text-text-base">{usuario.saldo_pontos || 0} moedas</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Quantidade *</label>
            <input
              required
              type="number"
              min="1"
              max="100000"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Ex: 50"
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Motivo (opcional)</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Teste, ressarcimento, promoção..."
              className="w-full rounded-xl bg-background border border-border-line px-4 py-3 text-sm font-bold outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-brand text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Coins size={18} />}
            Creditar moedas
          </button>
        </form>
      </div>
    </div>
  );
}
