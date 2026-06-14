import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Função que checa o tamanho da tela
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Roda uma vez assim que a tela carrega
    checkMobile();

    // Fica escutando se o usuário redimensionar a janela
    window.addEventListener('resize', checkMobile);
    
    // Limpa o escutador quando o componente for desmontado
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}