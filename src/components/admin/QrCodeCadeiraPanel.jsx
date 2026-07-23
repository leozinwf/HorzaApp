import { useEffect, useState } from 'react';
import { Printer, QrCode, Scissors } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

function qrImageUrl(data, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=12`;
}

export default function QrCodeCadeiraPanel({ barbeariaId, slug, nomeBarbearia }) {
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    if (!barbeariaId) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('usuarios')
          .select('id, nome, role, exibe_na_agenda')
          .eq('barbearia_id', barbeariaId)
          .in('role', ['admin', 'gerente', 'funcionario'])
          .eq('ativo', true)
          .order('nome');
        const lista = (data || []).filter((u) => u.exibe_na_agenda !== false);
        setEquipe(lista);
        if (lista.length) setSelecionado(lista[0]);
      } finally {
        setLoading(false);
      }
    })();
  }, [barbeariaId]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const linkAgendar = selecionado
    ? `${baseUrl}/${slug}/agendar?barbeiro=${selecionado.id}`
    : `${baseUrl}/${slug}/agendar`;

  const imprimir = () => {
    const janela = window.open('', '_blank');
    if (!janela) return;
    janela.document.write(`
      <!DOCTYPE html><html><head><title>QR ${nomeBarbearia}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 24px; }
        img { width: 280px; height: 280px; }
        h1 { font-size: 20px; margin: 16px 0 8px; }
        p { color: #666; font-size: 14px; }
      </style></head><body>
        <img src="${qrImageUrl(linkAgendar, 400)}" alt="QR Code" />
        <h1>${nomeBarbearia}</h1>
        <p>${selecionado ? `Profissional: ${selecionado.nome}` : 'Agende online'}</p>
        <p style="font-size:12px;word-break:break-all;">${linkAgendar}</p>
        <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    janela.document.close();
  };

  if (loading) {
    return <p className="text-sm text-text-muted py-6">Carregando equipe...</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        Imprima e cole na cadeira. O cliente escaneia e agenda direto com o profissional escolhido.
      </p>

      {equipe.length > 0 && (
        <div>
          <label className="block text-xs font-black uppercase text-text-muted mb-2">Profissional da cadeira</label>
          <div className="flex flex-wrap gap-2">
            {equipe.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelecionado(p)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  selecionado?.id === p.id ? 'bg-brand text-white border-brand' : 'border-border-line text-text-muted hover:border-brand'
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center bg-background border border-border-line rounded-2xl p-6">
        <div className="flex justify-center">
          <img src={qrImageUrl(linkAgendar)} alt="QR Code agendamento" className="rounded-xl border border-border-line bg-white p-2 max-w-[280px] w-full" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-brand font-black">
            <QrCode size={20} /> QR de agendamento
          </div>
          <p className="text-sm font-bold text-text-base">{nomeBarbearia}</p>
          {selecionado && (
            <p className="text-sm text-text-muted flex items-center gap-1">
              <Scissors size={14} /> {selecionado.nome}
            </p>
          )}
          <p className="text-xs text-text-muted break-all">{linkAgendar}</p>
          <button
            type="button"
            onClick={imprimir}
            className="inline-flex items-center gap-2 bg-brand text-white px-5 py-3 rounded-xl text-sm font-black hover:brightness-110"
          >
            <Printer size={16} /> Imprimir QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
