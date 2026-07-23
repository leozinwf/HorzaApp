import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Scissors, Clock, DollarSign, Plus, Trash2, Edit2, Coins, Sparkles } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import toast from 'react-hot-toast';
import { auditLogService } from '../../services/auditLogService';
import HistoricoMudancas from '../../components/admin/HistoricoMudancas';
import { parseMoedaBRL } from '../../utils/formatters';

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

  const logAcao = (acao, descricao, detalhes = null) =>
    auditLogService.registrar({
      barbeariaId: profile.barbearia_id,
      usuarioId: profile.id,
      usuarioNome: profile.nome,
      modulo: 'servicos',
      acao,
      descricao,
      detalhes,
    });

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
        preco: parseMoedaBRL(form.preco),
        duracao_minutos: parseInt(form.duracao_minutos, 10),
        pontos_recompensa: parseInt(form.pontos_recompensa, 10) || 0,
        descricao: form.descricao || null,
        ativo: true
      };

      if (editando) {
        const { error } = await supabase.from('servicos').update(dadosSalvar).eq('id', editando.id);
        if (error) throw error;
        setServicos(servicos.map(s => s.id === editando.id ? { ...s, ...dadosSalvar } : s));
        await logAcao('editar', `Serviço "${dadosSalvar.nome_servico}" atualizado`);
        toast.success('Serviço atualizado!');
      } else {
        const { data, error } = await supabase.from('servicos').insert([dadosSalvar]).select().single();
        if (error) throw error;
        setServicos([...servicos, data]);
        await logAcao('criar', `Serviço "${dadosSalvar.nome_servico}" cadastrado`);
        toast.success('Serviço cadastrado!');
      }

      cancelarEdicao();
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      toast.error('Erro ao processar. Verifique os dados.');
    } finally {
      setSalvando(false);
    }
  };

  const editarServico = (servico) => {
    setEditando(servico);
    setForm({
      nome_servico: servico.nome_servico,
      preco: String(servico.preco ?? ''),
      duracao_minutos: servico.duracao_minutos,
      pontos_recompensa: servico.pontos_recompensa || 0,
      descricao: servico.descricao || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletarServico = async (servico) => {
    const { count, error: countError } = await supabase
      .from('agendamentos')
      .select('*', { count: 'exact', head: true })
      .eq('servico_id', servico.id);

    if (countError) {
      toast.error('Não foi possível verificar agendamentos vinculados.');
      return;
    }

    if (count > 0) {
      toast.error(`Este serviço possui ${count} agendamento(s) vinculado(s) e não pode ser excluído.`);
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir "${servico.nome_servico}"?`)) return;

    try {
      const { error } = await supabase.from('servicos').delete().eq('id', servico.id);
      if (error) throw error;
      setServicos(servicos.filter(s => s.id !== servico.id));
      await logAcao('excluir', `Serviço "${servico.nome_servico}" excluído`);
      toast.success('Serviço excluído.');
    } catch (err) {
      toast.error('Erro ao excluir serviço. Verifique vínculos no sistema.');
    }
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setForm({ nome_servico: '', preco: '', duracao_minutos: '', pontos_recompensa: 0, descricao: '' });
  };

  if (loading) return <div className="flex justify-center p-10"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="w-full space-y-6 pb-6">
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
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><DollarSign size={12}/> Preço *</label>
            <CurrencyInput
              required
              placeholder="R$ 0,00"
              decimalsLimit={2}
              prefix="R$ "
              decimalSeparator=","
              groupSeparator="."
              value={form.preco}
              onValueChange={(value) => setForm({ ...form, preco: value })}
              className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={12}/> Duração (Minutos) *</label>
            <input required type="number" value={form.duracao_minutos} onChange={e => setForm({...form, duracao_minutos: e.target.value})} placeholder="Ex: 40" className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand transition-colors" />
          </div>

          <div className="md:col-span-2 bg-brand/5 border border-brand/20 p-4 rounded-2xl">
            <label className="block text-[10px] font-black text-brand uppercase tracking-wider mb-2 flex items-center gap-1"><Coins size={14}/> Moedas de Fidelidade Geradas</label>
            <p className="text-xs text-brand/70 font-medium mb-3">Quantas moedas o cliente ganha ao concluir este serviço?</p>
            <input required type="number" min="0" value={form.pontos_recompensa} onChange={e => setForm({...form, pontos_recompensa: e.target.value})} placeholder="Ex: 10" className="w-full bg-white dark:bg-background border-none text-sm font-bold text-brand rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand shadow-sm transition-colors" />
            <span className="block text-xs text-brand/80 mt-2 font-bold bg-brand/10 p-2.5 rounded-lg border border-brand/10">
              Sugestão: Corte (20 moedas), Barba (10 moedas), Corte e Barba (30 moedas).
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicos.map((servico) => (
          <div key={servico.id} className="bg-surface border border-border-line rounded-3xl p-5 shadow-sm hover:border-brand/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-lg text-text-base">{servico.nome_servico}</h3>
                <span className="font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg text-sm">
                  R$ {Number(servico.preco).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex gap-3 text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
                <span className="flex items-center gap-1"><Clock size={12}/> {servico.duracao_minutos} min</span>
                <span className="flex items-center gap-1 text-brand"><Sparkles size={12}/> {servico.pontos_recompensa || 0} moedas</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border-line flex justify-end gap-2">
              <button onClick={() => editarServico(servico)} className="flex items-center gap-1.5 px-3 py-2 bg-background border border-border-line rounded-xl text-sm font-bold text-text-muted hover:text-brand hover:border-brand/30 transition-colors cursor-pointer">
                <Edit2 size={16} /> Editar
              </button>
              <button onClick={() => deletarServico(servico)} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer">
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <HistoricoMudancas barbeariaId={profile?.barbearia_id} modulo="servicos" />
    </div>
  );
}
