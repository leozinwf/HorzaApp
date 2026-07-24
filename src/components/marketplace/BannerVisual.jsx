import { estiloFundoBanner } from '../../constants/marketplaceBanners';

export default function BannerVisual({ banner, className = '', altura = 'h-[168px] sm:h-[180px]', compacto = false }) {
  const temImagem = Boolean(banner?.imagem_url);

  return (
    <div
      className={`relative overflow-hidden ${altura} ${className}`}
      style={!temImagem ? estiloFundoBanner(banner) : undefined}
    >
      {temImagem && (
        <img
          src={banner.imagem_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15" />

      {!temImagem && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
      )}

      <div className={`relative z-10 h-full flex flex-col justify-end text-white ${compacto ? 'p-3' : 'p-5 sm:p-6'}`}>
        <p
          className={`font-black leading-tight ${compacto ? 'text-sm' : 'text-xl sm:text-2xl'}`}
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {banner.titulo}
        </p>
        {banner.subtitulo && (
          <p
            className={`text-white/90 mt-1 font-medium max-w-[90%] ${compacto ? 'text-[10px]' : 'text-sm'}`}
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.85)' }}
          >
            {banner.subtitulo}
          </p>
        )}
      </div>
    </div>
  );
}
