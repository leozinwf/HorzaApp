import { ChevronDown } from 'lucide-react';

function obterSaudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

function primeiroNome(nome) {
  if (!nome?.trim()) return null;
  return nome.trim().split(/\s+/)[0];
}

function montarEnderecoExibicao(profile, temLocalizacao) {
  if (profile?.endereco) {
    return [profile.endereco, profile.numero].filter(Boolean).join(', ');
  }
  if (temLocalizacao) return 'Usando sua localização atual';
  return 'Informe seu endereço no perfil';
}

export default function SaudacaoMarketplace({ profile = null, temLocalizacao = false }) {
  const saudacao = obterSaudacao();
  const nome = primeiroNome(profile?.nome);
  const endereco = montarEnderecoExibicao(profile, temLocalizacao);

  return (
    <div className="w-full text-left">
      <p className="text-sm text-text-muted font-medium">
        {saudacao}{nome ? `, ${nome}` : ''}
      </p>
      <button
        type="button"
        className="mt-0.5 inline-flex items-center gap-1 max-w-full text-left group cursor-pointer"
        title="Alterar endereço"
      >
        <span className="text-base sm:text-lg font-black text-text-base truncate group-hover:text-brand transition-colors">
          {endereco}
        </span>
        <ChevronDown size={18} className="shrink-0 text-text-muted group-hover:text-brand transition-colors" />
      </button>
    </div>
  );
}
