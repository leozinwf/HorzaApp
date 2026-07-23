import { useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';

import { supabase } from '../../services/supabaseClient';

import { Coins, Gift, Plus, Trash2, Zap, Package } from 'lucide-react';

import CurrencyInput from 'react-currency-input-field';

import toast from 'react-hot-toast';

import { auditLogService } from '../../services/auditLogService';

import HistoricoMudancas from '../../components/admin/HistoricoMudancas';

import ProSection from '../../components/shared/ProSection';

import { FidelidadeAvancadaBlock } from '../../components/shared/ProModuleBlocks';

import { FEATURE_KEYS } from '../../constants/planFeatures';

import { parseMoedaBRL } from '../../utils/formatters';



const PACOTES_KEY = 'horza_pacotes_fidelidade_';



const carregarPacotesLocal = (barbeariaId) => {

  try {

    const raw = localStorage.getItem(`${PACOTES_KEY}${barbeariaId}`);

    return raw ? JSON.parse(raw) : [];

  } catch {

    return [];

  }

};



const salvarPacotesLocal = (barbeariaId, pacotes) => {

  localStorage.setItem(`${PACOTES_KEY}${barbeariaId}`, JSON.stringify(pacotes));

};



export default function AdminFidelidade() {

  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);

  const [salvando, setSalvando] = useState(false);

  const [recompensas, setRecompensas] = useState([]);

  const [pacotes, setPacotes] = useState([]);

  const [novaRecompensa, setNovaRecompensa] = useState({ titulo: '', descricao: '', pontos_necessarios: '' });

  const [novoPacote, setNovoPacote] = useState({ titulo: '', quantidade: '', preco: '', validade_dias: '30' });



  useEffect(() => {

    if (profile?.barbearia_id) carregarDados();

  }, [profile]);



  const carregarDados = async () => {

    setLoading(true);

    try {

      const { data } = await supabase.from('recompensas_fidelidade').select('*').eq('barbearia_id', profile.barbearia_id).order('pontos_necessarios', { ascending: true });

      if (data) setRecompensas(data);

      setPacotes(carregarPacotesLocal(profile.barbearia_id));

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };



  const criarRecompensa = async (e) => {

    e.preventDefault();

    if (!novaRecompensa.titulo || !novaRecompensa.pontos_necessarios) return;

    setSalvando(true);

    try {

      const { data, error } = await supabase.from('recompensas_fidelidade').insert([{

        barbearia_id: profile.barbearia_id,

        titulo: novaRecompensa.titulo,

        descricao: novaRecompensa.descricao,

        pontos_necessarios: parseInt(novaRecompensa.pontos_necessarios, 10),

        ativo: true

      }]).select().single();



      if (error) throw error;

      setRecompensas([...recompensas, data].sort((a, b) => a.pontos_necessarios - b.pontos_necessarios));

      setNovaRecompensa({ titulo: '', descricao: '', pontos_necessarios: '' });

      await auditLogService.registrar({

        barbeariaId: profile.barbearia_id,

        usuarioId: profile.id,

        usuarioNome: profile.nome,

        modulo: 'fidelidade',

        acao: 'criar',

        descricao: `Prêmio "${data.titulo}" criado`,

      });

      toast.success('Prêmio criado!');

    } catch (err) {

      toast.error('Erro ao criar prêmio.');

    } finally {

      setSalvando(false);

    }

  };



  const criarPacote = (e) => {

    e.preventDefault();

    if (!novoPacote.titulo || !novoPacote.quantidade || !novoPacote.preco) {

      toast.error('Preencha título, quantidade e preço do pacote.');

      return;

    }



    const pacote = {

      id: crypto.randomUUID(),

      titulo: novoPacote.titulo,

      quantidade: parseInt(novoPacote.quantidade, 10),

      preco: parseMoedaBRL(novoPacote.preco),

      validade_dias: parseInt(novoPacote.validade_dias, 10) || 30,

      criado_em: new Date().toISOString(),

    };



    const lista = [...pacotes, pacote];

    setPacotes(lista);

    salvarPacotesLocal(profile.barbearia_id, lista);

    setNovoPacote({ titulo: '', quantidade: '', preco: '', validade_dias: '30' });



    auditLogService.registrar({

      barbeariaId: profile.barbearia_id,

      usuarioId: profile.id,

      usuarioNome: profile.nome,

      modulo: 'fidelidade',

      acao: 'criar',

      descricao: `Pacote "${pacote.titulo}" criado`,

    });



    toast.success('Pacote/combo cadastrado!');

  };



  const deletarPacote = (id) => {

    if (!window.confirm('Remover este pacote?')) return;

    const pacote = pacotes.find((p) => p.id === id);

    const lista = pacotes.filter((p) => p.id !== id);

    setPacotes(lista);

    salvarPacotesLocal(profile.barbearia_id, lista);

    auditLogService.registrar({

      barbeariaId: profile.barbearia_id,

      usuarioId: profile.id,

      usuarioNome: profile.nome,

      modulo: 'fidelidade',

      acao: 'excluir',

      descricao: `Pacote "${pacote?.titulo}" removido`,

    });

  };



  const deletarRecompensa = async (id) => {

    if (!window.confirm('Tem certeza que deseja remover este prêmio?')) return;

    const rec = recompensas.find((r) => r.id === id);

    try {

      await supabase.from('recompensas_fidelidade').delete().eq('id', id);

      setRecompensas(recompensas.filter(r => r.id !== id));

      await auditLogService.registrar({

        barbeariaId: profile.barbearia_id,

        usuarioId: profile.id,

        usuarioNome: profile.nome,

        modulo: 'fidelidade',

        acao: 'excluir',

        descricao: `Prêmio "${rec?.titulo}" removido`,

      });

    } catch (err) {}

  };



  const preencherTemplate = (titulo, descricao, pontos) => {

    setNovaRecompensa({ titulo, descricao, pontos_necessarios: pontos });

  };



  if (loading) return <div className="flex justify-center p-10"><div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;



  return (

    <div className="w-full space-y-6 pb-6">

      <div className="bg-surface p-6 rounded-3xl border border-border-line shadow-sm">

        <div className="flex items-center gap-3 mb-2">

          <div className="bg-brand/10 p-2.5 rounded-xl text-brand"><Coins size={24} /></div>

          <div>

            <h1 className="text-xl font-black text-text-base">Prêmios de Fidelidade</h1>

            <p className="text-sm text-text-muted mt-0.5">Defina prêmios por moedas e pacotes/combos mensais.</p>

          </div>

        </div>

      </div>



      {/* PACOTES / COMBOS */}

      <ProSection featureKey={FEATURE_KEYS.FIDELIDADE_AVANCADA} overlay>

      <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm">

        <h2 className="text-sm font-black text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">

          <Package size={16} className="text-brand" /> Pacotes e Combos

        </h2>

        <p className="text-xs text-text-muted mb-4">Ex: 4 cortes mensais por um valor fixo promocional.</p>



        <form onSubmit={criarPacote} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">

          <div className="md:col-span-4">

            <label className="block text-[10px] font-black text-text-muted uppercase mb-2">Nome do pacote</label>

            <input required type="text" placeholder="Ex: 4 Cortes Mensais" value={novoPacote.titulo} onChange={(e) => setNovoPacote({ ...novoPacote, titulo: e.target.value })} className="w-full bg-background border border-border-line text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:border-brand" />

          </div>

          <div className="md:col-span-2">

            <label className="block text-[10px] font-black text-text-muted uppercase mb-2">Qtd. serviços</label>

            <input required type="number" min="1" placeholder="4" value={novoPacote.quantidade} onChange={(e) => setNovoPacote({ ...novoPacote, quantidade: e.target.value })} className="w-full bg-background border border-border-line text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:border-brand" />

          </div>

          <div className="md:col-span-3">

            <label className="block text-[10px] font-black text-text-muted uppercase mb-2">Preço do pacote</label>

            <CurrencyInput

              required

              placeholder="R$ 0,00"

              decimalsLimit={2}

              prefix="R$ "

              decimalSeparator=","

              groupSeparator="."

              value={novoPacote.preco}

              onValueChange={(value) => setNovoPacote({ ...novoPacote, preco: value })}

              className="w-full bg-background border border-border-line text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:border-brand"

            />

          </div>

          <div className="md:col-span-2">

            <label className="block text-[10px] font-black text-text-muted uppercase mb-2">Validade (dias)</label>

            <input type="number" min="1" value={novoPacote.validade_dias} onChange={(e) => setNovoPacote({ ...novoPacote, validade_dias: e.target.value })} className="w-full bg-background border border-border-line text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:border-brand" />

          </div>

          <div className="md:col-span-1">

            <button type="submit" className="w-full bg-brand text-white py-3 rounded-2xl font-black shadow-md hover:brightness-105 cursor-pointer"><Plus size={20} className="mx-auto" /></button>

          </div>

        </form>



        {pacotes.length > 0 && (

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {pacotes.map((pac) => (

              <div key={pac.id} className="bg-background border border-border-line rounded-2xl p-4 flex justify-between items-start">

                <div>

                  <h3 className="font-black text-text-base">{pac.titulo}</h3>

                  <p className="text-xs text-text-muted mt-1">{pac.quantidade} serviços · válido por {pac.validade_dias} dias</p>

                  <p className="text-sm font-black text-brand mt-2">R$ {Number(pac.preco).toFixed(2).replace('.', ',')}</p>

                </div>

                <button onClick={() => deletarPacote(pac.id)} className="text-text-muted hover:text-red-500 cursor-pointer p-1"><Trash2 size={16} /></button>

              </div>

            ))}

          </div>

        )}

      </div>

      </ProSection>



      <ProSection

        featureKey={FEATURE_KEYS.FIDELIDADE_AVANCADA}

        title="Fidelidade Avançada"

        description="Assinaturas mensais, níveis VIP e campanhas — Horza Pro."

        overlay

      >

        <FidelidadeAvancadaBlock />

      </ProSection>



      <div className="bg-surface border border-border-line rounded-3xl p-6 shadow-sm">

        <div className="mb-6 pb-6 border-b border-border-line">

          <h2 className="text-xs font-black text-text-base uppercase tracking-wider mb-3 flex items-center gap-2">

            <Zap size={16} className="text-amber-500" /> Configuração Rápida

          </h2>

          <div className="flex flex-wrap gap-2">

            <button type="button" onClick={() => preencherTemplate('Corte Grátis', 'Resgate um corte de cabelo 100% gratuito.', '200')} className="bg-background border border-border-line text-text-base px-4 py-2 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-colors cursor-pointer shadow-sm">

              Corte Grátis (200 moedas)

            </button>

            <button type="button" onClick={() => preencherTemplate('Sobrancelha Grátis', 'Alinhamento perfeito da sobrancelha.', '50')} className="bg-background border border-border-line text-text-base px-4 py-2 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-colors cursor-pointer shadow-sm">

              Sobrancelha (50 moedas)

            </button>

          </div>

        </div>



        <form onSubmit={criarRecompensa}>

          <h2 className="text-sm font-black text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2"><Plus size={16} className="text-brand"/> Adicionar Novo Prêmio</h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

            <div className="md:col-span-4">

              <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">O que o cliente ganha?</label>

              <input required type="text" placeholder="Ex: Pomada Modeladora" value={novaRecompensa.titulo} onChange={(e) => setNovaRecompensa({...novaRecompensa, titulo: e.target.value})} className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand" />

            </div>

            <div className="md:col-span-5">

              <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">Descrição Curta</label>

              <input type="text" placeholder="Ex: Leve uma pomada matte 150g" value={novaRecompensa.descricao} onChange={(e) => setNovaRecompensa({...novaRecompensa, descricao: e.target.value})} className="w-full bg-background border border-border-line text-sm font-bold text-text-base rounded-2xl px-4 py-3 outline-none focus:border-brand" />

            </div>

            <div className="md:col-span-3">

              <label className="block text-[10px] font-black text-brand uppercase tracking-wider mb-2">Preço (Moedas)</label>

              <div className="flex gap-2">

                <input required type="number" min="1" placeholder="Ex: 50" value={novaRecompensa.pontos_necessarios} onChange={(e) => setNovaRecompensa({...novaRecompensa, pontos_necessarios: e.target.value})} className="w-full bg-brand/5 border border-brand/20 text-sm font-black text-brand rounded-2xl px-4 py-3 outline-none focus:border-brand" />

                <button type="submit" disabled={salvando} className="bg-brand text-white px-4 py-3 rounded-2xl font-black shadow-md hover:brightness-105 cursor-pointer disabled:opacity-50"><Plus size={20} /></button>

              </div>

            </div>

          </div>

        </form>

      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {recompensas.map((rec) => (

          <div key={rec.id} className="bg-surface border border-border-line rounded-3xl p-5 shadow-sm relative overflow-hidden group">

            <div className="absolute -right-4 -top-4 bg-brand/5 p-6 rounded-full group-hover:scale-110 transition-transform"><Gift size={48} className="text-brand/20" /></div>

            <div className="relative z-10 flex flex-col h-full justify-between gap-4">

              <div>

                <div className="flex items-start justify-between mb-2">

                  <h3 className="font-black text-lg text-text-base pr-8">{rec.titulo}</h3>

                  <button onClick={() => deletarRecompensa(rec.id)} className="text-text-muted hover:text-red-500 cursor-pointer p-1"><Trash2 size={16} /></button>

                </div>

                <p className="text-xs font-medium text-text-muted">{rec.descricao || 'Sem descrição.'}</p>

              </div>

              <div className="mt-4 pt-4 border-t border-border-line flex items-center justify-between">

                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">Custo:</span>

                <span className="bg-brand/10 text-brand px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1.5"><Coins size={14} /> {rec.pontos_necessarios} moedas</span>

              </div>

            </div>

          </div>

        ))}

      </div>



      <HistoricoMudancas barbeariaId={profile?.barbearia_id} modulo="fidelidade" />

    </div>

  );

}


