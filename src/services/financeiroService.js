import { supabase } from './supabaseClient';

export const financeiroService = {
  async obterTransacoes(barbeariaId, dataInicio, dataFim) {
    const { data, error } = await supabase
      .from('transacoes')
      .select('*, funcionario:usuarios(nome)')
      .eq('barbearia_id', barbeariaId)
      .gte('data_transacao', dataInicio)
      .lte('data_transacao', dataFim)
      .order('data_transacao', { ascending: false });

    if (error) throw error;
    return data;
  },

  async obterEquipe(barbeariaId) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('barbearia_id', barbeariaId)
      .in('role', ['admin', 'gerente', 'funcionario']);

    if (error) throw error;
    return data;
  },

  async obterCategorias(barbeariaId) {
    const { data, error } = await supabase
      .from('categorias_personalizadas')
      .select('*')
      .eq('barbearia_id', barbeariaId)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  },

  async adicionarTransacaoUnica(payload) {
    const { error } = await supabase.from('transacoes').insert([payload]);
    if (error) throw error;
  },

  async adicionarTransacoesMultiplas(payloads) {
    const { error } = await supabase.from('transacoes').insert(payloads);
    if (error) throw error;
  },

  async atualizarTransacao(id, payload) {
    const { error } = await supabase.from('transacoes').update(payload).eq('id', id);
    if (error) throw error;
  },

  async atualizarStatus(id, novoStatus) {
    const { error } = await supabase.from('transacoes').update({ status: novoStatus }).eq('id', id);
    if (error) throw error;
  },

  async deletarTransacaoUnica(id) {
    const { error } = await supabase.from('transacoes').delete().eq('id', id);
    if (error) throw error;
  },

  async deletarTransacoesFuturas(grupoRecorrencia, dataReferencia) {
    const { error } = await supabase.from('transacoes')
      .delete()
      .eq('grupo_recorrencia', grupoRecorrencia)
      .gte('data_transacao', dataReferencia);
    if (error) throw error;
  },

  async deletarTransacoesGrupo(grupoRecorrencia) {
    const { error } = await supabase.from('transacoes').delete().eq('grupo_recorrencia', grupoRecorrencia);
    if (error) throw error;
  },

  async adicionarCategoria(payload) {
    const { error } = await supabase.from('categorias_personalizadas').insert([payload]);
    if (error) throw error;
  },

  async atualizarCategoria(id, payload, nomeAntigo, barbeariaId) {
    if (payload.nome !== nomeAntigo) {
      await supabase.from('transacoes')
        .update({ categoria: payload.nome })
        .eq('categoria', nomeAntigo)
        .eq('barbearia_id', barbeariaId);
    }
    const { error } = await supabase.from('categorias_personalizadas').update(payload).eq('id', id);
    if (error) throw error;
  },

  async verificarUsoCategoria(nomeCategoria, barbeariaId) {
    const { data, error } = await supabase.from('transacoes')
      .select('id')
      .eq('categoria', nomeCategoria)
      .eq('barbearia_id', barbeariaId);
    if (error) throw error;
    return data && data.length > 0;
  },

  async deletarCategoria(id) {
    const { error } = await supabase.from('categorias_personalizadas').delete().eq('id', id);
    if (error) throw error;
  },

  async migrarEExcluirCategoria(nomeAntigo, nomeNovo, categoriaId, barbeariaId) {
    await supabase.from('transacoes')
      .update({ categoria: nomeNovo })
      .eq('categoria', nomeAntigo)
      .eq('barbearia_id', barbeariaId);
      
    const { error } = await supabase.from('categorias_personalizadas').delete().eq('id', categoriaId);
    if (error) throw error;
  }
};