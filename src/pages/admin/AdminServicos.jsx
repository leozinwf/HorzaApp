import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Scissors, Clock, DollarSign, Plus, Trash2, Edit2, Coins, Sparkles } from 'lucide-react';

export default function AdminServicos() {
  const { profile } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    nome_servico: '',
    preco: '',
    duracao_minutos: '',
    pontos_recompensa: 0,
    descricao: ''
  });

  useEffect(() => {
    if (profile?.barbearia_id) {
      buscarServicos();
    }
  }, [profile]);

  const buscarServicos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('barbearia_id', profile.barbearia_id)
        .order('nome_servico', { ascending: true });

      if (error) throw error;
      if (data) setServicos(data);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    
    try {
      const dadosSalvar = {
        barbearia_id: profile.barbearia_id,
        nome_servico: form.nome_servico,
        preco: parseFloat(form.preco),
        duracao_minutos: parseInt(form.duracao_minutos),
        pontos_recompensa: parseInt(form.pontos_recompensa) || 0,
        descricao: form.descricao || null,
        ativo: true
      };

      if (editando) {
        const { error } = await supabase.from('servicos').update(dadosSalvar).eq('id', editando.id);
        if (error) throw error;
        setServicos(servicos.map(s => s.id === editando.id ? { ...s, ...dadosSalvar } : s));
      } else {
        const { data, error } = await supabase.from('servicos').insert([dadosSalvar]).select().single();
        if (error) throw error;
        setServicos([...servicos, data]);
      }

      cancelarEdicao();
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      alert('Erro ao processar. Verifique os dados.');
    } finally {
      setSalvando(false);
    }
  };

  const editarServico = (servico) => {
    setEditando(servico);
    setForm({
      nome_servico: servico.nome_servico,
      preco: servico.preco,
      duracao_minutos: servico.duracao_minutos,
      pontos_recompensa: servico.pontos_recompensa || 0,
      descricao: servico.descricao || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletarServico = async (id) => {
    if (!window.confirm('Tem a certeza que deseja eliminar este serviço? Ele não aparecerá mais para os clientes.')) return;
    try {
      await supabase.from('servicos').delete().eq('id', id);
      setServicos(servicos.filter(s => s.id !== id));
    } catch (err) {
      alert('Erro ao excluir serviço.');
    }
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setForm({ nome_servico: '', preco: '', duracao_minutos: '', pontos_recompensa: 0, descricao: '' });
  };

  if (loading) return <div className="flex justify-center p-10"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full space-y-6 pb-6">
      
      {/* CABEÇALHO */}
      <div className="bg-surface p-6 rounded-3xl border border-border-line shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand/10 p-2.5 rounded-xl text-brand">
            <Scissors size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-text-base">Catálogo de Serviços</h1>
            <p className="text-sm text-text-muted mt-0.5">Cadastre o que a sua barbearia oferece e configure os ganhos.</p>
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO/EDIÇÃO */}
      <form onSubmit={handleSalvar} className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm animate-fadeIn">
        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider mb-6 flex items-center gap-2">
          {editando ? <Edit2 size={16} className="text-brand"/> : <Plus size={16} className="text-brand"/>} 
          {editando ? 'Editando Serviço' : 'Novo Serviço'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Nome do Serviço *</label>
            <input required type="text" value={form.nome_servico} onChange={e => setForm({...form, nome_servico: e.target.value})} placeholder="Ex: Corte Degradê" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand transition-colors" />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><DollarSign size={12}/> Preço (R$) *</label>
            <input required type="number" step="0.01" value={form.preco} onChange={e => setForm({...form, preco: e.target.value})} placeholder="Ex: 35.00" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand transition-colors" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={12}/> Duração (Minutos) *</label>
            <input required type="number" value={form.duracao_minutos} onChange={e => setForm({...form, duracao_minutos: e.target.value})} placeholder="Ex: 40" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand transition-colors" />
          </div>

          {/* Destaque para as Moedas */}
          <div className="md:col-span-2 bg-brand/5 border border-brand/20 p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-brand uppercase tracking-wider mb-2 flex items-center gap-1"><Coins size={14}/> Moedas de Fidelidade Geradas</label>
            <p className="text-xs text-brand/70 font-medium mb-3">Quantas moedas o cliente ganha ao concluir este serviço?</p>
            <input required type="number" min="0" value={form.pontos_recompensa} onChange={e => setForm({...form, pontos_recompensa: e.target.value})} placeholder="Ex: 10" className="w-full bg-white dark:bg-background border-none text-sm font-bold text-brand rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand shadow-sm transition-colors" />
            
            {/* ✨ HELPER TEXT COM SUGESTÕES */}
            <span className="block text-xs text-brand/80 mt-2 font-bold bg-brand/10 p-2.5 rounded-lg border border-brand/10">
              💡 Sugestão: Corte (20 moedas), Barba (10 moedas), Corte e Barba (30 moedas), Platinado (30 moedas).
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="submit" disabled={salvando} className="flex-1 bg-brand text-white py-3.5 rounded-2xl text-sm font-black shadow-md hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer">
            {salvando ? 'A processar...' : editando ? 'Atualizar Serviço' : 'Cadastrar Serviço'}
          </button>
          {editando && (
            <button type="button" onClick={cancelarEdicao} className="px-6 py-3.5 bg-background border border-border-line rounded-2xl text-sm font-bold text-text-base hover:border-brand transition-colors cursor-pointer">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA DE SERVIÇOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicos.map((servico) => (
          <div key={servico.id} className="bg-surface border border-border-line rounded-3xl p-5 shadow-sm hover:border-brand/40 transition-colors flex flex-col justify-between group">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-lg text-text-base">{servico.nome_servico}</h3>
                <span className="font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg text-sm">
                  R$ {Number(servico.preco).toFixed(2)}
                </span>
              </div>
              <div className="flex gap-3 text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                <span className="flex items-center gap-1"><Clock size={12}/> {servico.duracao_minutos} min</span>
                <span className="flex items-center gap-1 text-brand"><Sparkles size={12}/> {servico.pontos_recompensa || 0} moedas</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border-line flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={() => editarServico(servico)} className="p-2 bg-background border border-border-line rounded-xl text-text-muted hover:text-brand hover:border-brand/30 transition-colors cursor-pointer">
                <Edit2 size={16} />
              </button>
              <button onClick={() => deletarServico(servico.id)} className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}