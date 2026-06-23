import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { useModal } from '../../context/ModalContext';
import { 
  TrendingUp, TrendingDown, Plus, Trash2, Edit2,
  Receipt, FolderPlus, Tag, Check, X, AlertTriangle, Search, Filter,
  CalendarDays, FilterX
} from 'lucide-react';

const formatarParaMoedaExibicao = (valorFloat) => {
  if (valorFloat === undefined || valorFloat === null) return '0,00';
  return Number(valorFloat).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const aplicarMascaraMoeda = (valorString) => {
  let apenasNumeros = valorString.replace(/\D/g, '');
  if (!apenasNumeros) return '';
  let valorFloat = (parseInt(apenasNumeros, 10) / 100).toFixed(2);
  let [inteiro, decimal] = valorFloat.split('.');
  inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${decimal}`;
};

const converterMoedaParaFloat = (valorString) => {
  if (!valorString) return 0;
  let limpo = valorString.replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
};

export default function AdminFinanceiro() {
  const { profile } = useAuth();
  const { showConfirm, showAlert } = useModal();

  const [subAba, setSubAba] = useState('extrato');
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth());
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());

  // Estados de Filtro Inteligente do Extrato
  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroFuncionario, setFiltroFuncionario] = useState('todos');

  const [transacoes, setTransacoes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [categoriasCustom, setCategoriasCustom] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados Form Transação
  const [editingTransacao, setEditingTransacao] = useState(null);
  const [tipo, setTipo] = useState('saida');
  const [categoria, setCategoria] = useState(''); 
  const [status, setStatus] = useState(''); 
  const [valor, setValor] = useState(''); 
  const [descricao, setDescricao] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [tipoPagamentoFuncionario, setTipoPagamentoFuncionario] = useState('vale');
  const [recorrente, setRecorrente] = useState(false);

  // Estados Form Categoria
  const [editingCategoria, setEditingCategoria] = useState(null);
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatTipo, setNovaCatTipo] = useState('');

  // Modais Customizadas
  const [migrationModal, setMigrationModal] = useState({ isOpen: false, oldCat: null, newCatName: '' });
  const [deleteRecurringModal, setDeleteRecurringModal] = useState({ isOpen: false, transacao: null });

  const mesesDoAno = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    if (profile?.barbearia_id) {
      carregarPainelFinanceiro();
    }
  }, [profile, mesFiltro, anoFiltro, subAba]);

  const carregarPainelFinanceiro = async () => {
    setLoading(true);
    try {
      const dataInicio = new Date(anoFiltro, mesFiltro, 1).toISOString();
      const dataFim = new Date(anoFiltro, mesFiltro + 1, 0, 23, 59, 59, 999).toISOString();

      const { data: transData } = await supabase
        .from('transacoes')
        .select('*, funcionario:usuarios(nome)')
        .eq('barbearia_id', profile.barbearia_id)
        .gte('data_transacao', dataInicio)
        .lte('data_transacao', dataFim)
        .order('data_transacao', { ascending: false });
      setTransacoes(transData || []);

      const { data: eqData } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('barbearia_id', profile.barbearia_id)
        .in('role', ['admin', 'gerente', 'funcionario']);
      setEquipe(eqData || []);

      const { data: catData } = await supabase
        .from('categorias_personalizadas')
        .select('*')
        .eq('barbearia_id', profile.barbearia_id)
        .order('nome', { ascending: true });
      setCategoriasCustom(catData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 NOVA FUNÇÃO DE RESETAR TODOS OS FILTROS
  const handleResetarFiltros = () => {
    const dataAtual = new Date();
    setMesFiltro(dataAtual.getMonth());
    setAnoFiltro(dataAtual.getFullYear());
    setBuscaTexto('');
    setFiltroTipo('todos');
    setFiltroCategoria('todas');
    setFiltroFuncionario('todos');
    showAlert('Filtros Limpos', 'A visualização regressou ao mês atual e todos os filtros foram removidos.');
  };

  // --- FUNÇÕES DE TRANSAÇÃO ---
  const handleLancarTransacao = async (e) => {
    e.preventDefault();
    if (!valor || !descricao || !categoria || !status) {
      showAlert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    const valorFloat = converterMoedaParaFloat(valor);
    const basePayload = {
      tipo, categoria, status, valor: valorFloat, descricao, recorrente,
      barbearia_id: profile.barbearia_id,
      funcionario_id: (categoria === 'vale_funcionario' || categoria === 'pagamento_equipe') ? funcionarioId : null,
      tipo_pagamento_funcionario: (categoria === 'vale_funcionario' || categoria === 'pagamento_equipe') ? tipoPagamentoFuncionario : null
    };

    try {
      if (editingTransacao) {
        await supabase.from('transacoes').update(basePayload).eq('id', editingTransacao.id);
        showAlert('Sucesso', 'Lançamento atualizado com sucesso!');
      } else {
        if (recorrente) {
          const groupId = crypto.randomUUID();
          let insercoesMultiplas = [];
          for (let i = 0; i < 24; i++) {
            const dataBase = new Date();
            dataBase.setMonth(dataBase.getMonth() + i);
            insercoesMultiplas.push({
              ...basePayload,
              grupo_recorrencia: groupId,
              data_transacao: dataBase.toISOString()
            });
          }
          await supabase.from('transacoes').insert(insercoesMultiplas);
          showAlert('Sucesso', 'Lançamento fixo programado para os próximos 2 anos!');
        } else {
          await supabase.from('transacoes').insert([basePayload]);
          showAlert('Sucesso', 'Movimentação financeira registada!');
        }
      }

      fecharFormularioTransacao();
      carregarPainelFinanceiro();
    } catch (err) {
      showAlert('Erro', err.message);
    }
  };

  const handleMudarStatusAoClicar = async (transacao) => {
    const novoStatus = transacao.status === 'concluido' ? 'pendente' : 'concluido';
    try {
      await supabase.from('transacoes').update({ status: novoStatus }).eq('id', transacao.id);
      setTransacoes(transacoes.map(t => t.id === transacao.id ? { ...t, status: novoStatus } : t));
    } catch (err) {
      showAlert('Erro', err.message);
    }
  };

  const handleDeletarTransacaoClick = (t) => {
    if (t.recorrente && t.grupo_recorrencia) {
      setDeleteRecurringModal({ isOpen: true, transacao: t });
    } else {
      showConfirm('Remover Lançamento', 'Deseja apagar este registo permanentemente?', async () => {
        await supabase.from('transacoes').delete().eq('id', t.id);
        carregarPainelFinanceiro();
      });
    }
  };

  const confirmarExclusaoRecorrente = async (opcao) => {
    try {
      const t = deleteRecurringModal.transacao;
      if (opcao === 'unica') {
        await supabase.from('transacoes').delete().eq('id', t.id);
      } else if (opcao === 'proximas') {
        await supabase.from('transacoes').delete()
          .eq('grupo_recorrencia', t.grupo_recorrencia)
          .gte('data_transacao', t.data_transacao);
      } else if (opcao === 'todas') {
        await supabase.from('transacoes').delete().eq('grupo_recorrencia', t.grupo_recorrencia);
      }
      setDeleteRecurringModal({ isOpen: false, transacao: null });
      carregarPainelFinanceiro();
      showAlert('Sucesso', 'Lançamentos removidos conforme selecionado.');
    } catch (err) {
      showAlert('Erro', 'Falha ao excluir: ' + err.message);
    }
  };

  const abrirEdicaoTransacao = (t) => {
    setEditingTransacao(t);
    setTipo(t.tipo);
    setCategoria(t.categoria);
    setStatus(t.status);
    setValor(formatarParaMoedaExibicao(t.valor));
    setDescricao(t.descricao);
    setFuncionarioId(t.funcionario_id || '');
    setTipoPagamentoFuncionario(t.tipo_pagamento_funcionario || 'vale');
    setRecorrente(t.recorrente || false);
  };

  const fecharFormularioTransacao = () => {
    setEditingTransacao(null);
    setValor('');
    setDescricao('');
    setFuncionarioId('');
    setRecorrente(false);
    setTipo('saida');
    setCategoria('');
    setStatus('');
  };

  // --- FUNÇÕES DE CATEGORIA E MIGRAÇÃO ---
  const handleSalvarCategoria = async (e) => {
    e.preventDefault();
    if (!novaCatNome || !novaCatTipo) return;

    try {
      if (editingCategoria) {
        if (editingCategoria.nome !== novaCatNome) {
          await supabase.from('transacoes').update({ categoria: novaCatNome })
            .eq('categoria', editingCategoria.nome).eq('barbearia_id', profile.barbearia_id);
        }
        await supabase.from('categorias_personalizadas').update({ nome: novaCatNome, tipo: novaCatTipo }).eq('id', editingCategoria.id);
        showAlert('Sucesso', 'Categoria atualizada!');
      } else {
        await supabase.from('categorias_personalizadas').insert([{
          barbearia_id: profile.barbearia_id, nome: novaCatNome, tipo: novaCatTipo
        }]);
        showAlert('Sucesso', 'Nova categoria criada!');
      }
      fecharFormularioCategoria();
      carregarPainelFinanceiro();
    } catch (err) {
      showAlert('Erro', err.message);
    }
  };

  const abrirEdicaoCategoria = (cat) => {
    setEditingCategoria(cat);
    setNovaCatNome(cat.nome);
    setNovaCatTipo(cat.tipo);
  };

  const fecharFormularioCategoria = () => {
    setEditingCategoria(null);
    setNovaCatNome('');
    setNovaCatTipo('');
  };

  const handleVerificarDelecaoCategoria = async (cat) => {
    const { data: emUso } = await supabase.from('transacoes').select('id')
      .eq('categoria', cat.nome).eq('barbearia_id', profile.barbearia_id);

    if (emUso && emUso.length > 0) {
      setMigrationModal({ isOpen: true, oldCat: cat, newCatName: '' });
    } else {
      showConfirm('Remover Categoria', 'Deseja excluir esta categoria do seu catálogo?', async () => {
        await supabase.from('categorias_personalizadas').delete().eq('id', cat.id);
        carregarPainelFinanceiro();
        showAlert('Sucesso', 'Categoria removida.');
      });
    }
  };

  const confirmarMigracaoEExclusao = async (e) => {
    e.preventDefault();
    if (!migrationModal.newCatName) return;

    try {
      await supabase.from('transacoes').update({ categoria: migrationModal.newCatName })
        .eq('categoria', migrationModal.oldCat.nome).eq('barbearia_id', profile.barbearia_id);
      await supabase.from('categorias_personalizadas').delete().eq('id', migrationModal.oldCat.id);

      showAlert('Sucesso', 'Lançamentos transferidos e categoria excluída!');
      setMigrationModal({ isOpen: false, oldCat: null, newCatName: '' });
      carregarPainelFinanceiro();
    } catch (err) {
      showAlert('Erro', 'Falha ao migrar: ' + err.message);
    }
  };

  // --- FILTROS INTELIGENTES E CÁLCULOS ---
  const transacoesFiltradas = transacoes.filter(t => {
    const matchBusca = t.descricao.toLowerCase().includes(buscaTexto.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || t.tipo === filtroTipo;
    const matchCat = filtroCategoria === 'todas' || t.categoria === filtroCategoria;
    const matchFunc = filtroFuncionario === 'todos' || t.funcionario_id === filtroFuncionario;
    return matchBusca && matchTipo && matchCat && matchFunc;
  });

  const entradasConcluidas = transacoes.filter(t => t.tipo === 'entrada' && t.status === 'concluido').reduce((acc, t) => acc + Number(t.valor), 0);
  const entradasPlanejadas = transacoes.filter(t => t.tipo === 'entrada' && t.status === 'pendente').reduce((acc, t) => acc + Number(t.valor), 0);
  
  const saidasConcluidas = transacoes.filter(t => t.tipo === 'saida' && t.status === 'concluido').reduce((acc, t) => acc + Number(t.valor), 0);
  const saidasPlanejadas = transacoes.filter(t => t.tipo === 'saida' && t.status === 'pendente').reduce((acc, t) => acc + Number(t.valor), 0);

  const totalEntradas = entradasConcluidas + entradasPlanejadas;
  const totalSaidas = saidasConcluidas + saidasPlanejadas;

  const pctEntradaPaga = totalEntradas > 0 ? (entradasConcluidas / totalEntradas) * 100 : 0;
  const pctSaidaPaga = totalSaidas > 0 ? (saidasConcluidas / totalSaidas) * 100 : 0;

  return (
    <div className="p-6 md:p-10 relative">
      
      {/* CABEÇALHO LIMPO */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-base">Gestão Financeira</h1>
        <p className="text-sm text-text-muted">Acompanhe fluxo de caixa, metas, categorias e folha de pagamento.</p>
      </header>

      {/* ABAS INTERNAS */}
      <div className="flex gap-2 border-b border-border-line mb-8">
        <button onClick={() => setSubAba('extrato')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-all cursor-pointer ${subAba === 'extrato' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text-base'}`}>Fluxo de Caixa & Extrato</button>
        <button onClick={() => setSubAba('categorias')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-all cursor-pointer ${subAba === 'categorias' ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text-base'}`}>Categorias Customizadas</button>
      </div>

      {subAba === 'extrato' && (
        <>
          {/* BARRA MESTRE DE PERÍODO E RESET (NOVA POSIÇÃO E DESIGN) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-brand/10 p-3 rounded-xl text-brand hidden sm:block">
                <CalendarDays size={24} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Período de Análise (Mês / Ano)</label>
                <div className="flex gap-2">
                  <select value={mesFiltro} onChange={(e) => setMesFiltro(parseInt(e.target.value))} className="bg-background border border-border-line p-2.5 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer text-text-base">
                    {mesesDoAno.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select value={anoFiltro} onChange={(e) => setAnoFiltro(parseInt(e.target.value))} className="bg-background border border-border-line p-2.5 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer text-text-base">
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>
            </div>
            
            <button onClick={handleResetarFiltros} className="flex items-center gap-2 bg-background border border-border-line hover:border-red-300 hover:bg-red-50 text-text-muted hover:text-red-500 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer">
              <FilterX size={16} /> Limpar Todos os Filtros
            </button>
          </div>

          {/* CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1"><TrendingUp size={14} className="text-green-500"/> Entradas</span>
                <span className="text-xs font-black text-text-base">R$ {entradasConcluidas.toFixed(2)} de R$ {totalEntradas.toFixed(2)}</span>
              </div>
              <div className="w-full bg-background h-3 rounded-full overflow-hidden border border-border-line">
                <div style={{ width: `${pctEntradaPaga}%` }} className="bg-green-500 h-full transition-all"></div>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1"><TrendingDown size={14} className="text-red-500"/> Saídas</span>
                <span className="text-xs font-black text-text-base">R$ {saidasConcluidas.toFixed(2)} de R$ {totalSaidas.toFixed(2)}</span>
              </div>
              <div className="w-full bg-background h-3 rounded-full overflow-hidden border border-border-line">
                <div style={{ width: `${pctSaidaPaga}%` }} className="bg-red-500 h-full transition-all"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* FORMULÁRIO DE LANÇAMENTO */}
            <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm h-fit">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold flex items-center gap-2 text-text-base">
                  <Plus size={18} className="text-brand"/> 
                  {editingTransacao ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                {editingTransacao && (
                  <button onClick={fecharFormularioTransacao} className="text-text-muted hover:text-text-base bg-background p-1 rounded-lg">
                    <X size={16} />
                  </button>
                )}
              </div>

              <form onSubmit={handleLancarTransacao} className="space-y-4">
                
                <div className="flex bg-background rounded-xl p-1 border border-border-line">
                  <button type="button" onClick={() => { setTipo('entrada'); setCategoria(''); setStatus(''); }} className={`flex-1 p-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${tipo === 'entrada' ? 'bg-green-500 text-white shadow-xs' : 'text-text-muted'}`}>ENTRADA</button>
                  <button type="button" onClick={() => { setTipo('saida'); setCategoria(''); setStatus(''); }} className={`flex-1 p-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${tipo === 'saida' ? 'bg-red-500 text-white shadow-xs' : 'text-text-muted'}`}>SAÍDA</button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Status Financeiro <span className="text-red-500">*</span></label>
                  <select required value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs outline-none text-text-base cursor-pointer">
                    <option value="" disabled>Selecione...</option>
                    <option value="concluido">{tipo === 'entrada' ? 'Recebido (No Caixa)' : 'Pago / Liquidado'}</option>
                    <option value="pendente">{tipo === 'entrada' ? 'A Receber / Planejado' : 'A Pagar (Pendente)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Categoria <span className="text-red-500">*</span></label>
                  <select required value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs outline-none text-text-base cursor-pointer">
                    <option value="" disabled>Selecione...</option>
                    {tipo === 'entrada' ? (
                      <>
                        <option value="servico">Serviço de Corte/Barba</option>
                        <option value="produto">Venda de Produto</option>
                        {categoriasCustom.filter(c => c.tipo === 'entrada').map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        <option value="outros">Outras Receitas</option>
                      </>
                    ) : (
                      <>
                        <option value="despesa_fixa">Conta Fixa (Luz, Aluguel, Internet)</option>
                        <option value="vale_funcionario">Vale / Adiantamento de Profissional</option>
                        <option value="pagamento_equipe">Folha de Pagamento Completa</option>
                        <option value="produto">Reposição de Estoque</option>
                        {categoriasCustom.filter(c => c.tipo === 'saida').map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        <option value="outros">Outros Custos</option>
                      </>
                    )}
                  </select>
                </div>

                {(categoria === 'vale_funcionario' || categoria === 'pagamento_equipe') && (
                  <div className="space-y-3 bg-background p-3 rounded-xl border border-border-line animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase mb-1">Selecione o Profissional <span className="text-red-500">*</span></label>
                      <select required value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)} className="w-full rounded-xl bg-surface border border-border-line p-2 text-xs outline-none text-text-base cursor-pointer">
                        <option value="">Escolha...</option>
                        {equipe.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase mb-1">Especificação do Repasse</label>
                      <select value={tipoPagamentoFuncionario} onChange={(e) => setTipoPagamentoFuncionario(e.target.value)} className="w-full rounded-xl bg-surface border border-border-line p-2 text-xs outline-none text-text-base cursor-pointer">
                        <option value="vale">Apenas um Vale / Adiantamento</option>
                        <option value="mensal">Salário Mensal Fechado</option>
                        <option value="quinzenal">Pagamento Quinzenal</option>
                        <option value="comissao">Repasse de Comissões</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Descrição <span className="text-red-500">*</span></label>
                  <input required type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs outline-none focus:border-brand" placeholder="Ex: Conta da Água" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Valor (R$) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-text-muted">R$</span>
                    <input 
                      required 
                      type="text" 
                      value={valor} 
                      onChange={(e) => setValor(aplicarMascaraMoeda(e.target.value))} 
                      className="w-full rounded-xl bg-background border border-border-line p-2.5 pl-9 text-xs font-bold outline-none focus:border-brand text-text-base" 
                      placeholder="0,00" 
                    />
                  </div>
                </div>

                {!editingTransacao && (
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="recorrente" checked={recorrente} onChange={() => setRecorrente(!recorrente)} className="rounded border-border-line accent-brand" />
                    <label htmlFor="recorrente" className="text-xs text-text-muted font-bold select-none cursor-pointer">Fixo (Agendar próximos 2 anos)</label>
                  </div>
                )}

                <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white font-bold p-3 rounded-xl text-xs transition-all shadow-xs cursor-pointer">
                  {editingTransacao ? 'Salvar Alterações' : 'Lançar no Caixa'}
                </button>
              </form>
            </div>

            {/* EXTRATO COM FILTROS AVANÇADOS */}
            <div className="lg:col-span-2 bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden flex flex-col">
              
              {/* BARRA DE FILTROS DO EXTRATO */}
              <div className="p-4 border-b border-border-line bg-background/50 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Filtros da Lista de Extrato</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="relative">
                    <input type="text" value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-xl bg-surface border border-border-line p-2.5 pl-8 text-xs outline-none text-text-base focus:border-brand" />
                    <Search size={14} className="absolute left-2.5 top-3 text-text-muted" />
                  </div>
                  
                  <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-xl bg-surface border border-border-line p-2.5 text-xs outline-none text-text-base cursor-pointer focus:border-brand">
                    <option value="todos">Entradas e Saídas</option>
                    <option value="entrada">Somente Entradas</option>
                    <option value="saida">Somente Saídas</option>
                  </select>

                  <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="rounded-xl bg-surface border border-border-line p-2.5 text-xs outline-none text-text-base cursor-pointer focus:border-brand">
                    <option value="todas">Todas as Categorias</option>
                    {[...new Set(transacoes.map(t => t.categoria))].map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                  </select>

                  <select value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)} className="rounded-xl bg-surface border border-border-line p-2.5 text-xs outline-none text-text-base cursor-pointer focus:border-brand">
                    <option value="todos">Todos Profissionais</option>
                    {equipe.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* LISTA FILTRADA */}
              <div className="overflow-y-auto max-h-[600px]">
                {transacoesFiltradas.length === 0 ? (
                  <div className="p-10 text-center">
                    <Filter size={32} className="mx-auto text-text-muted mb-3 opacity-50" />
                    <p className="text-text-muted text-sm">Nenhum lançamento corresponde aos filtros.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border-line">
                    {transacoesFiltradas.map((t) => (
                      <li key={t.id} className="p-5 flex justify-between items-center hover:bg-background/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleMudarStatusAoClicar(t)}
                            className={`h-5 w-5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                              t.status === 'concluido' ? 'bg-brand border-brand text-white' : 'border-border-line bg-background hover:border-brand text-transparent'
                            }`}
                          >
                            <Check size={14} className="stroke-[3px]" />
                          </button>
                          
                          <div>
                            <p className="font-bold text-sm text-text-base leading-tight mb-1">{t.descricao}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold flex-wrap">
                              <span className="bg-text-base text-surface px-2 py-0.5 rounded-md uppercase tracking-wider">{t.categoria.replace('_', ' ')}</span>
                              {t.recorrente && <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-md">Fixo</span>}
                              {t.funcionario_id && (
                                <span className="bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-md uppercase">
                                  {t.tipo_pagamento_funcionario}: {t.funcionario?.nome}
                               </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`font-extrabold text-sm ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                            {t.tipo === 'entrada' ? '+' : '-'} R$ {formatarParaMoedaExibicao(t.valor)}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <button onClick={() => abrirEdicaoTransacao(t)} className="text-text-muted hover:text-brand p-1.5 rounded-lg hover:bg-background transition-colors cursor-pointer md:opacity-0 group-hover:opacity-100">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDeletarTransacaoClick(t)} className="text-text-muted hover:text-red-500 p-1.5 rounded-lg hover:bg-background transition-colors cursor-pointer md:opacity-0 group-hover:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ABA DE CATEGORIAS */}
      {subAba === 'categorias' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-surface p-6 rounded-2xl border border-border-line shadow-sm h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <FolderPlus size={18} className="text-brand"/> 
                {editingCategoria ? 'Editar Categoria' : 'Criar Categoria'}
              </h2>
              {editingCategoria && (
                <button onClick={fecharFormularioCategoria} className="text-text-muted hover:text-text-base bg-background p-1 rounded-lg">
                  <X size={16} />
                </button>
              )}
            </div>
            
            <form onSubmit={handleSalvarCategoria} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome da Categoria <span className="text-red-500">*</span></label>
                <input required type="text" value={novaCatNome} onChange={(e) => setNovaCatNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs outline-none" placeholder="Ex: Marketing Digital" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Destinação <span className="text-red-500">*</span></label>
                <select required value={novaCatTipo} onChange={(e) => setNovaCatTipo(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-2.5 text-xs outline-none text-text-base cursor-pointer">
                  <option value="" disabled>Selecione...</option>
                  <option value="saida">Saída (Custos/Despesas)</option>
                  <option value="entrada">Entrada (Receitas/Faturamento)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white font-bold p-3 rounded-xl text-xs transition-all cursor-pointer">
                {editingCategoria ? 'Salvar Edição' : 'Cadastrar'}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border-line"><h2 className="text-base font-bold flex items-center gap-2"><Tag size={18}/> Suas Categorias Personalizadas</h2></div>
            {categoriasCustom.length === 0 ? (
              <p className="p-10 text-center text-text-muted text-xs">Nenhuma categoria criada ainda.</p>
            ) : (
              <ul className="divide-y divide-border-line">
                {categoriasCustom.map(c => (
                  <li key={c.id} className="p-5 flex justify-between items-center hover:bg-background transition-colors group">
                    <span className="font-bold text-sm text-text-base">{c.nome}</span>
                    <div className="flex items-center gap-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${c.tipo === 'entrada' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>{c.tipo}</span>
                      <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirEdicaoCategoria(c)} className="text-text-muted hover:text-brand p-1.5 rounded-lg hover:bg-background transition-colors cursor-pointer">
                          <Edit2 size={15}/>
                        </button>
                        <button onClick={() => handleVerificarDelecaoCategoria(c)} className="text-text-muted hover:text-red-500 p-1.5 rounded-lg hover:bg-background transition-colors cursor-pointer">
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* MODAL: APAGAR LANÇAMENTO RECORRENTE */}
      {deleteRecurringModal.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-text-base mb-2">Excluir Lançamento Fixo</h3>
            <p className="text-sm text-text-muted mb-6">Esta conta faz parte de uma série mensal. Como deseja prosseguir com a exclusão?</p>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => confirmarExclusaoRecorrente('unica')} className="p-3 bg-background border border-border-line rounded-xl text-sm font-bold text-text-base hover:border-brand transition-colors text-left cursor-pointer">
                Apagar apenas deste mês
              </button>
              <button onClick={() => confirmarExclusaoRecorrente('proximas')} className="p-3 bg-background border border-border-line rounded-xl text-sm font-bold text-text-base hover:border-brand transition-colors text-left cursor-pointer">
                Apagar este e os próximos (Cancelar)
              </button>
              <button onClick={() => confirmarExclusaoRecorrente('todas')} className="p-3 bg-red-500/10 text-red-600 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-colors text-left cursor-pointer">
                Apagar todo o histórico desta conta
              </button>
              <button onClick={() => setDeleteRecurringModal({ isOpen: false, transacao: null })} className="p-3 mt-2 text-text-muted text-sm font-bold hover:text-text-base text-center cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETAR CATEGORIA E MIGRAR */}
      {migrationModal.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertTriangle size={28} />
              </div>
              <button onClick={() => setMigrationModal({ isOpen: false, oldCat: null, newCatName: '' })} className="text-text-muted hover:text-text-base cursor-pointer bg-background p-1.5 rounded-full">
                <X size={20}/>
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-text-base mb-2">Atenção! Categoria em Uso</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Existem lançamentos usando a categoria <strong>{migrationModal.oldCat.nome}</strong>. Para evitar contas sem classificação, selecione para onde deseja movê-las:
            </p>
            
            <form onSubmit={confirmarMigracaoEExclusao}>
              <div className="mb-6">
                <select required value={migrationModal.newCatName} onChange={(e) => setMigrationModal({ ...migrationModal, newCatName: e.target.value })} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none text-text-base">
                  <option value="" disabled>Escolha a categoria substituta...</option>
                  {migrationModal.oldCat.tipo === 'entrada' ? (
                    <>
                      <option value="servico">Serviço de Corte/Barba</option>
                      <option value="produto">Venda de Produto</option>
                      {categoriasCustom.filter(c => c.tipo === 'entrada' && c.id !== migrationModal.oldCat.id).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      <option value="outros">Outras Receitas</option>
                    </>
                  ) : (
                    <>
                      <option value="despesa_fixa">Conta Fixa</option>
                      <option value="vale_funcionario">Vale / Adiantamento</option>
                      <option value="pagamento_equipe">Folha de Pagamento</option>
                      <option value="produto">Reposição de Estoque</option>
                      {categoriasCustom.filter(c => c.tipo === 'saida' && c.id !== migrationModal.oldCat.id).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                      <option value="outros">Outros Custos</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setMigrationModal({ isOpen: false, oldCat: null, newCatName: '' })} className="flex-1 p-3 rounded-xl bg-background border border-border-line text-text-base font-bold hover:bg-border-line transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="flex-1 p-3 rounded-xl text-white font-bold transition-colors cursor-pointer bg-brand hover:bg-brand-hover">Transferir e Excluir</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}