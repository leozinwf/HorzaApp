import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { financeiroService } from '../../services/financeiroService';
import { useModal } from '../../context/ModalContext';
import { 
  TrendingUp, TrendingDown, Plus, Trash2, Edit2,
  Receipt, FolderPlus, Tag, Check, X, AlertTriangle, Search, Filter,
  CalendarDays, FilterX
} from 'lucide-react';
import { auditLogService } from '../../services/auditLogService';
import HistoricoMudancas from '../../components/admin/HistoricoMudancas';
import ProSection from '../../components/shared/ProSection';
import { FinanceiroInteligenteBlock, ComissaoPlusBlock } from '../../components/shared/ProModuleBlocks';
import { FEATURE_KEYS } from '../../constants/planFeatures';

const parseTiposCategoria = (tipo) =>
  (tipo || '').split(',').map((t) => t.trim()).filter(Boolean);

const formatTiposCategoria = (tipos) =>
  [...tipos].sort().join(',');

const toggleTipoLista = (lista, tipo) =>
  lista.includes(tipo) ? lista.filter((t) => t !== tipo) : [...lista, tipo];

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

  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroFuncionario, setFiltroFuncionario] = useState('todos');

  const [transacoes, setTransacoes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [categoriasCustom, setCategoriasCustom] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingTransacao, setEditingTransacao] = useState(null);
  const [tipo, setTipo] = useState('saida');
  const [categoria, setCategoria] = useState(''); 
  const [status, setStatus] = useState(''); 
  const [valor, setValor] = useState(''); 
  const [descricao, setDescricao] = useState('');
  const [funcionarioId, setFuncionarioId] = useState('');
  const [tipoPagamentoFuncionario, setTipoPagamentoFuncionario] = useState('vale');
  const [recorrente, setRecorrente] = useState(false);

  const [editingCategoria, setEditingCategoria] = useState(null);
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatTipos, setNovaCatTipos] = useState([]);

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

      const [transData, eqData, catData] = await Promise.all([
        financeiroService.obterTransacoes(profile.barbearia_id, dataInicio, dataFim),
        financeiroService.obterEquipe(profile.barbearia_id),
        financeiroService.obterCategorias(profile.barbearia_id)
      ]);

      setTransacoes(transData);
      setEquipe(eqData);
      setCategoriasCustom(catData);

    } catch (err) {
      console.error(err);
      showAlert('Erro', 'Não foi possível carregar os dados financeiros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetarFiltros = () => {
    const dataAtual = new Date();
    setMesFiltro(dataAtual.getMonth());
    setAnoFiltro(dataAtual.getFullYear());
    setBuscaTexto('');
    setFiltroTipo('todos');
    setFiltroCategoria('todas');
    setFiltroFuncionario('todos');
    showAlert('Filtros Limpos', 'A visualização regressou ao mês atual e todos os filtros foram removidos.', 'info');
  };

  const handleLancarTransacao = async (e) => {
    e.preventDefault();
    if (!valor || !descricao || !categoria || !status) {
      showAlert('Atenção', 'Preencha todos os campos obrigatórios.', 'error');
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
        await financeiroService.atualizarTransacao(editingTransacao.id, basePayload);
        showAlert('Sucesso', 'Lançamento atualizado com sucesso!', 'success');
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
          await financeiroService.adicionarTransacoesMultiplas(insercoesMultiplas);
          showAlert('Sucesso', 'Lançamento fixo programado para os próximos 2 anos!', 'success');
        } else {
          await financeiroService.adicionarTransacaoUnica(basePayload);
          showAlert('Sucesso', 'Movimentação financeira registada!', 'success');
        }
      }

      fecharFormularioTransacao();
      carregarPainelFinanceiro();
    } catch (err) {
      showAlert('Erro', err.message, 'error');
    }
  };

  const handleMudarStatusAoClicar = async (transacao) => {
    const novoStatus = transacao.status === 'concluido' ? 'pendente' : 'concluido';
    try {
      await financeiroService.atualizarStatus(transacao.id, novoStatus);
      setTransacoes(transacoes.map(t => t.id === transacao.id ? { ...t, status: novoStatus } : t));
    } catch (err) {
      showAlert('Erro', err.message, 'error');
    }
  };

  const handleDeletarTransacaoClick = (t) => {
    if (t.recorrente && t.grupo_recorrencia) {
      setDeleteRecurringModal({ isOpen: true, transacao: t });
    } else {
      showConfirm('Remover Lançamento', 'Deseja apagar este registo permanentemente?', async () => {
        await financeiroService.deletarTransacaoUnica(t.id);
        carregarPainelFinanceiro();
      });
    }
  };

  const confirmarExclusaoRecorrente = async (opcao) => {
    try {
      const t = deleteRecurringModal.transacao;
      if (opcao === 'unica') {
        await financeiroService.deletarTransacaoUnica(t.id);
      } else if (opcao === 'proximas') {
        await financeiroService.deletarTransacoesFuturas(t.grupo_recorrencia, t.data_transacao, profile.barbearia_id);
      } else if (opcao === 'todas') {
        await financeiroService.deletarTransacoesGrupo(t.grupo_recorrencia, profile.barbearia_id);
      }
      setDeleteRecurringModal({ isOpen: false, transacao: null });
      carregarPainelFinanceiro();
      showAlert('Sucesso', 'Lançamentos removidos conforme selecionado.', 'success');
    } catch (err) {
      showAlert('Erro', 'Falha ao excluir: ' + err.message, 'error');
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

  const handleSalvarCategoria = async (e) => {
    e.preventDefault();
    if (!novaCatNome || novaCatTipos.length === 0) {
      showAlert('Atenção', 'Informe o nome e ao menos uma destinação (Entrada ou Saída).', 'error');
      return;
    }

    const tipoStr = formatTiposCategoria(novaCatTipos);

    try {
      if (editingCategoria) {
        await financeiroService.atualizarCategoria(
          editingCategoria.id,
          { nome: novaCatNome, tipo: tipoStr },
          editingCategoria.nome,
          profile.barbearia_id
        );
        await auditLogService.registrar({
          barbeariaId: profile.barbearia_id,
          usuarioId: profile.id,
          usuarioNome: profile.nome,
          modulo: 'financeiro',
          acao: 'editar',
          descricao: `Categoria "${novaCatNome}" atualizada`,
        });
        showAlert('Sucesso', 'Categoria atualizada!', 'success');
      } else {
        await financeiroService.adicionarCategoria({
          barbearia_id: profile.barbearia_id,
          nome: novaCatNome,
          tipo: tipoStr
        });
        await auditLogService.registrar({
          barbeariaId: profile.barbearia_id,
          usuarioId: profile.id,
          usuarioNome: profile.nome,
          modulo: 'financeiro',
          acao: 'criar',
          descricao: `Categoria "${novaCatNome}" criada`,
        });
        showAlert('Sucesso', 'Nova categoria criada!', 'success');
      }
      fecharFormularioCategoria();
      carregarPainelFinanceiro();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('row-level security') || msg.includes('violates row-level security')) {
        showAlert(
          'Permissão negada no banco',
          'A tabela de categorias precisa das políticas RLS no Supabase. Aplique o arquivo supabase/migrations/20260722183000_categorias_rls.sql no painel SQL do Supabase.',
          'error'
        );
      } else {
        showAlert('Erro', msg, 'error');
      }
    }
  };

  const abrirEdicaoCategoria = (cat) => {
    setEditingCategoria(cat);
    setNovaCatNome(cat.nome);
    setNovaCatTipos(parseTiposCategoria(cat.tipo));
  };

  const fecharFormularioCategoria = () => {
    setEditingCategoria(null);
    setNovaCatNome('');
    setNovaCatTipos([]);
  };

  const handleVerificarDelecaoCategoria = async (cat) => {
    const emUso = await financeiroService.verificarUsoCategoria(cat.nome, profile.barbearia_id);

    if (emUso) {
      setMigrationModal({ isOpen: true, oldCat: cat, newCatName: '' });
    } else {
      showConfirm('Remover Categoria', 'Deseja excluir esta categoria do seu catálogo?', async () => {
        await financeiroService.deletarCategoria(cat.id);
        carregarPainelFinanceiro();
        showAlert('Sucesso', 'Categoria removida.', 'success');
      });
    }
  };

  const confirmarMigracaoEExclusao = async (e) => {
    e.preventDefault();
    if (!migrationModal.newCatName) return;

    try {
      await financeiroService.migrarEExcluirCategoria(
        migrationModal.oldCat.nome, 
        migrationModal.newCatName, 
        migrationModal.oldCat.id, 
        profile.barbearia_id
      );

      showAlert('Sucesso', 'Lançamentos transferidos e categoria excluída!', 'success');
      setMigrationModal({ isOpen: false, oldCat: null, newCatName: '' });
      carregarPainelFinanceiro();
    } catch (err) {
      showAlert('Erro', 'Falha ao migrar: ' + err.message, 'error');
    }
  };

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
    <div className="p-4 md:p-10 md:pb-10 max-w-7xl mx-auto">
      
      {/* CABEÇALHO LIMPO */}
      <header className="mb-6">
        <h1 className="text-2xl font-black text-text-base">Gestão Financeira</h1>
        <p className="text-sm text-text-muted mt-1">Acompanhe fluxo de caixa, metas, categorias e folha de pagamento.</p>
      </header>

      {/* ABAS ESTILO PÍLULA */}
      <div className="flex gap-2 p-1 bg-surface border border-border-line rounded-xl mb-8 w-full max-w-md">
        <button onClick={() => setSubAba('extrato')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${subAba === 'extrato' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>
          <Receipt size={18}/> Extrato & Caixa
        </button>
        <button onClick={() => setSubAba('categorias')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${subAba === 'categorias' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>
          <Tag size={18}/> Categorias
        </button>
      </div>

      {subAba === 'extrato' && (
        <div className="animate-fadeIn">
          {/* BARRA MESTRE DE PERÍODO E RESET */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="bg-brand/10 p-3 rounded-xl text-brand hidden sm:block">
                <CalendarDays size={24} />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Período de Análise (Mês / Ano)</label>
                <div className="flex gap-2 w-full sm:w-auto">
                  <select value={mesFiltro} onChange={(e) => setMesFiltro(parseInt(e.target.value))} className="flex-1 sm:flex-none bg-background border border-border-line p-2.5 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer text-text-base">
                    {mesesDoAno.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <select value={anoFiltro} onChange={(e) => setAnoFiltro(parseInt(e.target.value))} className="flex-1 sm:flex-none bg-background border border-border-line p-2.5 rounded-xl text-sm font-bold outline-none focus:border-brand cursor-pointer text-text-base">
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>
            </div>
            
            <button onClick={handleResetarFiltros} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-background border border-border-line hover:border-red-300 hover:bg-red-50 text-text-muted hover:text-red-500 font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer">
              <FilterX size={16} /> Limpar Filtros
            </button>
          </div>

          {/* CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base font-black flex items-center gap-2 text-text-base">
                  <Plus size={18} className="text-brand"/> 
                  {editingTransacao ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h2>
                {editingTransacao && (
                  <button onClick={fecharFormularioTransacao} className="text-text-muted hover:text-text-base bg-background p-1.5 rounded-full border border-border-line transition-colors cursor-pointer">
                    <X size={16} />
                  </button>
                )}
              </div>

              <form onSubmit={handleLancarTransacao} className="space-y-5">
                
                <div className="flex bg-background rounded-xl p-1 border border-border-line">
                  <button type="button" onClick={() => { setTipo('entrada'); setCategoria(''); setStatus(''); }} className={`flex-1 p-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${tipo === 'entrada' ? 'bg-green-500 text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>ENTRADA</button>
                  <button type="button" onClick={() => { setTipo('saida'); setCategoria(''); setStatus(''); }} className={`flex-1 p-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${tipo === 'saida' ? 'bg-red-500 text-white shadow-sm' : 'text-text-muted hover:text-text-base'}`}>SAÍDA</button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Status Financeiro *</label>
                  <select required value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base cursor-pointer">
                    <option value="" disabled>Selecione...</option>
                    <option value="concluido">{tipo === 'entrada' ? 'Recebido (No Caixa)' : 'Pago / Liquidado'}</option>
                    <option value="pendente">{tipo === 'entrada' ? 'A Receber / Planejado' : 'A Pagar (Pendente)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Categoria *</label>
                  <select required value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base cursor-pointer">
                    <option value="" disabled>Selecione...</option>
                    {tipo === 'entrada' ? (
                      <>
                        <option value="servico">Serviço de Corte/Barba</option>
                        <option value="produto">Venda de Produto</option>
                        {categoriasCustom.filter(c => parseTiposCategoria(c.tipo).includes('entrada')).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        <option value="outros">Outras Receitas</option>
                      </>
                    ) : (
                      <>
                        <option value="despesa_fixa">Conta Fixa (Luz, Aluguel, Internet)</option>
                        <option value="vale_funcionario">Vale / Adiantamento de Profissional</option>
                        <option value="pagamento_equipe">Folha de Pagamento Completa</option>
                        <option value="produto">Reposição de Estoque</option>
                        {categoriasCustom.filter(c => parseTiposCategoria(c.tipo).includes('saida')).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        <option value="outros">Outros Custos</option>
                      </>
                    )}
                  </select>
                </div>

                {(categoria === 'vale_funcionario' || categoria === 'pagamento_equipe') && (
                  <div className="space-y-4 bg-background p-4 rounded-xl border border-border-line animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase mb-1">Selecione o Profissional *</label>
                      <select required value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)} className="w-full rounded-xl bg-surface border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base cursor-pointer">
                        <option value="">Escolha...</option>
                        {equipe.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase mb-1">Especificação do Repasse</label>
                      <select value={tipoPagamentoFuncionario} onChange={(e) => setTipoPagamentoFuncionario(e.target.value)} className="w-full rounded-xl bg-surface border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base cursor-pointer">
                        <option value="vale">Apenas um Vale / Adiantamento</option>
                        <option value="mensal">Salário Mensal Fechado</option>
                        <option value="quinzenal">Pagamento Quinzenal</option>
                        <option value="comissao">Repasse de Comissões</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Descrição *</label>
                  <input required type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base" placeholder="Ex: Conta da Água" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Valor (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm font-bold text-text-muted">R$</span>
                    <input 
                      required 
                      type="text" 
                      value={valor} 
                      onChange={(e) => setValor(aplicarMascaraMoeda(e.target.value))} 
                      className="w-full rounded-xl bg-background border border-border-line p-3 pl-10 text-sm font-bold outline-none focus:border-brand text-text-base" 
                      placeholder="0,00" 
                    />
                  </div>
                </div>

                {!editingTransacao && (
                  <label className="flex items-center gap-3 pt-2 cursor-pointer group">
                    <input type="checkbox" checked={recorrente} onChange={() => setRecorrente(!recorrente)} className="h-5 w-5 rounded border-border-line accent-brand" />
                    <span className="text-xs font-bold text-text-muted group-hover:text-text-base transition-colors">Fixo (Agendar próximos 2 anos)</span>
                  </label>
                )}

                <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-md cursor-pointer mt-2">
                  {editingTransacao ? 'Salvar Alterações' : 'Lançar no Caixa'}
                </button>
              </form>
            </div>

            {/* EXTRATO COM FILTROS AVANÇADOS */}
            <div className="lg:col-span-2 bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden flex flex-col">
              
              <div className="p-5 border-b border-border-line bg-background/30 flex flex-col gap-4">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2"><Filter size={16}/> Filtros do Extrato</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <input type="text" value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-xl bg-background border border-border-line p-3 pl-10 text-xs outline-none text-text-base focus:border-brand transition-colors" />
                    <Search size={16} className="absolute left-3.5 top-3 text-text-muted" />
                  </div>
                  
                  <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-xs outline-none focus:border-brand text-text-base cursor-pointer transition-colors">
                    <option value="todos">Todas as Transações</option>
                    <option value="entrada">Somente Entradas</option>
                    <option value="saida">Somente Saídas</option>
                  </select>

                  <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-xs outline-none focus:border-brand text-text-base cursor-pointer transition-colors">
                    <option value="todas">Todas as Categorias</option>
                    {[...new Set(transacoes.map(t => t.categoria))].map(cat => (
                      <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                    ))}
                  </select>

                  <select value={filtroFuncionario} onChange={(e) => setFiltroFuncionario(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-xs outline-none focus:border-brand text-text-base cursor-pointer transition-colors">
                    <option value="todos">Toda a Equipe</option>
                    {equipe.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[600px] hide-scrollbar">
                {transacoesFiltradas.length === 0 ? (
                  <div className="p-16 text-center">
                    <Receipt size={40} className="mx-auto text-text-muted mb-4 opacity-50" />
                    <h3 className="font-bold text-lg text-text-base mb-1">Nenhum lançamento</h3>
                    <p className="text-text-muted text-sm">Ajuste os filtros ou crie uma nova transação.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border-line">
                    {transacoesFiltradas.map((t) => (
                      <li key={t.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-background/40 transition-colors group gap-4">
                        <div className="flex items-start sm:items-center gap-4">
                          <button 
                            onClick={() => handleMudarStatusAoClicar(t)}
                            className={`shrink-0 h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                              t.status === 'concluido' ? 'bg-brand border-brand text-white' : 'border-border-line bg-surface hover:border-brand text-transparent'
                            }`}
                            title={t.status === 'concluido' ? 'Marcar como pendente' : 'Marcar como concluído'}
                          >
                            <Check size={14} className="stroke-[3px]" />
                          </button>
                          
                          <div>
                            <p className="font-bold text-sm text-text-base leading-tight mb-1.5">{t.descricao}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-bold flex-wrap">
                              <span className="bg-background border border-border-line px-2 py-0.5 rounded-md uppercase tracking-wider">{t.categoria.replace('_', ' ')}</span>
                              {t.recorrente && <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-md uppercase">Fixo</span>}
                              {t.funcionario_id && (
                                <span className="bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-md uppercase">
                                  {t.tipo_pagamento_funcionario}: {t.funcionario?.nome.split(' ')[0]}
                               </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pl-10 sm:pl-0">
                          <span className={`font-black text-sm whitespace-nowrap ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                            {t.tipo === 'entrada' ? '+' : '-'} R$ {formatarParaMoedaExibicao(t.valor)}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => abrirEdicaoTransacao(t)} className="text-text-muted hover:text-brand p-2 rounded-lg bg-background border border-border-line sm:border-transparent sm:bg-transparent hover:bg-background sm:hover:border-border-line transition-all cursor-pointer" title="Editar">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeletarTransacaoClick(t)} className="text-text-muted hover:text-red-500 p-2 rounded-lg bg-background border border-border-line sm:border-transparent sm:bg-transparent hover:bg-red-50 sm:hover:border-red-100 transition-all cursor-pointer" title="Excluir">
                              <Trash2 size={16} />
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
        </div>
      )}

      {subAba === 'categorias' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">
          
          <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm h-fit">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-black flex items-center gap-2">
                <FolderPlus size={18} className="text-brand"/> 
                {editingCategoria ? 'Editar Categoria' : 'Criar Categoria'}
              </h2>
              {editingCategoria && (
                <button onClick={fecharFormularioCategoria} className="text-text-muted hover:text-text-base bg-background p-1.5 rounded-full border border-border-line transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              )}
            </div>
            
            <form onSubmit={handleSalvarCategoria} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome da Categoria *</label>
                <input required type="text" value={novaCatNome} onChange={(e) => setNovaCatNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand" placeholder="Ex: Marketing Digital" />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">Destinação *</label>
                <p className="text-[10px] text-text-muted mb-2">Selecione uma ou ambas: Entrada e/ou Saída.</p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 bg-background border border-border-line px-4 py-3 rounded-xl cursor-pointer hover:border-brand">
                    <input
                      type="checkbox"
                      checked={novaCatTipos.includes('entrada')}
                      onChange={() => setNovaCatTipos((prev) => toggleTipoLista(prev, 'entrada'))}
                      className="accent-brand"
                    />
                    <span className="text-sm font-bold text-green-600">Entrada (Receitas)</span>
                  </label>
                  <label className="flex items-center gap-2 bg-background border border-border-line px-4 py-3 rounded-xl cursor-pointer hover:border-brand">
                    <input
                      type="checkbox"
                      checked={novaCatTipos.includes('saida')}
                      onChange={() => setNovaCatTipos((prev) => toggleTipoLista(prev, 'saida'))}
                      className="accent-brand"
                    />
                    <span className="text-sm font-bold text-red-500">Saída (Despesas)</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 mt-2 rounded-xl text-sm transition-all shadow-md cursor-pointer">
                {editingCategoria ? 'Salvar Edição' : 'Criar Nova Categoria'}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-surface rounded-2xl border border-border-line shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border-line">
              <h2 className="text-base font-black flex items-center gap-2"><Tag size={18}/> Suas Categorias Personalizadas</h2>
            </div>
            {categoriasCustom.length === 0 ? (
              <div className="p-16 text-center">
                <Tag size={40} className="mx-auto text-text-muted mb-4 opacity-50" />
                <p className="text-text-base font-bold mb-1">Catálogo vazio</p>
                <p className="text-text-muted text-sm">Crie categorias para organizar o seu fluxo de caixa.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border-line">
                {categoriasCustom.map(c => (
                  <li key={c.id} className="p-5 flex justify-between items-center hover:bg-background/50 transition-colors group">
                    <span className="font-bold text-sm text-text-base">{c.nome}</span>
                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {parseTiposCategoria(c.tipo).map((t) => (
                        <span key={t} className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${t === 'entrada' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>{t}</span>
                      ))}
                    </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEdicaoCategoria(c)} className="text-text-muted hover:text-brand p-2 rounded-lg hover:bg-background border border-transparent hover:border-border-line transition-all cursor-pointer md:opacity-0 group-hover:opacity-100">
                          <Edit2 size={16}/>
                        </button>
                        <button onClick={() => handleVerificarDelecaoCategoria(c)} className="text-text-muted hover:text-red-500 p-2 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer md:opacity-0 group-hover:opacity-100">
                          <Trash2 size={16}/>
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

      {/* 🚀 MODAL: APAGAR LANÇAMENTO RECORRENTE */}
      {deleteRecurringModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setDeleteRecurringModal({ isOpen: false, transacao: null })} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-1 rounded-lg bg-background transition-colors cursor-pointer"><X size={16} /></button>
            <div className="mt-2">
              <div className="mx-auto h-16 w-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-text-base mb-2 text-center">Excluir Recorrência</h3>
              <p className="text-sm text-text-muted mb-6 text-center leading-relaxed">Esta conta faz parte de uma série mensal. Como deseja prosseguir?</p>
              
              <div className="flex flex-col gap-2">
                <button onClick={() => confirmarExclusaoRecorrente('unica')} className="p-3.5 bg-background border border-border-line rounded-xl text-sm font-bold text-text-base hover:border-brand transition-colors text-left cursor-pointer">
                  Apagar apenas este mês
                </button>
                <button onClick={() => confirmarExclusaoRecorrente('proximas')} className="p-3.5 bg-background border border-border-line rounded-xl text-sm font-bold text-text-base hover:border-brand transition-colors text-left cursor-pointer">
                  Apagar este e os futuros (Cancelar)
                </button>
                <button onClick={() => confirmarExclusaoRecorrente('todas')} className="p-3.5 bg-red-500/10 text-red-600 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-colors text-left cursor-pointer">
                  Apagar todo o histórico desta conta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODAL: DELETAR CATEGORIA E MIGRAR */}
      {migrationModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface border border-border-line w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setMigrationModal({ isOpen: false, oldCat: null, newCatName: '' })} className="absolute right-4 top-4 text-text-muted hover:text-text-base p-1 rounded-lg bg-background transition-colors cursor-pointer"><X size={16} /></button>
            <div className="mt-2">
              <div className="mx-auto h-16 w-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle size={32} />
              </div>
              
              <h3 className="text-xl font-black text-text-base mb-2 text-center">Categoria em Uso</h3>
              <p className="text-sm text-text-muted mb-6 leading-relaxed text-center">
                Existem lançamentos usando a categoria <strong className="text-text-base">{migrationModal.oldCat?.nome}</strong>. Para evitar contas sem classificação, selecione para onde deseja movê-las:
              </p>
              
              <form onSubmit={confirmarMigracaoEExclusao}>
                <div className="mb-6">
                  <select required value={migrationModal.newCatName} onChange={(e) => setMigrationModal({ ...migrationModal, newCatName: e.target.value })} className="w-full rounded-xl bg-background border border-border-line p-3.5 text-sm font-bold outline-none text-text-base focus:border-brand cursor-pointer">
                    <option value="" disabled>Escolher nova categoria...</option>
                    {migrationModal.oldCat?.tipo === 'entrada' ? (
                      <>
                        <option value="servico">Serviço de Corte/Barba</option>
                        <option value="produto">Venda de Produto</option>
                        {categoriasCustom.filter(c => parseTiposCategoria(c.tipo).includes('entrada') && c.id !== migrationModal.oldCat?.id).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        <option value="outros">Outras Receitas</option>
                      </>
                    ) : (
                      <>
                        <option value="despesa_fixa">Conta Fixa</option>
                        <option value="vale_funcionario">Vale / Adiantamento</option>
                        <option value="pagamento_equipe">Folha de Pagamento</option>
                        <option value="produto">Reposição de Estoque</option>
                        {categoriasCustom.filter(c => parseTiposCategoria(c.tipo).includes('saida') && c.id !== migrationModal.oldCat?.id).map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        <option value="outros">Outros Custos</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setMigrationModal({ isOpen: false, oldCat: null, newCatName: '' })} className="flex-1 p-3.5 rounded-xl bg-background border border-border-line text-text-base font-bold hover:bg-border-line transition-colors cursor-pointer">Cancelar</button>
                  <button type="submit" className="flex-1 p-3.5 rounded-xl text-white font-bold transition-colors cursor-pointer bg-brand hover:bg-brand-hover shadow-md">Transferir e Excluir</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ProSection
        featureKey={FEATURE_KEYS.FINANCEIRO_INTELIGENTE}
        title="Financeiro Inteligente"
        description="Gráficos, exportação e visão consolidada — Horza Pro."
        overlay
      >
        <FinanceiroInteligenteBlock />
      </ProSection>

      <ProSection
        featureKey={FEATURE_KEYS.COMISSAO_CONTROLE}
        title="Comissões integradas"
        description="Folha de pagamento e extrato por barbeiro — Horza Plus."
        overlay
      >
        <ComissaoPlusBlock />
      </ProSection>

      <HistoricoMudancas barbeariaId={profile?.barbearia_id} modulo="financeiro" />

    </div>
  );
}