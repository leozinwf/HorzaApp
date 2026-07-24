export const BANNER_LIMITE = 12;

export const BANNER_IMAGEM_INFO = {
  largura: 1200,
  altura: 400,
  proporcao: '3:1',
  maxMb: 2,
  texto: 'Recomendado: 1200 × 400 px (proporção 3:1), JPG, PNG ou WebP, até 2 MB. A imagem ocupa todo o card; posicione o foco visual na área inferior (onde fica o texto).',
};

export function estiloFundoBanner(banner) {
  if (!banner) return { backgroundColor: '#b8924a' };
  if (banner.tipo_fundo === 'cor') {
    return { backgroundColor: banner.cor_fixa || '#b8924a' };
  }
  return {
    background: `linear-gradient(135deg, ${banner.cor_gradiente_inicio || '#1a1510'}, ${banner.cor_gradiente_fim || '#b8924a'})`,
  };
}
