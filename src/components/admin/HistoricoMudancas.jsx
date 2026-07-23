import { useEffect, useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { auditLogService } from '../../services/auditLogService';

const ACAO_CORES = {
  criar: 'bg-green-500/10 text-green-600',
  editar: 'bg-blue-500/10 text-blue-600',
  excluir: 'bg-red-500/10 text-red-500',
};

export default function HistoricoMudancas({ barbeariaId, modulo, titulo = 'Histórico de mudanças' }) {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto || !barbeariaId) return;

    const carregar = async () => {
      setCarregando(true);
      const data = await auditLogService.listar(barbeariaId, modulo);
      setItens(data);
      setCarregando(false);
    };

    carregar();
  }, [aberto, barbeariaId, modulo]);

  if (!barbeariaId) return null;

  return (
    <div className="bg-surface border border-border-line rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-background/50 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm font-black text-text-base">
          <History size={18} className="text-brand" />
          {titulo}
        </span>
        {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {aberto && (
        <div className="border-t border-border-line max-h-64 overflow-y-auto">
          {carregando ? (
            <p className="p-4 text-sm text-text-muted text-center">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="p-4 text-sm text-text-muted text-center">Nenhum registro ainda.</p>
          ) : (
            <ul className="divide-y divide-border-line">
              {itens.map((item) => (
                <li key={item.id} className="p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md mr-2 ${
                          ACAO_CORES[item.acao] || 'bg-background text-text-muted'
                        }`}
                      >
                        {item.acao}
                      </span>
                      <span className="font-bold text-text-base">{item.descricao}</span>
                      {item.usuario_nome && (
                        <p className="text-xs text-text-muted mt-1">por {item.usuario_nome}</p>
                      )}
                    </div>
                    <time className="text-[10px] text-text-muted whitespace-nowrap shrink-0">
                      {new Date(item.criado_em).toLocaleString('pt-BR')}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
