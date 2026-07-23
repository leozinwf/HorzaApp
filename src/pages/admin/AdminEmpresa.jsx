import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext'; // ✨ Importando o novo Hook
import { supabase } from '../../services/supabaseClient';
import { uploadImagemBarbearia } from '../../utils/uploadBarbearia';
import { Building2, Save, MapPin, Clock, FileText, Phone, AtSign, Image } from 'lucide-react';
import ProSection from '../../components/shared/ProSection';
import PersonalizacaoMarcaPanel from '../../components/admin/PersonalizacaoMarcaPanel';
import QrCodeCadeiraPanel from '../../components/admin/QrCodeCadeiraPanel';
import { FEATURE_KEYS } from '../../constants/planFeatures';

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
    const [logoUrl, setLogoUrl] = useState('');
    const [capaUrl, setCapaUrl] = useState('');
    const [corPrimaria, setCorPrimaria] = useState('#b8924a');
    const [slugEmpresa, setSlugEmpresa] = useState('');
    const [enviandoLogo, setEnviandoLogo] = useState(false);
    const [enviandoCapa, setEnviandoCapa] = useState(false);

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
                if (data.logo_url) setLogoUrl(data.logo_url);
                if (data.capa_url) setCapaUrl(data.capa_url);
                if (data.cor_primaria) setCorPrimaria(data.cor_primaria);
                if (data.slug) setSlugEmpresa(data.slug);
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

    const handleUploadLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEnviandoLogo(true);
        try {
            const url = await uploadImagemBarbearia(profile.barbearia_id, file, 'logo');
            setLogoUrl(url);
            showAlert('Foto enviada', 'Clique em Guardar para publicar na listagem do app.', 'success');
        } catch {
            showAlert('Upload indisponível', 'Use o campo de URL ou configure o bucket "barbearias" no Supabase Storage.', 'error');
        } finally {
            setEnviandoLogo(false);
        }
    };

    const handleUploadCapa = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setEnviandoCapa(true);
        try {
            const url = await uploadImagemBarbearia(profile.barbearia_id, file, 'capa');
            setCapaUrl(url);
            showAlert('Capa enviada', 'Clique em Guardar para publicar na página da barbearia.', 'success');
        } catch {
            showAlert('Upload indisponível', 'Use o campo de URL ou configure o bucket "barbearias" no Supabase Storage.', 'error');
        } finally {
            setEnviandoCapa(false);
        }
    };

    const handleAtualizarEmpresa = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('barbearias').update({
                nome, razao_social: razaoSocial, cnpj, telefone, cep, rua, numero, bairro, cidade, estado,
                chave_pix: chavePix, gateway_pagamento: gateway, redes_sociais: { instagram },
                hora_abertura: `${horaAbertura}:00`, hora_fechamento: `${horaFechamento}:00`, dias_funcionamento: diasFuncionamento,
                logo_url: logoUrl || null,
                capa_url: capaUrl || null,
                cor_primaria: corPrimaria || null,
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

                {/* FOTO NA LISTAGEM DO APP */}
                <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm space-y-5">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Image size={20} className="text-brand" /> Foto da Barbearia (Listagem)</h3>
                    <p className="text-sm text-text-muted mb-4">Miniatura exibida na home do Horza App. Recomendado: quadrado ou 4:3.</p>

                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="w-32 h-32 rounded-2xl border border-border-line overflow-hidden bg-background shrink-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-bold text-center p-2">Sem foto</div>
                            )}
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                            <label className="block text-xs font-bold text-text-muted uppercase">URL da imagem</label>
                            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" />
                            <label className="inline-flex items-center gap-2 bg-background border border-border-line px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:border-brand">
                                <Image size={16} /> {enviandoLogo ? 'Enviando...' : 'Enviar arquivo'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} disabled={enviandoLogo} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* CAPA DA PÁGINA DA BARBEARIA */}
                <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm space-y-5">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Image size={20} className="text-brand" /> Imagem de Capa (Banner)</h3>
                    <p className="text-sm text-text-muted mb-4">Banner no topo da página da barbearia. Recomendado: horizontal (16:9 ou 3:1).</p>

                    <div className="flex flex-col gap-4">
                        <div className="w-full h-36 md:h-44 rounded-2xl border border-border-line overflow-hidden bg-background">
                            {capaUrl ? (
                                <img src={capaUrl} alt="Capa" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-muted text-xs font-bold">Sem capa</div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-text-muted uppercase">URL da capa</label>
                            <input value={capaUrl} onChange={(e) => setCapaUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl bg-background border border-border-line p-3 text-sm focus:border-brand outline-none" />
                            <label className="inline-flex items-center gap-2 bg-background border border-border-line px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:border-brand">
                                <Image size={16} /> {enviandoCapa ? 'Enviando...' : 'Enviar capa'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleUploadCapa} disabled={enviandoCapa} />
                            </label>
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

                <ProSection
                    featureKey={FEATURE_KEYS.PERSONALIZACAO_COR}
                    title="Personalização da marca"
                    description="Cor primária e identidade visual — Horza Pro."
                    overlay
                >
                    <PersonalizacaoMarcaPanel
                      barbeariaId={profile?.barbearia_id}
                      corInicial={corPrimaria}
                      slug={slugEmpresa}
                      onSaved={setCorPrimaria}
                    />
                </ProSection>

                <ProSection
                    featureKey={FEATURE_KEYS.QR_CODE_CADEIRA}
                    title="QR Code na cadeira"
                    description="Agendamento rápido por profissional — Horza Pro."
                    overlay
                >
                    <QrCodeCadeiraPanel
                      barbeariaId={profile?.barbearia_id}
                      slug={slugEmpresa}
                      nomeBarbearia={nome}
                    />
                </ProSection>

                <div className="sticky bottom-24 md:bottom-8 z-10 flex justify-end">
                    <button type="submit" disabled={saving} className="bg-brand hover:bg-brand-hover text-white font-bold px-8 py-4 rounded-xl cursor-pointer shadow-xl shadow-brand/20 transition-all flex items-center gap-2">
                        <Save size={20} /> {saving ? 'A Guardar as Alterações...' : 'Guardar Todas as Configurações'}
                    </button>
                </div>

            </form>
        </div>
    );
}