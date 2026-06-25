import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { User, Calendar, CreditCard, Lock, Mail, Phone, MapPin, Smile } from 'lucide-react';

export default function AreaCliente() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('agendamentos'); // 'agendamentos' ou 'perfil'

  return (
    <div className="max-w-4xl mx-auto p-6 mt-20">
      <h1 className="text-3xl font-black mb-8">Olá, {profile?.nome?.split(' ')[0]}</h1>
      
      {/* Abas de Navegação */}
      <div className="flex gap-4 border-b border-border-line mb-8">
        <button onClick={() => setTab('agendamentos')} className={`pb-4 font-bold ${tab === 'agendamentos' ? 'text-brand border-b-2 border-brand' : 'text-text-muted'}`}>
          Meus Agendamentos
        </button>
        <button onClick={() => setTab('perfil')} className={`pb-4 font-bold ${tab === 'perfil' ? 'text-brand border-b-2 border-brand' : 'text-text-muted'}`}>
          Perfil e Configurações
        </button>
      </div>

      {tab === 'agendamentos' ? <ListaAgendamentos user={user} /> : <FormularioPerfil user={user} profile={profile} />}
    </div>
  );
}

function FormularioPerfil({ user, profile }) {
  const [formData, setFormData] = useState(profile || {});
  const [novaSenha, setNovaSenha] = useState('');

  const handleUpdate = async () => {
    // Atualiza dados do perfil
    const { error: profileError } = await supabase.from('usuarios').update(formData).eq('id', user.id);
    
    // Atualiza senha se preenchida
    let authError = null;
    if (novaSenha) {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      authError = error;
    }

    if (profileError || authError) alert('Erro ao atualizar: ' + (profileError?.message || authError?.message));
    else alert('Perfil atualizado com sucesso!');
  };

  const handleCpfChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setFormData({...formData, cpf: value.substring(0, 14)});
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fadeIn">
      {/* Dados Pessoais */}
      <div className="bg-surface p-6 rounded-2xl border border-border-line space-y-4">
        <h3 className="font-bold flex items-center gap-2 mb-4"><User size={18}/> Dados Pessoais</h3>
        
        <input className="w-full p-3 bg-background rounded-xl border" placeholder="Nome Completo" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} />
        <input className="w-full p-3 bg-background rounded-xl border" placeholder="CPF" value={formData.cpf || ''} onChange={handleCpfChange} />
        <input className="w-full p-3 bg-background rounded-xl border" placeholder="Telefone" value={formData.whatsapp || ''} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
        <input className="w-full p-3 bg-background rounded-xl border" placeholder="Endereço" value={formData.endereco || ''} onChange={e => setFormData({...formData, endereco: e.target.value})} />
        
        <select className="w-full p-3 bg-background rounded-xl border" value={formData.genero || ''} onChange={e => setFormData({...formData, genero: e.target.value})}>
          <option value="">Gênero (Opcional)</option>
          <option value="masculino">Masculino</option>
          <option value="feminino">Feminino</option>
          <option value="outro">Outro</option>
        </select>

        <input type="date" className="w-full p-3 bg-background rounded-xl border" value={formData.data_nascimento || ''} onChange={e => setFormData({...formData, data_nascimento: e.target.value})} />
        
        <div className="pt-4 border-t border-border-line">
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><Lock size={16}/> Alterar Senha</h4>
          <input type="password" className="w-full p-3 bg-background rounded-xl border" placeholder="Nova senha (deixe vazio para manter)" onChange={e => setNovaSenha(e.target.value)} />
        </div>

        <button onClick={handleUpdate} className="w-full bg-brand text-white p-3 rounded-xl font-bold mt-4">Salvar Alterações</button>
      </div>

      {/* Pagamentos */}
      <div className="bg-surface p-6 rounded-2xl border border-border-line space-y-4">
        <h3 className="font-bold flex items-center gap-2 mb-4"><CreditCard size={18}/> Pagamentos</h3>
        <div className="p-6 border-2 border-dashed rounded-xl text-center text-sm text-text-muted">
          Nenhum método de pagamento cadastrado.
        </div>
        <button className="w-full bg-background border border-border-line p-3 rounded-xl font-bold text-sm hover:bg-brand/5 transition-colors">+ Adicionar Cartão / PIX</button>
      </div>
    </div>
  );
}

function ListaAgendamentos({ user }) {
  const [ags, setAgs] = useState([]);

  useEffect(() => {
    const fetchAgs = async () => {
      const { data } = await supabase.from('agendamentos').select('*, servicos(nome_servico), barbeiros:usuarios(nome)').eq('cliente_id', user.id);
      setAgs(data || []);
    };
    fetchAgs();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {ags.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-3xl border border-border-line">
          <Calendar size={48} className="mx-auto text-text-muted mb-4" />
          <h3 className="font-bold text-lg">Nenhum agendamento</h3>
          <p className="text-text-muted text-sm">Você ainda não tem agendamentos pendentes ou realizados.</p>
        </div>
      ) : (
        ags.map(ag => (
          <div key={ag.id} className="bg-surface p-5 rounded-2xl border border-border-line flex justify-between items-center">
            <div>
              <p className="font-bold">{ag.servicos?.nome_servico}</p>
              <p className="text-xs text-text-muted">{new Date(ag.data_hora).toLocaleDateString()} às {new Date(ag.data_hora).toLocaleTimeString()}</p>
            </div>
            <span className="bg-brand/10 text-brand text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {ag.status_atendimento}
            </span>
          </div>
        ))
      )}
    </div>
  );
}