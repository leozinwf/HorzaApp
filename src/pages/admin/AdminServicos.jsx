import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Scissors, Plus, Trash2, Clock, Check } from 'lucide-react';

export default function AdminServicos() {
  const { profile } = useAuth();
  
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados do Formulário
  const [novoServicoNome, setNovoServicoNome] = useState('');
  const [novoServicoPreco, setNovoServicoPreco] = useState('');
  const [novoServicoDuracao, setNovoServicoDuracao] = useState('30');

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
      setServicos(data || []);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarServico = async (e) => {
    e.preventDefault();
    if (!novoServicoNome || !novoServicoPreco) return;

    try {
      const { error } = await supabase.from('servicos').insert([
        {
          barbearia_id: profile.barbearia_id,
          nome_servico: novoServicoNome,
          preco: parseFloat(novoServicoPreco),
          duracao_minutos: parseInt(novoServicoDuracao)
        }
      ]);

      if (error) throw error;

      // Limpa os campos após salvar
      setNovoServicoNome('');
      setNovoServicoPreco('');
      setNovoServicoDuracao('30');
      
      buscarServicos();
      alert('Serviço cadastrado com sucesso!');
    } catch (err) {
      alert('Erro ao cadastrar serviço: ' + err.message);
    }
  };

  const handleDeletarServico = async (id) => {
    if (!confirm('Tem certeza de que deseja remover este serviço? Ele deixará de aparecer no aplicativo dos clientes.')) return;
    
    try {
      const { error } = await supabase.from('servicos').delete().eq('id', id);
      if (error) throw error;
      
      buscarServicos();
    } catch (err) {
      alert('Erro ao deletar: ' + err.message);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-base">Serviços & Preços</h1>
        <p className="text-sm text-text-muted">Monte o seu catálogo de cortes e defina os tempos de atendimento.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA 1: Formulário de Cadastro */}
        <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm h-fit">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text-base">
            <Plus size={20} className="text-brand" /> Novo Serviço
          </h2>
          
          <form onSubmit={handleAdicionarServico} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome do Serviço</label>
              <input 
                required 
                type="text" 
                value={novoServicoNome} 
                onChange={(e) => setNovoServicoNome(e.target.value)} 
                className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base" 
                placeholder="Ex: Corte Degradê" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Preço (R$)</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                min="0"
                value={novoServicoPreco} 
                onChange={(e) => setNovoServicoPreco(e.target.value)} 
                className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base" 
                placeholder="Ex: 45.00" 
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Duração Estimada</label>
              <select 
                value={novoServicoDuracao} 
                onChange={(e) => setNovoServicoDuracao(e.target.value)} 
                className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base cursor-pointer"
              >
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora e 30 min</option>
                <option value="120">2 horas</option>
              </select>
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                className="w-full bg-brand hover:bg-brand-hover text-white font-bold p-3 rounded-xl text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Check size={18} /> Cadastrar Serviço
              </button>
            </div>
          </form>
        </div>

        {/* COLUNA 2: Lista de Serviços Ativos */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border-line bg-surface">
            <h2 className="text-lg font-bold flex items-center gap-2 text-text-base">
              <Scissors size={20} className="text-brand" /> Catálogo Ativo
            </h2>
          </div>
          
          {loading ? (
            <p className="p-10 text-center text-text-muted text-sm">Carregando catálogo...</p>
          ) : servicos.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center">
              <div className="bg-background p-4 rounded-full text-text-muted mb-3">
                <Scissors size={32} />
              </div>
              <p className="text-text-base font-bold">Nenhum serviço cadastrado</p>
              <p className="text-sm text-text-muted mt-1">Adicione o seu primeiro corte usando o formulário ao lado.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-line">
              {servicos.map((servico) => (
                <li key={servico.id} className="p-6 flex justify-between items-center hover:bg-background transition-colors group">
                  <div>
                    <p className="font-bold text-sm text-text-base">{servico.nome_servico}</p>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                      <Clock size={12}/> {servico.duracao_minutos} minutos
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <span className="font-extrabold text-brand text-base">
                      R$ {Number(servico.preco).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => handleDeletarServico(servico.id)} 
                      className="text-text-muted hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                      title="Excluir Serviço"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}