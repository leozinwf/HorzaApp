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

    const { data, error } = await supabase.from('produtos').insert([payload]).select('id');

    if (error) throw error;

    if (!data?.length) throw new Error('Sem permissão para adicionar produto. Verifique as políticas RLS no Supabase.');

  },



  async atualizarProduto(id, payload) {

    const { data, error } = await supabase.from('produtos').update(payload).eq('id', id).select('id');

    if (error) throw error;

    if (!data?.length) throw new Error('Sem permissão para editar este produto.');

  },



  async deletarProduto(id) {

    const { data, error } = await supabase.from('produtos').delete().eq('id', id).select('id');

    if (error) throw error;

    if (!data?.length) throw new Error('Produto não removido. Verifique permissões (RLS) no Supabase.');

  },



  async registrarMovimentacao(produtoId, usuarioId, tipo, _quantidadeAtual, mudanca, motivo = 'Ajuste rápido') {

    const mudancaNum = Number(mudanca);

    if (!Number.isFinite(mudancaNum) || mudancaNum === 0) {

      throw new Error('Quantidade inválida.');

    }



    const { data: produto, error: fetchError } = await supabase

      .from('produtos')

      .select('quantidade_atual')

      .eq('id', produtoId)

      .maybeSingle();



    if (fetchError) throw fetchError;

    if (!produto) throw new Error('Produto não encontrado ou sem permissão de leitura.');



    const quantidadeAtual = Number(produto.quantidade_atual) || 0;

    const novaQtd = quantidadeAtual + mudancaNum;

    if (novaQtd < 0) throw new Error('A quantidade não pode ser negativa.');



    const { data: updated, error: updateError } = await supabase

      .from('produtos')

      .update({ quantidade_atual: novaQtd })

      .eq('id', produtoId)

      .select('quantidade_atual');



    if (updateError) throw updateError;

    if (!updated?.length) throw new Error('Sem permissão para alterar a quantidade deste produto.');



    try {

      await supabase.from('movimentacao_estoque').insert([{

        produto_id: produtoId,

        usuario_id: usuarioId,

        tipo,

        quantidade: Math.abs(mudancaNum),

        motivo

      }]);

    } catch {

      /* movimentação opcional se a tabela não existir */

    }



    return Number(updated[0].quantidade_atual);

  }

};


