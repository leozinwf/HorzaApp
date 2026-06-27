import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function StripeCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processando'); // processando, sucesso, erro

  useEffect(() => {
    const code = searchParams.get('code');
    const barbeariaId = searchParams.get('state');

    if (code && barbeariaId) {
      processarConexao(code, barbeariaId);
    } else {
      setStatus('erro');
    }
  }, []);

  const processarConexao = async (code, barbeariaId) => {
    try {
      // Aqui chamamos a Edge Function que tu publicaste!
      const { data, error } = await supabase.functions.invoke('conectar-stripe', {
        body: { code, barbeariaId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStatus('sucesso');
      
      // Espera 3 segundos para o utilizador ler a mensagem de sucesso e volta para a página de pagamentos
      setTimeout(() => {
        navigate('/admin/pagamentos');
      }, 3000);

    } catch (error) {
      console.error('Erro na integração com a Stripe:', error);
      setStatus('erro');
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="bg-surface border border-border-line p-8 rounded-3xl shadow-lg max-w-md w-full text-center flex flex-col items-center gap-4">
        
        {status === 'processando' && (
          <>
            <Loader2 size={48} className="text-brand animate-spin" />
            <h2 className="text-xl font-black text-text-base">A conectar à Stripe...</h2>
            <p className="text-sm text-text-muted">Por favor, não feches esta janela. Estamos a configurar os teus pagamentos com segurança.</p>
          </>
        )}

        {status === 'sucesso' && (
          <>
            <div className="bg-green-500/10 p-4 rounded-full text-green-500">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-xl font-black text-green-600">Conectado com Sucesso!</h2>
            <p className="text-sm text-text-muted">A tua barbearia já pode receber pagamentos. A redirecionar-te de volta...</p>
          </>
        )}

        {status === 'erro' && (
          <>
            <div className="bg-red-500/10 p-4 rounded-full text-red-500">
              <XCircle size={48} />
            </div>
            <h2 className="text-xl font-black text-red-600">Ops! Algo correu mal.</h2>
            <p className="text-sm text-text-muted">Não foi possível concluir a ligação com a Stripe. O código pode ter expirado.</p>
            <button 
              onClick={() => navigate('/admin/pagamentos')}
              className="mt-4 bg-brand text-white px-6 py-2 rounded-xl font-bold hover:brightness-90"
            >
              Voltar e Tentar Novamente
            </button>
          </>
        )}
      </div>
    </div>
  );
}