import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Shield, Users, CalendarCheck, TrendingUp, Edit, ExternalLink, X, MapPin, Building2, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardMaster() {
  const [empresas, setEmpresas] = useState([]);
  const [resumo, setResumo] = useState({ totalBarbearias: 0, totalUsuarios: 0, totalAgendamentos: 0, premium: 0 });
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregarDados = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('barbearias')
      .select(`
        *,
        usuarios (count),
        agendamentos (count)
      `)
      .order('criado_em', { ascending: false });

    if (!error && data) {
      setEmpresas(data);
      
      // Calcula as Métricas Globais do App
      const totalB = data.length;
      const totalU = data.reduce((acc, curr) => acc + (curr.usuarios?.[0]?.count || 0), 0);
      const totalA = data.reduce((acc, curr) => acc + (curr.agendamentos?.[0]?.count || 0), 0);
      const premium = data.filter(b => b.plano_ativo !== 'free' && b.plano_ativo !== 'nenhum').length;

      setResumo({ totalBarbearias: totalB, totalUsuarios: totalU, totalAgendamentos: totalA, premium });
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Funções do Modal de Edição
  const abrirModalEdicao = (empresa) => {
    setEmpresaEditando({ ...empresa });
    setIsModalOpen(true);
  };

  const fecharModal = () => {
    setIsModalOpen(false);
    setEmpresaEditando(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmpresaEditando(prev => ({ ...prev, [name]: value }));
  };

  const salvarEdicao = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      const { error } = await supabase
        .from('barbearias')
        .update({
          nome: empresaEditando.nome,
          slug: empresaEditando.slug,
          cnpj: empresaEditando.cnpj,
          telefone: empresaEditando.telefone,
          cidade: empresaEditando.cidade,
          estado: empresaEditando.estado,
          plano_ativo: empresaEditando.plano_ativo
        })
        .eq('id', empresaEditando.id);

      if (error) {
        if (error.code === '23505') throw new Error('Este SLUG (URL) já está em uso por outra barbearia.');
        throw error;
      }

      alert('Empresa atualizada com sucesso!');
      fecharModal();
      carregarDados(); // Recarrega a lista para mostrar os dados atualizados
    } catch (err) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-background min-h-screen pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 shadow-sm">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text-base">Painel Master</h1>
            <p className="text-text-muted font-medium">Controle total da plataforma HorzaApp</p>
          </div>
        </div>

        {/* MÉTRICAS GLOBAIS */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-brand mb-2"><Building2 size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Barbearias</p>
              <p className="text-2xl font-black text-text-base">{resumo.totalBarbearias}</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-blue-500 mb-2"><Users size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Usuários Totais</p>
              <p className="text-2xl font-black text-text-base">{resumo.totalUsuarios}</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-green-500 mb-2"><CalendarCheck size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Agendamentos</p>
              <p className="text-2xl font-black text-text-base">{resumo.totalAgendamentos}</p>
            </div>
            <div className="bg-surface p-5 rounded-2xl border border-border-line shadow-sm">
              <div className="text-amber-500 mb-2"><Crown size={24} /></div>
              <p className="text-[10px] font-black uppercase text-text-muted">Planos Premium</p>
              <p className="text-2xl font-black text-text-base">{resumo.premium}</p>
            </div>
          </div>
        )}

        {/* LISTA DE EMPRESAS */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-text-base flex items-center gap-2">
            <TrendingUp className="text-brand" size={20} /> Empresas Cadastradas
          </h2>

          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full"></div></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {empresas.map((emp) => (
                <div key={emp.id} className="bg-surface border border-border-line p-6 rounded-3xl shadow-sm hover:border-brand/40 transition-colors">
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-black text-text-base">{emp.nome}</h3>
                      <p className="text-sm text-text-muted flex items-center gap-1 mt-1">
                        <MapPin size={14} /> {emp.cidade ? `${emp.cidade} - ${emp.estado}` : 'Sem endereço'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg tracking-wider ${emp.plano_ativo === 'premium' ? 'bg-amber-500/10 text-amber-500' : 'bg-background border border-border-line text-text-muted'}`}>
                      {emp.plano_ativo || 'Free'}
                    </span>
                  </div>

                  <div className="flex gap-4 mb-6 pb-6 border-b border-border-line">
                    <div className="flex-1 bg-background rounded-xl p-3 text-center border border-border-line">
                      <p className="text-[10px] font-black uppercase text-text-muted mb-0.5">Membros</p>
                      <p className="text-lg font-black text-text-base">{emp.usuarios?.[0]?.count || 0}</p>
                    </div>
                    <div className="flex-1 bg-background rounded-xl p-3 text-center border border-border-line">
                      <p className="text-[10px] font-black uppercase text-text-muted mb-0.5">Reservas</p>
                      <p className="text-lg font-black text-text-base">{emp.agendamentos?.[0]?.count || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => abrirModalEdicao(emp)}
                      className="flex-1 bg-brand/10 text-brand py-2.5 rounded-xl text-sm font-bold hover:bg-brand hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Edit size={16} /> Editar
                    </button>
                    <Link 
                      to={`/${emp.slug}`} 
                      target="_blank"
                      className="flex-1 bg-background border border-border-line text-text-base py-2.5 rounded-xl text-sm font-bold hover:border-brand transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ExternalLink size={16} /> Visitar App
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DA BARBEARIA */}
      {isModalOpen && empresaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-surface border border-border-line w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl relative my-auto">
            
            <button onClick={fecharModal} className="absolute top-6 right-6 text-text-muted hover:text-red-500 transition-colors cursor-pointer">
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-black text-text-base mb-6 flex items-center gap-2">
              <Edit className="text-brand" /> Editar Empresa
            </h2>

            <form onSubmit={salvarEdicao} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Nome da Barbearia</label>
                  <input required name="nome" value={empresaEditando.nome || ''} onChange={handleChange} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
                </div>

                {/* Slug (URL) */}
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Slug (Link URL)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">app.com/</span>
                    <input required name="slug" value={empresaEditando.slug || ''} onChange={handleChange} className="w-full bg-background border border-border-line rounded-xl py-3 pr-3 pl-20 text-sm font-bold focus:border-brand outline-none lowercase" placeholder="nome-da-barbearia" />
                  </div>
                </div>

                {/* Plano Ativo */}
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Plano Ativo</label>
                  <select name="plano_ativo" value={empresaEditando.plano_ativo || 'free'} onChange={handleChange} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none cursor-pointer">
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                {/* CNPJ */}
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">CNPJ</label>
                  <input name="cnpj" value={empresaEditando.cnpj || ''} onChange={handleChange} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" placeholder="00.000.000/0001-00" />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Telefone</label>
                  <input name="telefone" value={empresaEditando.telefone || ''} onChange={handleChange} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" placeholder="(00) 00000-0000" />
                </div>

                {/* Cidade */}
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Cidade</label>
                  <input name="cidade" value={empresaEditando.cidade || ''} onChange={handleChange} className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none" />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs font-black text-text-muted uppercase mb-1.5">Estado (UF)</label>
                  <input name="estado" value={empresaEditando.estado || ''} onChange={handleChange} maxLength="2" className="w-full bg-background border border-border-line rounded-xl p-3 text-sm font-bold focus:border-brand outline-none uppercase" placeholder="SP" />
                </div>

              </div>

              <div className="pt-6 border-t border-border-line flex gap-3">
                <button type="button" onClick={fecharModal} className="flex-1 bg-background border border-border-line py-3.5 rounded-xl text-sm font-bold text-text-base hover:border-brand transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex-1 bg-brand text-white py-3.5 rounded-xl text-sm font-black hover:brightness-105 transition-colors disabled:opacity-50 cursor-pointer">
                  {salvando ? 'Salvando...' : 'Salvar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}