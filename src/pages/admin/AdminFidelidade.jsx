import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Coins, Gift, Plus, Trash2, Zap } from 'lucide-react';

export default function AdminFidelidade() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [recompensas, setRecompensas] = useState([]);
  const [novaRecompensa, setNovaRecompensa] = useState({ titulo: '', descricao: '', pontos_necessarios: '' });

  useEffect(() => {
    if (profile?.barbearia_id) carregarDados();
  }, [profile]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('recompensas_fidelidade').select('*').eq('barbearia_id', profile.barbearia_id).order('pontos_necessarios', { ascending: true });
      if (data) setRecompensas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const criarRecompensa = async (e) => {
    e.preventDefault();
    if (!novaRecompensa.titulo || !novaRecompensa.pontos_necessarios) return;
    setSalvando(true);
    try {
      const { data, error } = await supabase.from('recompensas_fidelidade').insert([{
        barbearia_id: profile.barbearia_id, titulo: novaRecompensa.titulo, descricao: novaRecompensa.descricao, pontos_necessarios: parseInt(novaRecompensa.pontos_necessarios)
      }]).select().single();

      if (error) throw error;
      setRecompensas([...recompensas, data].sort((a, b) => a.pontos_necessarios - b.pontos_necessarios));
      setNovaRecompensa({ titulo: '', descricao: '', pontos_necessarios: '' });
    } catch (err) {
      alert('Erro ao criar prêmio.');
    } finally {
      setSalvando(false);
    }
  };

  const deletarRecompensa = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este prêmio?')) return;
    try {
      await supabase.from('recompensas_fidelidade').delete().eq('id', id);
      setRecompensas(recompensas.filter(r => r.id !== id));
    } catch (err) {}
  };

  // ✨ Função para preencher templates prontos
  const preencherTemplate = (titulo, descricao, pontos) => {
    setNovaRecompensa({ titulo, descricao, pontos_necessarios: pontos });
  };

  if (loading) return <div className="flex justify-center p-10"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full space-y-6 pb-6">
      <div className="bg-surface p-6 rounded-3xl border border-border-line shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand/10 p-2.5 rounded-xl text-brand"><Coins size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-text-base">Prêmios de Fidelidade</h1>
            <p className="text-sm text-text-muted mt-0.5">Defina o que os clientes podem resgatar usando moedas. <span className="font-bold">Dica: Adicione o ganho de moedas na aba "Serviços".</span></p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm">
        
        {/* ✨ SESSÃO DE TEMPLATES RÁPIDOS */}
        <div className="mb-6 pb-6 border-b border-border-line">
          <h2 className="text-xs font-black text-text-base uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> Configuração Rápida
          </h2>
          <p className="text-xs text-text-muted mb-4">Sem ideias? Clique em uma das opções abaixo para preencher automaticamente.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => preencherTemplate('Corte Grátis', 'Resgate um corte de cabelo 100% gratuito.', '200')} className="bg-background border border-border-line text-text-base px-4 py-2 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-colors cursor-pointer shadow-sm">
              Corte Grátis (200 moedas)
            </button>
            <button type="button" onClick={() => preencherTemplate('Sobrancelha Grátis', 'Alinhamento perfeito da sua sobrancelha.', '50')} className="bg-background border border-border-line text-text-base px-4 py-2 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-colors cursor-pointer shadow-sm">
              Sobrancelha (50 moedas)
            </button>
            <button type="button" onClick={() => preencherTemplate('Pomada Modeladora', 'Leve para casa uma pomada de nossa vitrine.', '300')} className="bg-background border border-border-line text-text-base px-4 py-2 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-colors cursor-pointer shadow-sm">
              Pomada (300 moedas)
            </button>
            <button type="button" onClick={() => preencherTemplate('Desconto 50%', 'Pague apenas metade do valor do seu próximo corte.', '100')} className="bg-background border border-border-line text-text-base px-4 py-2 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-colors cursor-pointer shadow-sm">
              50% OFF (100 moedas)
            </button>
          </div>
        </div>

        <form onSubmit={criarRecompensa}>
          <h2 className="text-sm font-black text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><Plus size={16} className="text-brand"/> Adicionar Novo Prêmio</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">O que o cliente ganha?</label>
              <input required type="text" placeholder="Ex: Pomada Modeladora" value={novaRecompensa.titulo} onChange={(e) => setNovaRecompensa({...novaRecompensa, titulo: e.target.value})} className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand" />
            </div>
            <div className="md:col-span-5">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Descrição Curta</label>
              <input type="text" placeholder="Ex: Leve uma pomada matte 150g" value={novaRecompensa.descricao} onChange={(e) => setNovaRecompensa({...novaRecompensa, descricao: e.target.value})} className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-brand uppercase tracking-wider mb-2">Preço (Moedas)</label>
              <div className="flex gap-2">
                <input required type="number" min="1" placeholder="Ex: 50" value={novaRecompensa.pontos_necessarios} onChange={(e) => setNovaRecompensa({...novaRecompensa, pontos_necessarios: e.target.value})} className="w-full bg-brand/5 border border-brand/20 text-sm font-black text-brand rounded-2xl px-4 py-3 outline-none focus:border-brand" />
                <button type="submit" disabled={salvando} className="bg-brand text-white px-4 py-3 rounded-2xl font-black shadow-md hover:brightness-105 cursor-pointer disabled:opacity-50"><Plus size={20} /></button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recompensas.map((rec) => (
          <div key={rec.id} className="bg-surface border border-border-line rounded-3xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 bg-brand/5 p-6 rounded-full group-hover:scale-110 transition-transform"><Gift size={48} className="text-brand/20" /></div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-black text-lg text-text-base pr-8">{rec.titulo}</h3>
                  <button onClick={() => deletarRecompensa(rec.id)} className="text-text-muted hover:text-red-500 cursor-pointer p-1"><Trash2 size={16} /></button>
                </div>
                <p className="text-xs font-medium text-text-muted">{rec.descricao || 'Sem descrição.'}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border-line flex items-center justify-between">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Custo:</span>
                <span className="bg-brand/10 text-brand px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5"><Coins size={14} /> {rec.pontos_necessarios} moedas</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}