import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { useModal } from '../../context/ModalContext';
import { Box, Plus, Trash2, Edit2, X, Check, Package, AlertTriangle, DollarSign, Search, Tag } from 'lucide-react';

export default function AdminEstoque() {
  const { profile } = useAuth();
  const { showConfirm, showAlert } = useModal();

  // Estados dos Dados
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');

  // Controle de Formulário (Cadastro/Edição)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);

  // Estados dos Campos
  const [nomeProduto, setNomeProduto] = useState('');
  const [categoria, setCategoria] = useState('venda');
  const [precoVenda, setPrecoVenda] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [quantidadeAtual, setQuantidadeAtual] = useState('');
  const [quantidadeMinima, setQuantidadeMinima] = useState('5');

  useEffect(() => {
    if (profile?.barbearia_id) {
      buscarEstoque();
    }
  }, [profile]);

  const buscarEstoque = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('barbearia_id', profile.barbearia_id)
        .order('nome_produto', { ascending: true });

      if (error) throw error;
      setProdutos(data || []);
    } catch (err) {
      console.error('Erro ao buscar estoque:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarProduto = async (e) => {
    e.preventDefault();
    if (!nomeProduto) return;

    const payload = {
      nome_produto: nomeProduto,
      categoria,
      preco_venda: categoria === 'venda' ? parseFloat(precoVenda || 0) : 0,
      custo_unitario: parseFloat(custoUnitario || 0),
      quantidade_atual: parseInt(quantidadeAtual || 0),
      quantidade_minima: parseInt(quantidadeMinima || 0)
    };

    try {
      if (editingProduto) {
        const { error } = await supabase
          .from('produtos')
          .update(payload)
          .eq('id', editingProduto.id);

        if (error) throw error;
        showAlert('Sucesso', 'Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert([{ ...payload, barbearia_id: profile.barbearia_id }]);

        if (error) throw error;
        showAlert('Sucesso', 'Novo produto adicionado ao estoque!');
      }

      fecharFormulario();
      buscarEstoque();
    } catch (err) {
      showAlert('Erro', 'Erro ao salvar produto: ' + err.message);
    }
  };

  // 🚀 Ajuste rápido de quantidade (+1 ou -1) direto na tabela
  const handleAjustarQuantidade = async (produto, mudanca) => {
    const novaQtd = produto.quantidade_atual + mudanca;
    if (novaQtd < 0) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .update({ quantidade_atual: novaQtd })
        .eq('id', produto.id);

      if (error) throw error;

      // Atualiza o estado local rapidamente para uma UX instantânea
      setProdutos(produtos.map(p => p.id === produto.id ? { ...p, quantidade_atual: novaQtd } : p));
    } catch (err) {
      showAlert('Erro', 'Não foi possível alterar a quantidade: ' + err.message);
    }
  };

  const handleDeletarProduto = async (id) => {
    showConfirm('Excluir Produto', 'Tem certeza de que deseja remover este produto do estoque permanentemente?', async () => {
      try {
        const { error } = await supabase.from('produtos').delete().eq('id', id);
        if (error) throw error;
        buscarEstoque();
        showAlert('Sucesso', 'Produto removido com sucesso.');
      } catch (err) {
        showAlert('Erro', 'Falha ao deletar produto: ' + err.message);
      }
    });
  };

  const abrirEdicao = (produto) => {
    setEditingProduto(produto);
    setNomeProduto(produto.nome_produto);
    setCategoria(produto.categoria);
    setPrecoVenda(produto.preco_venda);
    setCustoUnitario(produto.custo_unitario);
    setQuantidadeAtual(produto.quantidade_atual);
    setQuantidadeMinima(produto.quantidade_minima);
    setIsFormOpen(true);
  };

  const fecharFormulario = () => {
    setEditingProduto(null);
    setIsFormOpen(false);
    setNomeProduto('');
    setCategoria('venda');
    setPrecoVenda('');
    setCustoUnitario('');
    setQuantidadeAtual('');
    setQuantidadeMinima('5');
  };

  // --- FILTROS E CÁLCULOS ---
  const produtosFiltrados = produtos.filter(p => {
    const matchesBusca = p.nome_produto.toLowerCase().includes(termoBusca.toLowerCase());
    const matchesCategoria = categoriaFiltro === 'todos' || p.categoria === categoriaFiltro;
    return matchesBusca && matchesCategoria;
  });

  const totalItensEstoque = produtos.reduce((acc, p) => acc + p.quantidade_atual, 0);
  const alertasEstoqueBaixo = produtos.filter(p => p.quantidade_atual <= p.quantidade_minima).length;
  const valorTotalEstoque = produtos.reduce((acc, p) => acc + (p.quantidade_atual * Number(p.custo_unitario || 0)), 0);

  return (
    <div className="p-6 md:p-10">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Controle de Estoque</h1>
          <p className="text-sm text-text-muted">Gerencie produtos de revenda e suprimentos de uso interno da barbearia.</p>
        </div>
        {!isFormOpen && (
          <button onClick={() => setIsFormOpen(true)} className="bg-brand hover:bg-brand-hover text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm cursor-pointer transition-colors shrink-0">
            <Plus size={18} /> Adicionar Produto
          </button>
        )}
      </header>

      {/* CARDS DE INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm flex items-center gap-4">
          <div className="bg-brand/10 p-3.5 rounded-xl text-brand"><Package size={22} /></div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Total de Itens</p>
            <p className="text-xl font-extrabold text-text-base mt-0.5">{totalItensEstoque} <span className="text-xs font-normal text-text-muted">unidades</span></p>
          </div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm flex items-center gap-4">
          <div className={`p-3.5 rounded-xl ${alertasEstoqueBaixo > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Alertas Críticos</p>
            <p className="text-xl font-extrabold text-text-base mt-0.5">{alertasEstoqueBaixo} <span className="text-xs font-normal text-text-muted">com falta</span></p>
          </div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm flex items-center gap-4">
          <div className="bg-green-500/10 p-3.5 rounded-xl text-green-500"><DollarSign size={22} /></div>
          <div>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Patrimônio em Estoque</p>
            <p className="text-xl font-extrabold text-text-base mt-0.5">R$ {valorTotalEstoque.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {isFormOpen && (
        <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm mb-8 max-w-2xl animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              {editingProduto ? <Edit2 size={20}/> : <Plus size={20}/>}
              {editingProduto ? `Editar Produto: ${editingProduto.nome_produto}` : 'Adicionar Novo Produto'}
            </h2>
            <button onClick={fecharFormulario} className="text-text-muted hover:text-text-base cursor-pointer"><X size={20} /></button>
          </div>

          <form onSubmit={handleSalvarProduto} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome do Produto</label>
                <input required type="text" value={nomeProduto} onChange={(e) => setNomeProduto(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="Ex: Pomada Modeladora Efeito Matte" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Categoria</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base">
                  <option value="venda">Para Revenda (Clientes)</option>
                  <option value="uso_interno">Uso Interno (Barbearia)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Custo Unitário (R$)</label>
                <input type="number" step="0.01" min="0" value={custoUnitario} onChange={(e) => setCustoUnitario(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Preço de Venda (R$)</label>
                <input type="number" step="0.01" min="0" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} disabled={categoria === 'uso_interno'} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand disabled:opacity-40" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Qtd Inicial</label>
                <input required type="number" min="0" value={quantidadeAtual} onChange={(e) => setQuantidadeAtual(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Aviso Estoque Mínimo</label>
                <input required type="number" min="0" value={quantidadeMinima} onChange={(e) => setQuantidadeMinima(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="5" />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border-line">
              <button type="button" onClick={fecharFormulario} className="w-1/3 rounded-xl bg-background border border-border-line p-3 text-sm font-bold text-text-muted hover:bg-border-line cursor-pointer">Cancelar</button>
              <button type="submit" className="w-2/3 bg-brand hover:bg-brand-hover text-white font-bold p-3 rounded-xl text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2">
                <Check size={18}/> Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BARRA DE PESQUISA E FILTROS DE ABAS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 bg-surface p-4 rounded-2xl border border-border-line shadow-sm">
        <div className="relative w-full md:w-80">
          <input type="text" value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs outline-none focus:border-brand text-text-base" placeholder="Buscar produto pelo nome..." />
          <Search size={16} className="absolute left-3 top-3 text-text-muted" />
        </div>

        <div className="flex gap-1 bg-background p-1 rounded-xl border border-border-line w-full md:w-auto">
          {['todos', 'venda', 'uso_interno'].map((cat) => (
            <button key={cat} onClick={() => setCategoriaFiltro(cat)} className={`flex-1 md:flex-none text-[11px] font-bold px-4 py-2 rounded-lg cursor-pointer transition-all ${categoriaFiltro === cat ? 'bg-surface text-brand shadow-xs' : 'text-text-muted hover:text-text-base'}`}>
              {cat === 'todos' ? 'Todos' : cat === 'venda' ? 'Revenda' : 'Uso Interno'}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM PRINCIPAL */}
      <div className="bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-10 text-center text-text-muted text-sm">Carregando estoque...</p>
        ) : produtosFiltrados.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="bg-background p-4 rounded-full text-text-muted mb-3"><Box size={32} /></div>
            <p className="text-text-base font-bold">Nenhum produto encontrado</p>
            <p className="text-xs text-text-muted mt-1">Refine seus filtros ou cadastre um novo item no botão acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-line bg-background text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  <th className="p-4">Produto</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Custos / Valores</th>
                  <th className="p-4 text-center">Quantidade em Estoque</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-line text-sm">
                {produtosFiltrados.map((prod) => {
                  const estaBaixo = prod.quantidade_atual <= prod.quantidade_minima;
                  return (
                    <tr key={prod.id} className={`hover:bg-background/40 transition-colors ${estaBaixo ? 'bg-red-500/[0.01]' : ''}`}>
                      
                      {/* Nome e Status de Alerta */}
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-text-base">{prod.nome_produto}</p>
                          {estaBaixo && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-red-500/10 text-red-500 font-extrabold px-2 py-0.5 rounded-full">
                              <AlertTriangle size={10} /> Estoque Mínimo Crítico ({prod.quantidade_minima})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 ${prod.categoria === 'venda' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-blue-500/10 text-blue-600'}`}>
                          <Tag size={10}/> {prod.categoria === 'venda' ? 'Revenda' : 'Uso Interno'}
                        </span>
                      </td>

                      {/* Valores Financeiros */}
                      <td className="p-4 text-xs text-text-muted space-y-0.5">
                        <p>Custo Unitário: <span className="font-bold text-text-base">R$ {Number(prod.custo_unitario || 0).toFixed(2)}</span></p>
                        {prod.categoria === 'venda' && (
                          <p>Preço de Venda: <span className="font-bold text-brand">R$ {Number(prod.preco_venda || 0).toFixed(2)}</span></p>
                        )}
                      </td>

                      {/* Controle Rápido de Quantidade */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleAjustarQuantidade(prod, -1)} className="h-7 w-7 rounded-lg border border-border-line bg-surface hover:bg-background flex items-center justify-center font-black text-text-muted hover:text-text-base transition-colors cursor-pointer shadow-xs select-none">-</button>
                          <span className={`font-black text-sm w-8 text-center ${estaBaixo ? 'text-red-500 text-base' : 'text-text-base'}`}>
                            {prod.quantidade_atual}
                          </span>
                          <button onClick={() => handleAjustarQuantidade(prod, 1)} className="h-7 w-7 rounded-lg border border-border-line bg-surface hover:bg-background flex items-center justify-center font-black text-text-muted hover:text-text-base transition-colors cursor-pointer shadow-xs select-none">+</button>
                        </div>
                      </td>

                      {/* Botões de Ação */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => abrirEdicao(prod)} className="p-2 border border-border-line rounded-xl bg-surface text-text-muted hover:text-brand hover:border-brand transition-colors cursor-pointer"><Edit2 size={14} /></button>
                          <button onClick={() => handleDeletarProduto(prod.id)} className="p-2 border border-border-line rounded-xl bg-surface text-red-500 hover:bg-red-500/10 hover:border-red-500 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}