import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBannersPublicos } from '../../services/marketplaceBannerService';
import BannerVisual from './BannerVisual';

const AUTO_PLAY_MS = 5500;

function BannerSlide({ banner }) {
  return (
    <div className="relative shrink-0 snap-start snap-always w-full flex-[0_0_100%] overflow-hidden">
      <BannerVisual banner={banner} />
    </div>
  );
}

export default function CarrosselBanners() {
  const scrollRef = useRef(null);
  const [banners, setBanners] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const pausaAutoRef = useRef(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const data = await fetchBannersPublicos();
        if (ativo) setBanners(data);
      } catch {
        if (ativo) setBanners([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  const irParaSlide = useCallback((indice) => {
    const el = scrollRef.current;
    if (!el || banners.length === 0) return;
    const alvo = Math.max(0, Math.min(indice, banners.length - 1));
    el.scrollTo({ left: alvo * el.clientWidth, behavior: 'smooth' });
    setIndiceAtivo(alvo);
  }, [banners.length]);

  const atualizarIndicePorScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0 || banners.length === 0) return;
    const indice = Math.round(el.scrollLeft / el.clientWidth);
    setIndiceAtivo(Math.max(0, Math.min(indice, banners.length - 1)));
  }, [banners.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', atualizarIndicePorScroll, { passive: true });
    return () => el.removeEventListener('scroll', atualizarIndicePorScroll);
  }, [atualizarIndicePorScroll, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const timer = setInterval(() => {
      if (pausaAutoRef.current) return;
      irParaSlide((indiceAtivo + 1) % banners.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [indiceAtivo, irParaSlide, banners.length]);

  const pausarAutoPlay = () => {
    pausaAutoRef.current = true;
    window.setTimeout(() => { pausaAutoRef.current = false; }, AUTO_PLAY_MS * 2);
  };

  if (carregando) {
    return (
      <div className="w-full h-[168px] sm:h-[180px] rounded-2xl bg-surface border border-border-line animate-pulse" />
    );
  }

  if (banners.length === 0) return null;

  return (
    <section className="w-full min-w-0" aria-label="Banners promocionais">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-md">
        <div
          ref={scrollRef}
          className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
          onTouchStart={pausarAutoPlay}
          onMouseDown={pausarAutoPlay}
        >
          {banners.map((banner) => (
            <BannerSlide key={banner.id} banner={banner} />
          ))}
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Ir para banner ${i + 1}`}
                aria-current={i === indiceAtivo ? 'true' : undefined}
                onClick={() => {
                  pausarAutoPlay();
                  irParaSlide(i);
                }}
                className={`pointer-events-auto h-1 rounded-full transition-all duration-300 cursor-pointer ${
                  i === indiceAtivo
                    ? 'w-6 bg-white shadow-sm'
                    : 'w-3 bg-white/45 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
