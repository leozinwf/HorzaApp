import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { ShieldCheck, UserCheck, CalendarDays, AlertCircle } from 'lucide-react';

export default function AdminPermissoes() {
  const { profile } = useAuth();
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.barbearia_id) {
      buscarEquipe();
    }
  }, [profile]);

  const buscarEquipe = async () => {
    setLoading(true);
    try {
      // Busca todos os usuários da barbearia que não são clientes (ou seja, a equipe)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, role, ativo, exibe_na_agenda')
        .eq('barbearia_id', profile.barbearia_id)
        .neq('role', 'cliente')
        .order('nome');

      if (error) throw error;
      if (data) setEquipe(data);
    } catch (err) {
      console.error('Erro ao buscar equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função genérica para atualizar qualquer campo de permissão instantaneamente
  const atualizarPermissao = async (id, campo, novoValor) => {
    // Atualiza o estado local imediatamente para parecer super rápido (Optimistic UI)
    setEquipe((prev) =>
      prev.map((membro) => (membro.id === id ? { ...membro, [campo]: novoValor } : membro))
    );

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ [campo]: novoValor })
        .eq('id', id);

      if (error) {
        // Se der erro no banco, desfaz a alteração visual
        throw error;
      }
    } catch (err) {
      console.error(`Erro ao atualizar ${campo}:`, err);
      alert(`Não foi possível atualizar a permissão. Tente novamente.`);
      buscarEquipe(); // Recarrega os dados reais do banco para garantir consistência
    }
  };

  return (
    <div className="w-full space-y-6 pb-6">
      
      {/* CABEÇALHO DA TELA */}
      <div className="bg-surface p-6 rounded-3xl border border-border-line shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand/10 p-2.5 rounded-xl text-brand">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-text-base">Gestão de Permissões</h1>
            <p className="text-sm text-text-muted mt-0.5">Controle o acesso e a visibilidade da sua equipe no sistema.</p>
          </div>
        </div>
      </div>

      {/* AVISO IMPORTANTE */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-amber-600">
        <AlertCircle size={20} className="shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold mb-1">Como funcionam as permissões?</p>
          <ul className="list-disc pl-4 space-y-1 opacity-90">
            <li><strong>Acesso ao Sistema:</strong> Se desativado, o funcionário não consegue fazer login.</li>
            <li><strong>Aparece na Agenda:</strong> Define se o cliente final pode agendar horários com essa pessoa. Útil para recepcionistas ou administradores "invisíveis".</li>
            <li><strong>Nível:</strong> Controla o que a pessoa vê. Admins veem tudo, Gerentes não veem o Financeiro (exemplo), e Funcionários veem apenas a própria agenda.</li>
          </ul>
        </div>
      </div>

      {/* LISTA DA EQUIPE */}
      <div className="bg-surface border border-border-line rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="h-8 w-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : equipe.length === 0 ? (
          <div className="p-10 text-center text-text-muted">
            <p className="font-bold">Nenhum funcionário encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-line">
            {equipe.map((membro) => (
              <div key={membro.id} className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-background/40 transition-colors">
                
                {/* Info do Usuário */}
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-lg border border-brand/20">
                    {membro.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-text-base text-lg leading-tight">{membro.nome}</h3>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Perfil: {membro.role}
                    </span>
                  </div>
                </div>

                {/* Controles de Permissão */}
                <div className="flex flex-col sm:flex-row gap-5 lg:gap-8 lg:items-center bg-background p-4 lg:p-0 rounded-2xl lg:bg-transparent">
                  
                  {/* Select de Nível (Role) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Nível de Acesso</label>
                    <select
                      value={membro.role}
                      onChange={(e) => atualizarPermissao(membro.id, 'role', e.target.value)}
                      disabled={membro.id === profile.id} // Impede a pessoa de remover o próprio admin
                      className="bg-surface border border-border-line text-sm font-bold text-text-base rounded-xl px-3 py-2 outline-none focus:border-brand disabled:opacity-50"
                    >
                      <option value="admin">Administrador</option>
                      <option value="gerente">Gerente</option>
                      <option value="funcionario">Funcionário</option>
                    </select>
                  </div>

                  {/* Toggle: Acesso ao Sistema */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1">
                      <UserCheck size={12} /> Acesso ao Sistema
                    </label>
                    <button
                      onClick={() => atualizarPermissao(membro.id, 'ativo', !membro.ativo)}
                      disabled={membro.id === profile.id} // Impede a pessoa de se bloquear
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out focus:outline-none disabled:opacity-50 ${
                        membro.ativo ? 'bg-green-500' : 'bg-border-line'
                      }`}
                    >
                      <div
                        className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out shadow-sm ${
                          membro.ativo ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle: Aparece na Agenda */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1">
                      <CalendarDays size={12} /> Aparece na Agenda
                    </label>
                    <button
                      onClick={() => atualizarPermissao(membro.id, 'exibe_na_agenda', !membro.exibe_na_agenda)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${
                        membro.exibe_na_agenda ? 'bg-brand' : 'bg-border-line'
                      }`}
                    >
                      <div
                        className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out shadow-sm ${
                          membro.exibe_na_agenda ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}