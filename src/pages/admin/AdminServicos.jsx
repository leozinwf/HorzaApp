import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { Scissors, Plus, Edit2, Trash2, Clock, DollarSign, X } from 'lucide-react';

export default function AdminServicos() {
  const { profile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle da Modal Interna
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados do Formulário
  const [idEditando, setIdEditando] = useState(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState(''); // O preço agora guarda a string formatada "0,00"
  const [duracao, setDuracao] = useState('30');

  useEffect(() => {
    if (profile?.barbearia_id) buscarServicos();
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
      showAlert('Erro', 'Não foi possível carregar os serviços.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✨ Função da Máscara de Moeda (Real Brasileiro)
  const handlePrecoChange = (e) => {
    let valor = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
    
    if (!valor) {
        setPreco('');
        return;
    }

    // Converte para decimal (dividindo por 100)
    const valorNumerico = parseInt(valor, 10) / 100;
    
    // Formata para o padrão Brasileiro (ex: 1.250,00)
    const valorFormatado = valorNumerico.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    
    setPreco(valorFormatado);
  };

  const abrirFormulario = (servico = null) => {
    if (servico) {
      setIdEditando(servico.id);
      setNome(servico.nome_servico);
      setDescricao(servico.descricao || '');
      setDuracao(servico.duracao_minutos.toString());
      // Formata o preço que vem do banco (ex: 35.5) para a máscara (35,50)
      setPreco(parseFloat(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setIdEditando(null);
      setNome('');
      setDescricao('');
      setPreco('');
      setDuracao('30');
    }
    setIsFormOpen(true);
  };

  const fecharFormulario = () => {
    setIsFormOpen(false);
    setIdEditando(null);
  };

  const salvarServico = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    // ✨ Converte o preço formatado (ex: "1.250,50") de volta para número do banco (1250.50)
    const precoNumericoDB = preco ? parseFloat(preco.replace(/\./g, '').replace(',', '.')) : 0;

    const servicoData = {
      barbearia_id: profile.barbearia_id,
      nome_servico: nome,
      descricao: descricao,
      preco: precoNumericoDB,
      duracao_minutos: parseInt(duracao)
    };

    try {
      if (idEditando) {
        const { error } = await supabase.from('servicos').update(servicoData).eq('id', idEditando);
        if (error) throw error;
        showAlert('Sucesso!', 'Serviço atualizado com sucesso.', 'success');
      } else {
        const { error } = await supabase.from('servicos').insert([servicoData]);
        if (error) throw error;
        showAlert('Sucesso!', 'Novo serviço adicionado à sua barbearia.', 'success');
      }
      
      fecharFormulario();
      buscarServicos();
    } catch (err) {
      showAlert('Erro', err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const excluirServico = (id, nomeServico) => {
    showConfirm(
      'Excluir Serviço?', 
      `Tem a certeza que deseja remover "${nomeServico}"? Esta ação não pode ser desfeita.`, 
      async () => {
        try {
          const { error } = await supabase.from('servicos').delete().eq('id', id);
          if (error) throw error;
          
          setServicos(prev => prev.filter(s => s.id !== id));
          showAlert('Removido', 'O serviço foi excluído.', 'success');
        } catch (err) {
          showAlert('Erro', 'Não foi possível excluir o serviço.', 'error');
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto mb-20 relative h-full">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-text-base">Serviços</h1>
          <p className="text-sm text-text-muted mt-1">Gerencie os cortes e serviços oferecidos pela barbearia.</p>
        </div>
        <button onClick={() => abrirFormulario()} className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-hover transition-colors shadow-lg shadow-brand/20 cursor-pointer">
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      {/* LISTAGEM DE SERVIÇOS */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : servicos.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-border-line rounded-3xl">
          <div className="mx-auto h-16 w-16 bg-background rounded-full flex items-center justify-center text-text-muted mb-4">
            <Scissors size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-base mb-1">Nenhum serviço cadastrado</h3>
          <p className="text-sm text-text-muted">Adicione o seu primeiro corte ou serviço para começar a receber agendamentos.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servicos.map((servico) => (
            <div key={servico.id} className="bg-surface border border-border-line rounded-2xl p-5 hover:border-brand/30 transition-colors group">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-brand/10 text-brand rounded-lg">
                  <Scissors size={20} />
                </div>
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirFormulario(servico)} className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer" title="Editar"><Edit2 size={16} /></button>
                  <button onClick={() => excluirServico(servico.id, servico.nome_servico)} className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Excluir"><Trash2 size={16} /></button>
                </div>
              </div>
              
              <h3 className="font-bold text-lg text-text-base leading-tight mb-1">{servico.nome_servico}</h3>
              {servico.descricao && <p className="text-xs text-text-muted line-clamp-2 mb-4">{servico.descricao}</p>}
              
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border-line/50">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-text-base">
                  <DollarSign size={16} className="text-green-500" />
                  R$ {parseFloat(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-text-muted">
                  <Clock size={16} />
                  {servico.duracao_minutos} min
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL / PAINEL LATERAL PARA CRIAR/EDITAR */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface w-full max-w-md h-full shadow-2xl flex flex-col animate-slideInRight">
            
            <div className="flex items-center justify-between p-6 border-b border-border-line">
              <h2 className="text-xl font-black">{idEditando ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={fecharFormulario} className="p-2 text-text-muted hover:bg-background rounded-full transition-colors cursor-pointer"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="form-servico" onSubmit={salvarServico} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome do Serviço *</label>
                  <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="Ex: Corte Degrade" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Descrição</label>
                  <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows="3" className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none resize-none" placeholder="Detalhes opcionais sobre o serviço..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1">Preço (R$) *</label>
                    <input 
                      required 
                      type="text" 
                      value={preco} 
                      onChange={handlePrecoChange} 
                      className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" 
                      placeholder="0,00" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1">Duração *</label>
                    <select required value={duracao} onChange={(e) => setDuracao(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none">
                      <option value="15">15 Minutos</option>
                      <option value="30">30 Minutos</option>
                      <option value="45">45 Minutos</option>
                      <option value="60">1 Hora</option>
                      <option value="90">1h 30m</option>
                      <option value="120">2 Horas</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-border-line bg-background">
              <div className="flex gap-3">
                <button type="button" onClick={fecharFormulario} className="flex-1 px-4 py-3 rounded-xl border border-border-line font-bold text-text-base hover:bg-surface transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" form="form-servico" disabled={isSaving} className="flex-1 px-4 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-colors shadow-md flex justify-center items-center cursor-pointer">
                  {isSaving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar Serviço'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}