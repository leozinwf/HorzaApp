import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useModal } from '../../context/ModalContext';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Phone, Mail, Lock, Check, MapPin, Building, Clock, Eye, EyeOff, Car } from 'lucide-react';

const DIAS_SEMANA = [
  { id: 0, nome: 'Dom' }, { id: 1, nome: 'Seg' }, { id: 2, nome: 'Ter' },
  { id: 3, nome: 'Qua' }, { id: 4, nome: 'Qui' }, { id: 5, nome: 'Sex' }, { id: 6, nome: 'Sáb' },
];

// Função de validação de CNPJ
const validarCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj === '') return false;
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(0)) return false;

  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(1)) return false;
  return true;
};

export default function CadastroBarbearia() {
  const { showAlert } = useModal();
  const navigate = useNavigate();

  // Estados - Dados Pessoais
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [horaAbertura, setHoraAbertura] = useState('09:00');
  const [horaFechamento, setHoraFechamento] = useState('19:00');
  const [diasFuncionamento, setDiasFuncionamento] = useState([1, 2, 3, 4, 5, 6]);
  const [temEstacionamento, setTemEstacionamento] = useState(false);

  // Estados - Dados da Empresa
  const [nomeBarbearia, setNomeBarbearia] = useState('');
  const [slugBarbearia, setSlugBarbearia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [numero, setNumero] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cnpjError, setCnpjError] = useState('');

  // Máscaras e Handlers
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0,2)}) ${value.slice(2)}`;
    if (value.length > 9) value = `${value.slice(0,10)}-${value.slice(10)}`;
    setWhatsapp(value);
  };

  const handleCnpjChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    if (value.length > 2) value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    if (value.length > 6) value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    if (value.length > 10) value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    if (value.length > 15) value = value.replace(/(\d{4})(\d)/, '$1-$2');
    setCnpj(value);

    // Validação em tempo real (limpa o erro se estiver digitando ou mostra se terminou)
    if (value.length === 18 && !validarCNPJ(value)) {
      setCnpjError('CNPJ Inválido');
    } else {
      setCnpjError('');
    }
  };

  // Lógica do SLUG (Geração automática a partir do nome)
  const formatarSlug = (texto) => {
    return texto
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]+/g, '-') // Substitui espaços e chars especiais por hífen
      .replace(/^-+|-+$/g, '') // Remove hifens das pontas
      .slice(0, 20); // Limita a 20 caracteres
  };

  const handleNomeBarbeariaChange = (e) => {
    const val = e.target.value;
    setNomeBarbearia(val);
    setSlugBarbearia(formatarSlug(val));
  };

  const handleSlugManualChange = (e) => {
    setSlugBarbearia(formatarSlug(e.target.value));
  };

  const toggleDia = (diaId) => {
    setDiasFuncionamento((prev) =>
      prev.includes(diaId) ? prev.filter((d) => d !== diaId) : [...prev, diaId].sort((a, b) => a - b)
    );
  };

  const validacoesSenha = {
    minimo: password.length >= 6,
    maiuscula: /[A-Z]/.test(password),
    especial: /[^A-Za-z0-9]/.test(password),
  };
  const senhaValida = validacoesSenha.minimo && validacoesSenha.maiuscula && validacoesSenha.especial;
  const senhasDiferentes = confirmPassword.length > 0 && password !== confirmPassword;

  // Busca de CEP automatizada via ViaCEP
  const handleCepChange = async (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    setCep(value);

    if (value.length === 9) { // 8 numeros + 1 hifen
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value.replace('-', '')}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setRua(data.logradouro);
          setBairro(data.bairro);
          setCidade(data.localidade);
          setEstado(data.uf);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (cnpjError || !validarCNPJ(cnpj)) {
      setError('Por favor, insira um CNPJ válido.');
      return;
    }

    if (diasFuncionamento.length === 0) {
      setError('Selecione pelo menos um dia de funcionamento.');
      return;
    }

    if (horaAbertura >= horaFechamento) {
      setError('O horário de abertura deve ser anterior ao de fechamento.');
      return;
    }

    if (!senhaValida) {
      setError('A senha não atende aos requisitos de segurança.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      // 1. Cria o registro pendente na tabela barbearias
      const { data: barbData, error: barbError } = await supabase.from('barbearias').insert([{
        nome: nomeBarbearia,
        slug: slugBarbearia,
        cnpj: cnpj,
        cep: cep,
        rua: rua,
        numero: numero,
        bairro: bairro,
        cidade: cidade,
        estado: estado,
        telefone: whatsapp,
        status: 'pendente',
        hora_abertura: horaAbertura,
        hora_fechamento: horaFechamento,
        dias_funcionamento: diasFuncionamento,
        tem_estacionamento: temEstacionamento,
      }]).select('id').single();

      if (barbError) throw new Error('Este SLUG já está em uso ou ocorreu um erro no servidor.');

      // 2. Cria o usuário no Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (signUpError) throw signUpError;

      // 3. Cria o perfil do dono (admin) em public.usuarios
      if (authData?.user) {
        const { error: profileError } = await supabase.from('usuarios').insert([{
          id: authData.user.id,
          nome: nome,
          email: email,
          whatsapp: whatsapp,
          role: 'admin',
          barbearia_id: barbData.id
        }]);

        if (profileError) throw profileError;

        showAlert('Cadastro Enviado!', 'Bem-vindo ao Horza! Sua barbearia foi cadastrada com sucesso.', 'success');
        navigate('/'); // Redireciona para a home
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="mx-auto h-16 w-16 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mb-4">
          <Store size={32} />
        </div>
        <h2 className="text-center text-3xl font-black text-text-base">Torne-se um Parceiro</h2>
        <p className="mt-2 text-center text-sm text-text-muted">Cadastre sua barbearia e transforme a gestão do seu negócio.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-surface border border-border-line py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10">
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold rounded-xl text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* SESSÃO 1: DADOS DA BARBEARIA */}
            <div>
              <h3 className="text-lg font-bold border-b border-border-line pb-2 mb-4 flex items-center gap-2">
                <Building size={18} className="text-brand"/> 1. Dados do Negócio
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nome da Barbearia *</label>
                  <input required type="text" value={nomeBarbearia} onChange={handleNomeBarbeariaChange} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Link Exclusivo (URL) *</label>
                  <div className="flex bg-background border border-border-line rounded-xl overflow-hidden focus-within:border-brand">
                    <span className="bg-surface px-3 py-3 text-xs text-text-muted border-r border-border-line flex items-center">horza.app/</span>
                    <input required type="text" maxLength={20} value={slugBarbearia} onChange={handleSlugManualChange} placeholder="sua-barbearia" className="w-full p-3 bg-transparent text-sm outline-none font-bold text-brand" />
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">Máx 20 caracteres, sem espaços.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">CNPJ *</label>
                  <input required type="text" value={cnpj} onChange={handleCnpjChange} placeholder="00.000.000/0000-00" className={`w-full p-3 bg-background border rounded-xl text-sm outline-none transition-colors ${cnpjError ? 'border-red-500' : 'border-border-line focus:border-brand'}`} />
                  {cnpjError && <p className="text-[10px] text-red-500 mt-1 font-bold">{cnpjError}</p>}
                </div>
              </div>
            </div>

            {/* SESSÃO 2: ENDEREÇO */}
            <div>
              <h3 className="text-lg font-bold border-b border-border-line pb-2 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-brand"/> 2. Localização
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">CEP *</label>
                  <input required type="text" value={cep} onChange={handleCepChange} placeholder="00000-000" className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Rua / Avenida *</label>
                  <input required type="text" value={rua} onChange={(e) => setRua(e.target.value)} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Número *</label>
                  <input required type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Bairro *</label>
                  <input required type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Cidade *</label>
                  <input required type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">UF *</label>
                  <input required type="text" maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none uppercase" />
                </div>
              </div>
            </div>

            {/* SESSÃO: HORÁRIO DE FUNCIONAMENTO */}
            <div>
              <h3 className="text-lg font-bold border-b border-border-line pb-2 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-brand"/> 3. Horário de funcionamento *
              </h3>
              <p className="text-xs text-text-muted mb-4">Defina quando sua barbearia atende. Você poderá ajustar depois no painel.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Abertura *</label>
                  <input required type="time" value={horaAbertura} onChange={(e) => setHoraAbertura(e.target.value)} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Fechamento *</label>
                  <input required type="time" value={horaFechamento} onChange={(e) => setHoraFechamento(e.target.value)} className="w-full p-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                </div>
              </div>

              <label className="block text-xs font-bold text-text-muted uppercase mb-2">Dias da semana *</label>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((dia) => (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => toggleDia(dia.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-black border transition-colors ${
                      diasFuncionamento.includes(dia.id)
                        ? 'bg-brand text-white border-brand'
                        : 'bg-background border-border-line text-text-muted hover:border-brand'
                    }`}
                  >
                    {dia.nome}
                  </button>
                ))}
              </div>

              <label className="mt-4 flex items-start gap-3 p-4 rounded-xl border border-border-line bg-background cursor-pointer hover:border-brand/40 transition-colors">
                <input
                  type="checkbox"
                  checked={temEstacionamento}
                  onChange={(e) => setTemEstacionamento(e.target.checked)}
                  className="mt-1 accent-brand"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-black text-text-base">
                    <Car size={16} className="text-brand" /> Possui estacionamento
                  </span>
                  <span className="block text-xs text-text-muted mt-1">
                    Marque se a barbearia oferece estacionamento para clientes. Aparece no filtro do marketplace.
                  </span>
                </span>
              </label>
            </div>

            {/* SESSÃO 3: DADOS DO DONO (ACESSO) */}
            <div>
              <h3 className="text-lg font-bold border-b border-border-line pb-2 mb-4 flex items-center gap-2">
                <User size={18} className="text-brand"/> 4. Dados do gestor (login)
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Seu Nome Completo *</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                    <input required type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">E-mail de Acesso *</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">WhatsApp Comercial *</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                    <input required type="tel" value={whatsapp} onChange={handlePhoneChange} className="w-full pl-10 pr-4 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Senha *</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                    <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-background border border-border-line rounded-xl text-sm focus:border-brand outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-text-muted hover:text-brand" tabIndex={-1}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <ul className="text-xs space-y-1 mt-2 px-1">
                    <li className={`font-bold ${validacoesSenha.minimo ? 'text-green-500' : 'text-text-muted'}`}>{validacoesSenha.minimo ? '✓' : '✖'} Mínimo 6 caracteres</li>
                    <li className={`font-bold ${validacoesSenha.maiuscula ? 'text-green-500' : 'text-text-muted'}`}>{validacoesSenha.maiuscula ? '✓' : '✖'} Uma letra maiúscula</li>
                    <li className={`font-bold ${validacoesSenha.especial ? 'text-green-500' : 'text-text-muted'}`}>{validacoesSenha.especial ? '✓' : '✖'} Um caractere especial</li>
                  </ul>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Confirmar senha *</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-3.5 text-text-muted" />
                    <input required type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full pl-10 pr-10 py-3 bg-background border rounded-xl text-sm outline-none ${senhasDiferentes ? 'border-red-500' : 'border-border-line focus:border-brand'}`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-3.5 text-text-muted hover:text-brand" tabIndex={-1}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {senhasDiferentes && <p className="text-red-500 text-xs font-bold mt-1">As senhas não coincidem.</p>}
                </div>
              </div>

              <p className="text-xs text-text-muted mt-4">
                Ao cadastrar, você concorda com os{' '}
                <Link to="/termos" className="text-brand font-bold hover:underline">Termos de uso</Link>
                {' '}e a{' '}
                <Link to="/privacidade" className="text-brand font-bold hover:underline">Política de privacidade</Link>.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between gap-4">
              <button type="button" onClick={() => navigate('/')} className="text-sm font-bold text-text-muted hover:text-text-base cursor-pointer">
                Cancelar
              </button>
              
              <button type="submit" disabled={loading || cnpjError || senhasDiferentes || !senhaValida || diasFuncionamento.length === 0} className="bg-brand text-white font-bold py-3.5 px-8 rounded-xl text-sm hover:bg-brand-hover transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Check size={18}/> Concluir Cadastro</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}