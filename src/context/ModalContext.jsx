import { createContext, useContext, useState } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';

const ModalContext = createContext({});

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({ 
    isOpen: false, 
    type: 'alert', // 'alert' ou 'confirm'
    title: '', 
    message: '', 
    onConfirm: null 
  });

  const showAlert = (title, message) => {
    setModal({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  };

  const showConfirm = (title, message, onConfirmCallback) => {
    setModal({ isOpen: true, type: 'confirm', title, message, onConfirm: onConfirmCallback });
  };

  const closeModal = () => setModal({ ...modal, isOpen: false });

  const handleConfirm = () => {
    if (modal.onConfirm) modal.onConfirm();
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* A CAIXA DA MODAL RENDERIZADA GLOBALMENTE */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            
            {/* Cabeçalho e Ícone */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${modal.type === 'confirm' ? 'bg-brand/10 text-brand' : 'bg-blue-500/10 text-blue-500'}`}>
                {modal.type === 'confirm' ? <AlertCircle size={28} /> : <Info size={28} />}
              </div>
              <button onClick={closeModal} className="text-text-muted hover:text-text-base cursor-pointer bg-background p-1.5 rounded-full">
                <X size={20}/>
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-text-base mb-2">{modal.title}</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">{modal.message}</p>
            
            {/* Botões */}
            <div className="flex gap-3">
              {modal.type === 'confirm' && (
                <button 
                  onClick={closeModal} 
                  className="flex-1 p-3 rounded-xl bg-background border border-border-line text-text-base font-bold hover:bg-border-line transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={handleConfirm} 
                className={`flex-1 p-3 rounded-xl text-white font-bold transition-colors cursor-pointer ${modal.type === 'confirm' ? 'bg-brand hover:bg-brand-hover' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                {modal.type === 'confirm' ? 'Confirmar' : 'Entendi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

// Hook personalizado para usar a modal em qualquer tela
export const useModal = () => useContext(ModalContext);