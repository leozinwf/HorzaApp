import { supabase } from './supabaseClient';

export const estoqueService = {
  async obterProdutos(barbeariaId) {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .order('nome_produto', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async adicionarProduto(payload) {
    const { error } = await supabase.from('produtos').insert([payload]);
    if (error) throw error;
  },

  async atualizarProduto(id, payload) {
    const { error } = await supabase.from('produtos').update(payload).eq('id', id);
    if (error) throw error;
  },

  async deletarProduto(id) {
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) throw error;
  },

  async registrarMovimentacao(produtoId, usuarioId, tipo, quantidadeAtual, mudanca, motivo = 'Ajuste rápido') {
    const novaQtd = quantidadeAtual + mudanca;
    if (novaQtd < 0) throw new Error("A quantidade não pode ser negativa.");

    // 1. Atualiza a quantidade no produto
    const { error: updateError } = await supabase
      .from('produtos')
      .update({ quantidade_atual: novaQtd })
      .eq('id', produtoId);
      
    if (updateError) throw updateError;

    // 2. Salva o log de movimentação
    const { error: movError } = await supabase
      .from('movimentacao_estoque')
      .insert([{
        produto_id: produtoId,
        usuario_id: usuarioId,
        tipo: tipo,
        quantidade: Math.abs(mudanca),
        motivo: motivo
      }]);

    if (movError) throw movError;
    return novaQtd;
  }
};