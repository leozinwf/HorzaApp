import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { ShieldCheck, UserCheck, CalendarDays, AlertCircle, Lock, Save } from 'lucide-react';
import { isDono, SUPER_ADMIN_EMAIL, isSuperAdmin } from '../../constants/roles';
import { auditLogService } from '../../services/auditLogService';
import HistoricoMudancas from '../../components/admin/HistoricoMudancas';
import toast from 'react-hot-toast';

const CONFIG_KEY_PREFIX = 'horza_permissoes_perfis_';

const carregarPerfisAutorizados = (barbeariaId) => {
  try {
    const raw = localStorage.getItem(`${CONFIG_KEY_PREFIX}${barbeariaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export default function AdminPermissoes() {
  const { user, profile } = useAuth();
  const { adminBarbeariaId } = useOutletContext();
  const [equipe, setEquipe] = useState([]);
  const [rascunho, setRascunho] = useState({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [perfisAutorizados, setPerfisAutorizados] = useState([]);
  const [perfisRascunho, setPerfisRascunho] = useState([]);

  const dono = isDono(profile, user);
  const master = isSuperAdmin(user, profile);
  const podeGerenciar = dono || perfisAutorizados.includes(profile?.role);

  const idsAlterados = Object.keys(rascunho);
  const perfisAlterados =
    JSON.stringify([...perfisRascunho].sort()) !== JSON.stringify([...perfisAutorizados].sort());
  const temAlteracoes = idsAlterados.length > 0 || perfisAlterados;

  useEffect(() => {
    if (profile?.barbearia_id) {
      const perfis = carregarPerfisAutorizados(adminBarbeariaId);
      setPerfisAutorizados(perfis);
      setPerfisRascunho(perfis);
      buscarEquipe();
    }
  }, [profile]);

  const buscarEquipe = async () => {
    if (equipe.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, role, ativo, exibe_na_agenda')
        .eq('barbearia_id', adminBarbeariaId)
        .neq('role', 'cliente')
        .order('nome');

      if (error) throw error;
      const lista = (data || []).filter(
        (m) => m.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
      );
      setEquipe(lista);
      setRascunho({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getValor = (membro, campo) => {
    if (rascunho[membro.id]?.[campo] !== undefined) {
      return rascunho[membro.id][campo];
    }
    if (campo === 'exibe_na_agenda') return membro.exibe_na_agenda !== false;
    if (campo === 'ativo') return membro.ativo !== false;
    return membro[campo];
  };

  const alterarCampo = (id, campo, valor) => {
    if (!podeGerenciar) {
      toast.error('Somente o dono (ou perfis autorizados) pode alterar permissões.');
      return;
    }
    if (campo === 'role' && profile.role === 'gerente' && valor === 'admin') {
      toast.error('Gerentes não podem promover usuários a dono.');
      return;
    }
    setRascunho((prev) => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor },
    }));
  };

  const togglePerfilRascunho = (role) => {
    if (!dono) return;
    setPerfisRascunho((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const descartarAlteracoes = () => {
    setRascunho({});
    setPerfisRascunho([...perfisAutorizados]);
    toast('Alterações descartadas.', { icon: '↩️' });
  };

  const salvarAlteracoes = async () => {
    if (!podeGerenciar || !temAlteracoes) return;

    setSalvando(true);
    try {
      for (const id of idsAlterados) {
        const membro = equipe.find((m) => m.id === id);
        const updates = rascunho[id];
        const { data, error } = await supabase
          .from('usuarios')
          .update(updates)
          .eq('id', id)
          .select('id, role, ativo, exibe_na_agenda');

        if (error) throw error;
        if (!data?.length) throw new Error('Sem permissão para salvar alterações.');

        await auditLogService.registrar({
          barbeariaId: adminBarbeariaId,
          usuarioId: profile.id,
          usuarioNome: profile.nome,
          modulo: 'permissoes',
          acao: 'editar',
          descricao: `Permissões de "${membro?.nome}" atualizadas`,
        });
      }

      if (perfisAlterados && dono) {
        localStorage.setItem(`${CONFIG_KEY_PREFIX}${adminBarbeariaId}`, JSON.stringify(perfisRascunho));
        setPerfisAutorizados([...perfisRascunho]);
      }

      setEquipe((prev) =>
        prev.map((m) => {
          const patch = rascunho[m.id];
          return patch ? { ...m, ...patch } : m;
        })
      );
      setRascunho({});

      toast.success('Permissões salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar permissões.');
      buscarEquipe();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-surface p-6 rounded-3xl border border-border-line shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-brand/10 p-2.5 rounded-xl text-brand">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-text-base">Gestão de Permissões</h1>
              <p className="text-sm text-text-muted mt-0.5">Altere e clique em Salvar para aplicar.</p>
            </div>
          </div>

          {podeGerenciar && temAlteracoes && (
            <div className="flex gap-2">
              <button type="button" onClick={descartarAlteracoes} className="px-4 py-2.5 rounded-xl border border-border-line text-sm font-bold hover:border-brand cursor-pointer">
                Descartar
              </button>
              <button type="button" onClick={salvarAlteracoes} disabled={salvando} className="px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-black flex items-center gap-2 hover:brightness-110 disabled:opacity-50 cursor-pointer">
                <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}
        </div>
      </div>

      {!podeGerenciar && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-danger">
          <Lock size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm font-bold">Somente o dono (ou perfis autorizados) pode alterar permissões.</p>
        </div>
      )}

      {master && (
        <div className="bg-brand/10 border border-brand/20 p-4 rounded-2xl text-sm text-text-base">
          <p className="font-black">Conta Master ({SUPER_ADMIN_EMAIL})</p>
          <p className="text-text-muted mt-1">Você tem poder de dono em todas as barbearias e não aparece na lista da equipe. Para operar o estoque/financeiro de uma unidade, acesse pelo slug correto (ex.: /streetbarber/admin).</p>
        </div>
      )}

      {dono && (
        <div className="bg-surface border border-border-line p-5 rounded-2xl">
          <h2 className="text-sm font-black text-text-base mb-3">Quem pode gerenciar permissões?</h2>
          <div className="flex flex-wrap gap-3">
            {['gerente', 'funcionario'].map((role) => (
              <label key={role} className="flex items-center gap-2 bg-background border border-border-line px-4 py-2 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={perfisRascunho.includes(role)}
                  onChange={() => togglePerfilRascunho(role)}
                  className="accent-brand"
                />
                <span className="text-sm font-bold capitalize">{role}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-warning">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <p className="text-sm">As mudanças só são gravadas após clicar em <strong>Salvar alterações</strong>.</p>
      </div>

      <div className="bg-surface border border-border-line rounded-3xl overflow-hidden shadow-sm">
        {loading && equipe.length === 0 ? (
          <div className="p-10 flex justify-center">
            <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border-line">
            {equipe.map((membro) => {
              const alterado = !!rascunho[membro.id];
              return (
                <div key={membro.id} className={`p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${alterado ? 'bg-brand/5' : 'hover:bg-background/40'} transition-colors`}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-lg border border-brand/20">
                      {membro.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{membro.nome}</h3>
                      <span className="text-xs font-bold text-text-muted uppercase">Perfil atual: {membro.role}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-5 lg:gap-8 lg:items-center bg-background p-4 lg:p-0 rounded-2xl lg:bg-transparent">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-text-muted uppercase">Nível de Acesso</label>
                      <select
                        value={getValor(membro, 'role')}
                        onChange={(e) => alterarCampo(membro.id, 'role', e.target.value)}
                        disabled={!podeGerenciar || membro.id === profile.id}
                        className="bg-surface border border-border-line text-sm font-bold rounded-xl px-3 py-2 outline-none focus:border-brand disabled:opacity-50"
                      >
                        {dono && <option value="admin">Dono</option>}
                        <option value="gerente">Gerente</option>
                        <option value="funcionario">Funcionário</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2">
                      <label className="text-[10px] font-black text-text-muted uppercase flex items-center gap-1">
                        <UserCheck size={12} /> Acesso ao Sistema
                      </label>
                      <button
                        type="button"
                        onClick={() => alterarCampo(membro.id, 'ativo', !getValor(membro, 'ativo'))}
                        disabled={!podeGerenciar || membro.id === profile.id}
                        className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${getValor(membro, 'ativo') ? 'bg-green-500' : 'bg-border-line'}`}
                      >
                        <div className={`absolute left-1 top-1 bg-knob w-4 h-4 rounded-full transition-transform shadow-sm ${getValor(membro, 'ativo') ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2">
                      <label className="text-[10px] font-black text-text-muted uppercase flex items-center gap-1">
                        <CalendarDays size={12} /> Aparece na Agenda
                      </label>
                      <button
                        type="button"
                        onClick={() => alterarCampo(membro.id, 'exibe_na_agenda', !getValor(membro, 'exibe_na_agenda'))}
                        disabled={!podeGerenciar}
                        className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${getValor(membro, 'exibe_na_agenda') ? 'bg-brand' : 'bg-border-line'}`}
                      >
                        <div className={`absolute left-1 top-1 bg-knob w-4 h-4 rounded-full transition-transform shadow-sm ${getValor(membro, 'exibe_na_agenda') ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {podeGerenciar && temAlteracoes && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-auto z-40 flex gap-2 justify-end">
          <button type="button" onClick={descartarAlteracoes} className="bg-surface border border-border-line px-4 py-3 rounded-xl font-bold text-sm shadow-lg cursor-pointer">
            Descartar
          </button>
          <button type="button" onClick={salvarAlteracoes} disabled={salvando} className="bg-brand text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <Save size={16} /> Salvar alterações
          </button>
        </div>
      )}

      <HistoricoMudancas barbeariaId={profile?.barbearia_id} modulo="permissoes" />
    </div>
  );
}
