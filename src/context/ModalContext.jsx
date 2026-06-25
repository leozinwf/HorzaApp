import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ModalContext = createContext({});

export const ModalProvider = ({ children }) => {
  const [alertData, setAlertData] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [confirmData, setConfirmData] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Dispara um alerta (type: 'success', 'error', 'info')
  const showAlert = useCallback((title, message, type = 'info') => {
    setAlertData({ isOpen: true, title, message, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertData(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Dispara uma confirmação com um callback
  const showConfirm = useCallback((title, message, onConfirmCallback) => {
    setConfirmData({ isOpen: true, title, message, onConfirm: () => onConfirmCallback() });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmData(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirmAccept = () => {
    if (confirmData.onConfirm) confirmData.onConfirm();
    closeConfirm();
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* 🚀 MODAL DE ALERTA (Sucesso, Erro, Info) */}
      {alertData.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button onClick={closeAlert} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-1 rounded-lg bg-background transition-colors cursor-pointer"><X size={16} /></button>
            
            <div className="text-center mt-2">
              <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
                alertData.type === 'success' ? 'bg-green-500/10 text-green-500' :
                alertData.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-brand/10 text-brand'
              }`}>
                {alertData.type === 'success' ? <CheckCircle2 size={32} /> :
                 alertData.type === 'error' ? <AlertTriangle size={32} /> : <Info size={32} />}
              </div>
              <h3 className="text-xl font-black text-text-base mb-2">{alertData.title}</h3>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">{alertData.message}</p>
              <button onClick={closeAlert} className="w-full p-3.5 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover transition-colors shadow-sm cursor-pointer">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODAL DE CONFIRMAÇÃO (Ações que requerem "Sim/Não") */}
      {confirmData.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button onClick={closeConfirm} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-1 rounded-lg bg-background transition-colors cursor-pointer"><X size={16} /></button>
            
            <div className="text-center mt-2">
              <div className="mx-auto h-16 w-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-text-base mb-2">{confirmData.title}</h3>
              <p className="text-sm text-text-muted mb-6 leading-relaxed">{confirmData.message}</p>
              <div className="flex gap-3">
                <button onClick={closeConfirm} className="flex-1 p-3.5 rounded-xl bg-background border border-border-line text-sm font-bold text-text-base hover:bg-border-line transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleConfirmAccept} className="flex-1 p-3.5 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-hover transition-colors shadow-sm cursor-pointer">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

// Hook prático para usar as modais em qualquer tela
export const useModal = () => useContext(ModalContext);