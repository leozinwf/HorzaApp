import { useState } from 'react';
import { Palette, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

const PRESETS = ['#b8924a', '#2563eb', '#059669', '#dc2626', '#7c3aed', '#0f766e', '#ea580c', '#18181b'];

export default function PersonalizacaoMarcaPanel({ barbeariaId, corInicial, slug, onSaved }) {
  const [cor, setCor] = useState(corInicial || '#b8924a');
  const [salvando, setSalvando] = useState(false);

  const aplicarPreview = (hex) => {
    document.documentElement.style.setProperty('--brand', hex);
    document.documentElement.style.setProperty('--color-brand', hex);
  };

  const handleCorChange = (hex) => {
    setCor(hex);
    aplicarPreview(hex);
  };

  const handleSalvar = async () => {
    if (!barbeariaId) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('barbearias')
        .update({ cor_primaria: cor })
        .eq('id', barbeariaId);
      if (error) throw error;
      toast.success('Cor da marca salva!');
      onSaved?.(cor);
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar cor.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted">
        A cor aparece na página pública da barbearia ({slug ? `/${slug}` : 'seu link'}) e no painel da equipe.
      </p>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleCorChange(preset)}
            className={`h-10 w-10 rounded-xl border-2 transition-transform hover:scale-105 ${cor === preset ? 'border-text-base scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: preset }}
            title={preset}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div>
          <label className="block text-xs font-black uppercase text-text-muted mb-1.5">Cor personalizada</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={cor}
              onChange={(e) => handleCorChange(e.target.value)}
              className="h-12 w-16 rounded-xl border border-border-line cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={cor}
              onChange={(e) => handleCorChange(e.target.value)}
              className="w-28 rounded-xl bg-background border border-border-line px-3 py-2.5 text-sm font-bold uppercase"
            />
          </div>
        </div>

        <div className="flex-1 rounded-2xl border border-border-line p-4 bg-background min-w-[200px]">
          <p className="text-xs font-black uppercase text-text-muted mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl text-white" style={{ backgroundColor: cor }}>
              <Palette size={18} />
            </div>
            <button type="button" className="px-4 py-2 rounded-xl text-white text-sm font-black" style={{ backgroundColor: cor }}>
              Botão exemplo
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando}
        className="inline-flex items-center gap-2 bg-brand text-white px-5 py-3 rounded-xl text-sm font-black hover:brightness-110 disabled:opacity-50"
      >
        <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar cor da marca'}
      </button>
    </div>
  );
}
