import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext'; // ✨ Importando o novo Hook
import { supabase } from '../../services/supabaseClient';
import { Building2, Save, MapPin, DollarSign, CreditCard, Zap, Clock, FileText, Phone, AtSign } from 'lucide-react';

export default function AdminEmpresa() {
    const { profile } = useAuth();
    const { showAlert } = useModal(); // ✨ Iniciando o disparador de alertas
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estados dos Dados Principais e Contato
    const [nome, setNome] = useState('');
    const [razaoSocial, setRazaoSocial] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [telefone, setTelefone] = useState('');
    const [instagram, setInstagram] = useState('');

    // Estados de Endereço Detalhado
    const [cep, setCep] = useState('');
    const [rua, setRua] = useState('');
    const [numero, setNumero] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidade, setCidade] = useState('');
    const [estado, setEstado] = useState('');

    // Estados Financeiros
    const [chavePix, setChavePix] = useState('');
    const [gateway, setGateway] = useState('nenhum');

    // Estados de Horário de Funcionamento
    const [horaAbertura, setHoraAbertura] = useState('09:00');
    const [horaFechamento, setHoraFechamento] = useState('19:00');
    const [diasFuncionamento, setDiasFuncionamento] = useState([1, 2, 3, 4, 5, 6]);

    const DIAS_SEMANA = [
        { id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' },
        { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }
    ];

    useEffect(() => {
        if (profile?.barbearia_id) buscarDadosEmpresa();
    }, [profile]);

    const buscarDadosEmpresa = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('barbearias').select('*').eq('id', profile.barbearia_id).single();
            if (error) throw error;
            if (data) {
                setNome(data.nome || '');
                setRazaoSocial(data.razao_social || '');
                setCnpj(data.cnpj || '');
                setTelefone(data.telefone || '');
                setCep(data.cep || '');
                setRua(data.rua || data.endereco || '');
                setNumero(data.numero || '');
                setBairro(data.bairro || '');
                setCidade(data.cidade || '');
                setEstado(data.estado || '');

                setChavePix(data.chave_pix || '');
                setGateway(data.gateway_pagamento || 'nenhum');
                if (data.redes_sociais?.instagram) setInstagram(data.redes_sociais.instagram);

                if (data.hora_abertura) setHoraAbertura(data.hora_abertura.substring(0, 5));
                if (data.hora_fechamento) setHoraFechamento(data.hora_fechamento.substring(0, 5));
                if (data.dias_funcionamento) setDiasFuncionamento(data.dias_funcionamento);
            }
        } catch (err) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const buscarCep = async (valorCep) => {
        const cepLimpo = valorCep.replace(/\D/g, '');
        setCep(valorCep);
        if (cepLimpo.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setRua(data.logradouro);
                    setBairro(data.bairro);
                    setCidade(data.localidade);
                    setEstado(data.uf);
                    document.getElementById('input-numero')?.focus();
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            }
        }
    };

    const toggleDia = (idDia) => {
        setDiasFuncionamento(prev => prev.includes(idDia) ? prev.filter(d => d !== idDia) : [...prev, idDia]);
    };

    const handleAtualizarEmpresa = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('barbearias').update({
                nome, razao_social: razaoSocial, cnpj, telefone, cep, rua, numero, bairro, cidade, estado,
                chave_pix: chavePix, gateway_pagamento: gateway, redes_sociais: { instagram },
                hora_abertura: `${horaAbertura}:00`, hora_fechamento: `${horaFechamento}:00`, dias_funcionamento: diasFuncionamento
            }).eq('id', profile.barbearia_id);

            if (error) throw error;
            // ✨ ALERTA ELEGANTE DE SUCESSO AQUI ✨
            showAlert('Tudo Certo!', 'As informações da empresa foram atualizadas com sucesso.', 'success');
        } catch (err) {
            // ✨ ALERTA ELEGANTE DE ERRO AQUI ✨
            showAlert('Ops!', 'Ocorreu um erro ao salvar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl space-y-8 mb-20 mx-auto">
            <header>
                <h1 className="text-2xl font-black text-text-base">Dados da Empresa</h1>
                <p className="text-sm text-text-muted mt-1">Configure o perfil público e as regras de funcionamento da sua barbearia.</p>
            </header>

            <form onSubmit={handleAtualizarEmpresa} className="space-y-8">

                {/* 1. DADOS PRINCIPAIS E CONTATO */}
                <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm space-y-5">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Building2 size={20} className="text-brand" /> Informações Principais</h3>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome Fantasia (Público) *</label>
                            <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="Ex: Barbearia Dom Pedro" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">Razão Social</label>
                            <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="Ex: Dom Pedro Barbearia LTDA" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1"><FileText size={14} /> CNPJ</label>
                            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="00.000.000/0001-00" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1"><Phone size={14} /> Telefone Comercial</label>
                            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="(11) 99999-9999" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1 flex items-center gap-1"><AtSign size={14} /> Instagram</label>
                            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="@suabarbearia" />
                        </div>
                    </div>
                </div>

                {/* 2. ENDEREÇO DETALHADO */}
                <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm space-y-5">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin size={20} className="text-brand" /> Endereço</h3>

                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">CEP</label>
                            <input value={cep} onChange={(e) => buscarCep(e.target.value)} maxLength="9" className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="00000-000" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">Rua / Logradouro</label>
                            <input value={rua} onChange={(e) => setRua(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="Av. das Nações" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">Número</label>
                            <input id="input-numero" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="123" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">Bairro</label>
                            <input value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="Centro" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">Cidade</label>
                            <input value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="São Paulo" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1">Estado (UF)</label>
                            <input value={estado} onChange={(e) => setEstado(e.target.value)} maxLength="2" className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none uppercase" placeholder="SP" />
                        </div>
                    </div>
                </div>

                {/* 3. HORÁRIO DE FUNCIONAMENTO */}
                <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock size={20} className="text-brand" /> Horário Padrão da Loja</h3>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-text-muted uppercase mb-3">Dias Abertos</label>
                        <div className="flex flex-wrap gap-2">
                            {DIAS_SEMANA.map(dia => (
                                <button key={dia.id} type="button" onClick={() => toggleDia(dia.id)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${diasFuncionamento.includes(dia.id) ? 'bg-brand text-white shadow-sm' : 'bg-background border border-border-line text-text-muted hover:border-brand/50'}`}>
                                    {dia.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Abre às</label>
                            <input type="time" value={horaAbertura} onChange={(e) => setHoraAbertura(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Fecha às</label>
                            <input type="time" value={horaFechamento} onChange={(e) => setHoraFechamento(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" />
                        </div>
                    </div>
                </div>

                {/* 4. DADOS BANCÁRIOS / PIX */}
                <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><DollarSign size={20} className="text-brand" /> Recebimentos</h3>
                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase mb-2">Chave PIX Oficial da Barbearia</label>
                        <input type="text" value={chavePix} onChange={(e) => setChavePix(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" placeholder="CNPJ, E-mail, Telefone ou Chave Aleatória" />
                    </div>
                </div>

                <div className="sticky bottom-24 md:bottom-8 z-10 flex justify-end">
                    <button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover text-white font-bold px-8 py-4 rounded-xl cursor-pointer shadow-xl shadow-brand/20 transition-all flex items-center gap-2">
                        <Save size={20} /> {saving ? 'A Guardar as Alterações...' : 'Guardar Todas as Configurações'}
                    </button>
                </div>

            </form>
        </div>
    );
}