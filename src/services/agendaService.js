import { supabase } from './supabaseClient';

export const agendaService = {
  // Busca a agenda de uma barbearia para uma data específica
  async obterAgendamentos(barbeariaId, dataInicio, dataFim) {
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        servicos (nome_servico, preco, duracao_minutos),
        cliente:usuarios!agendamentos_cliente_id_fkey (nome, whatsapp),
        barbeiro:usuarios!agendamentos_barbeiro_id_fkey (nome)
      `)
      .eq('barbearia_id', barbeariaId)
      .gte('data_hora', dataInicio)
      .lte('data_hora', dataFim)
      .order('data_hora', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Cria um agendamento e gera o log da ação
  async criarAgendamento(agendamentoDados, usuarioLogadoId) {
    // 1. Cria o agendamento
    const { data: agendamento, error: agendamentoError } = await supabase
      .from('agendamentos')
      .insert([agendamentoDados])
      .select()
      .single();

    if (agendamentoError) throw agendamentoError;

    // 2. Grava o log de criação
    await supabase.from('agendamento_logs').insert([{
      agendamento_id: agendamento.id,
      usuario_id: usuarioLogadoId, // ID de quem estava usando o sistema
      acao: 'criado',
      detalhes: { dados_iniciais: agendamentoDados }
    }]);

    return agendamento;
  },

  // Cancela o agendamento usando a nova estrutura do banco
  async cancelarAgendamento(agendamentoId, usuarioId, motivo) {
    // 1. Atualiza o status e os novos campos de cancelamento
    const { data: agendamento, error: updateError } = await supabase
      .from('agendamentos')
      .update({ 
        status_atendimento: 'cancelado',
        cancelado_por: usuarioId,
        motivo_cancelamento: motivo
      })
      .eq('id', agendamentoId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Grava o log de cancelamento
    await supabase.from('agendamento_logs').insert([{
      agendamento_id: agendamentoId,
      usuario_id: usuarioId,
      acao: 'cancelado',
      detalhes: { motivo: motivo }
    }]);

    return agendamento;
  },

  // Conclui o agendamento
  async concluirAgendamento(agendamentoId, usuarioId) {
    const { data: agendamento, error: updateError } = await supabase
      .from('agendamentos')
      .update({ status_atendimento: 'concluido' })
      .eq('id', agendamentoId)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabase.from('agendamento_logs').insert([{
      agendamento_id: agendamentoId,
      usuario_id: usuarioId,
      acao: 'concluido'
    }]);

    return agendamento;
  }
};