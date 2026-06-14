import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { Building2, Save, FileText, MapPin, AtSign, ShieldAlert } from 'lucide-react';

export default function AdminEmpresa() {
    const { profile } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estados dos inputs
    const [nome, setNome] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [endereco, setEndereco] = useState('');
    const [instagram, setInstagram] = useState('');
    const [plano, setPlano] = useState('free');

    useEffect(() => {
        if (profile?.barbearia_id) {
            buscarDadosEmpresa();
        }
    }, [profile]);

    const buscarDadosEmpresa = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('barbearias')
                .select('*')
                .eq('id', profile.barbearia_id)
                .single();

            if (error) throw error;

            if (data) {
                setNome(data.nome || '');
                setCnpj(data.cnpj || '');
                setEndereco(data.endereco || '');
                setPlano(data.plano_ativo || 'free');

                // Trata o JSON das redes sociais de forma segura
                if (data.redes_sociais && data.redes_sociais.instagram) {
                    setInstagram(data.redes_sociais.instagram);
                }
            }
        } catch (err) {
            console.error('Erro ao buscar dados da barbearia:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAtualizarEmpresa = async (e) => {
        e.preventDefault();
        if (!nome) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('barbearias')
                .update({
                    nome,
                    cnpj,
                    endereco,
                    redes_sociais: { instagram } // Salva como objeto JSONB estruturado
                })
                .eq('id', profile.barbearia_id);

            if (error) throw error;
            alert('Informações da empresa atualizadas com sucesso!');
        } catch (err) {
            alert('Erro ao atualizar empresa: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-text-muted text-sm">
                Carregando dados institucionais...
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-3xl">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-text-base">Dados da Empresa</h1>
                <p className="text-sm text-text-muted">Mantenha as informações comerciais e de localização atualizadas para seus clientes.</p>
            </header>

            {/* Alerta de Perfil do Plano */}
            <div className="mb-8 p-4 bg-brand/5 border border-brand/20 rounded-2xl flex items-center gap-4">
                <div className="bg-brand/10 p-3 rounded-xl text-brand">
                    <Building2 size={24} />
                </div>
                <div>
                    <p className="text-sm font-bold text-text-base">Plano de Assinatura Atual: <span className="text-brand uppercase font-black">{plano}</span></p>
                    <p className="text-xs text-text-muted mt-0.5">Parceiro Piloto Fundador com acesso ilimitado concedido pelo desenvolvedor.</p>
                </div>
            </div>

            <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border-line shadow-sm">
                <form onSubmit={handleAtualizarEmpresa} className="space-y-5">

                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase mb-1.5 flex items-center gap-1">
                            Nome Comercial da Barbearia
                        </label>
                        <div className="relative">
                            <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base font-medium" placeholder="Ex: Barbearia Dom Pedro" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5 flex items-center gap-1">
                                <FileText size={14} /> CNPJ (Opcional)
                            </label>
                            <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base" placeholder="00.000.000/0001-00" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5 flex items-center gap-1">
                                <AtSign size={14} /> Instagram da Barbearia
                            </label>
                            <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base" placeholder="@barbearia_exemplo" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase mb-1.5 flex items-center gap-1">
                            <MapPin size={14} /> Endereço Completo
                        </label>
                        <input required type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="w-full rounded-xl bg-background border border-border-line p-3 text-sm outline-none focus:border-brand text-text-base" placeholder="Ex: Av. das Nações, 450 - Centro, São Paulo - SP" />
                    </div>

                    {/* Bloqueio de segurança caso um "Gerente" tente salvar (Apenas Dono/Admin pode mexer aqui) */}
                    {profile?.role !== 'admin' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-600 font-semibold">
                            <ShieldAlert size={16} /> Apenas o Administrador Dono possui permissão para salvar alterações nestes dados.
                        </div>
                    )}

                    <div className="pt-4 border-t border-border-line flex justify-end">
                        <button
                            type="submit"
                            disabled={saving || profile?.role !== 'admin'}
                            className="bg-brand hover:bg-brand-hover disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                        >
                            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Informações'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}