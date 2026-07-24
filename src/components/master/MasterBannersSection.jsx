import { useCallback, useEffect, useState } from 'react';
import { Image, Plus, Trash2, ChevronUp, ChevronDown, Pencil, Eye, EyeOff, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useModal } from '../../context/ModalContext';
import {
  fetchBannersMaster,
  criarBanner,
  atualizarBanner,
  excluirBanner,
} from '../../services/marketplaceBannerService';
import { uploadImagemBanner } from '../../utils/uploadMarketplace';
import BannerVisual from '../marketplace/BannerVisual';
import { BANNER_LIMITE, BANNER_IMAGEM_INFO } from '../../constants/marketplaceBanners';

const FORM_VAZIO = {
  titulo: '',
  subtitulo: '',
  tipo_fundo: 'gradiente',
  cor_fixa: '#b8924a',
  cor_gradiente_inicio: '#1a1510',
  cor_gradiente_fim: '#b8924a',
  imagem_url: '',
  ativo: true,
};

function BannerPreview({ banner, compacto = false }) {
  return (
    <BannerVisual
      banner={{ ...banner, titulo: banner.titulo || 'Título' }}
      className="rounded-2xl"
      altura={compacto ? 'h-24' : 'h-36'}
      compacto={compacto}
    />
  );
}

export default function MasterBannersSection() {
  const { showConfirm } = useModal();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [formAberto, setFormAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBannersMaster();
      setBanners(data);
    } catch {
      toast.error('Não foi possível carregar os banners.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    if (banners.length >= BANNER_LIMITE) {
      toast.error(`Limite de ${BANNER_LIMITE} banners atingido.`);
      return;
    }
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setFormAberto(true);
  };

  const abrirEditar = (banner) => {
    setEditandoId(banner.id);
    setForm({
      titulo: banner.titulo || '',
      subtitulo: banner.subtitulo || '',
      tipo_fundo: banner.tipo_fundo || 'gradiente',
      cor_fixa: banner.cor_fixa || '#b8924a',
      cor_gradiente_inicio: banner.cor_gradiente_inicio || '#1a1510',
      cor_gradiente_fim: banner.cor_gradiente_fim || '#b8924a',
      imagem_url: banner.imagem_url || '',
      ativo: banner.ativo ?? true,
    });
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  const montarPayload = () => ({
    titulo: form.titulo.trim(),
    subtitulo: form.subtitulo.trim() || null,
    tipo_fundo: form.tipo_fundo,
    cor_fixa: form.tipo_fundo === 'cor' ? form.cor_fixa : null,
    cor_gradiente_inicio: form.tipo_fundo === 'gradiente' ? form.cor_gradiente_inicio : null,
    cor_gradiente_fim: form.tipo_fundo === 'gradiente' ? form.cor_gradiente_fim : null,
    imagem_url: form.imagem_url || null,
    ativo: form.ativo,
    ordem: editandoId
      ? banners.find((b) => b.id === editandoId)?.ordem ?? 0
      : banners.length,
  });

  const salvar = async () => {
    if (!form.titulo.trim()) {
      toast.error('Informe o texto principal do banner.');
      return;
    }

    setSalvando(true);
    try {
      const payload = montarPayload();
      if (editandoId) {
        await atualizarBanner(editandoId, payload);
        toast.success('Banner atualizado.');
      } else {
        await criarBanner(payload);
        toast.success('Banner criado.');
      }
      fecharForm();
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar banner.');
    } finally {
      setSalvando(false);
    }
  };

  const remover = (banner) => {
    showConfirm(
      'Excluir banner',
      `Deseja remover "${banner.titulo}"? Essa ação não pode ser desfeita.`,
      async () => {
        try {
          await excluirBanner(banner.id);
          toast.success('Banner removido.');
          await carregar();
        } catch {
          toast.error('Erro ao excluir banner.');
        }
      }
    );
  };

  const toggleAtivo = async (banner) => {
    try {
      await atualizarBanner(banner.id, { ativo: !banner.ativo });
      await carregar();
    } catch {
      toast.error('Erro ao alterar status.');
    }
  };

  const mover = async (index, direcao) => {
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= banners.length) return;

    const atual = banners[index];
    const vizinho = banners[alvo];

    try {
      await Promise.all([
        atualizarBanner(atual.id, { ordem: vizinho.ordem }),
        atualizarBanner(vizinho.id, { ordem: atual.ordem }),
      ]);
      await carregar();
    } catch {
      toast.error('Erro ao reordenar.');
    }
  };

  const handleImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEnviandoImagem(true);
    try {
      let bannerId = editandoId;
      if (!bannerId) {
        if (banners.length >= BANNER_LIMITE) {
          toast.error(`Limite de ${BANNER_LIMITE} banners atingido.`);
          return;
        }
        if (!form.titulo.trim()) {
          toast.error('Preencha o título antes de enviar a imagem.');
          return;
        }
        const criado = await criarBanner({ ...montarPayload(), imagem_url: null });
        bannerId = criado.id;
        setEditandoId(criado.id);
      }

      const url = await uploadImagemBanner(bannerId, file);
      setForm((f) => ({ ...f, imagem_url: url }));
      await atualizarBanner(bannerId, { imagem_url: url });
      toast.success('Imagem enviada.');
      await carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar imagem.');
    } finally {
      setEnviandoImagem(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-brand/10 via-amber-500/5 to-brand/10 border border-brand/20 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-base flex items-center gap-2">
            <Image size={22} className="text-brand" /> Banners do Marketplace
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {banners.length}/{BANNER_LIMITE} banners · exibidos na home do app
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNovo}
          disabled={banners.length >= BANNER_LIMITE}
          className="inline-flex items-center gap-2 bg-brand text-white px-5 py-3 rounded-xl text-sm font-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
        >
          <Plus size={16} /> Novo banner
        </button>
      </div>

      {formAberto && (
        <div className="bg-surface border border-border-line rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-text-base">
              {editandoId ? 'Editar banner' : 'Novo banner'}
            </h3>
            <button type="button" onClick={fecharForm} className="text-sm font-bold text-text-muted hover:text-text-base cursor-pointer">
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-text-muted uppercase tracking-wider">Texto principal *</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
                  placeholder="Ex: Corte + Barba"
                />
              </div>
              <div>
                <label className="text-xs font-black text-text-muted uppercase tracking-wider">Subtítulo</label>
                <input
                  value={form.subtitulo}
                  onChange={(e) => setForm((f) => ({ ...f, subtitulo: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border-line bg-background px-4 py-3 text-sm outline-none focus:border-brand"
                  placeholder="Ex: 20% OFF esta semana"
                />
              </div>

              <div>
                <label className="text-xs font-black text-text-muted uppercase tracking-wider">Fundo</label>
                <div className="mt-2 flex gap-3">
                  {['gradiente', 'cor'].map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo_fundo: tipo }))}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        form.tipo_fundo === tipo
                          ? 'bg-brand text-white border-brand'
                          : 'bg-background border-border-line text-text-base'
                      }`}
                    >
                      {tipo === 'gradiente' ? 'Degradê (2 cores)' : 'Cor fixa'}
                    </button>
                  ))}
                </div>
              </div>

              {form.tipo_fundo === 'cor' ? (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.cor_fixa}
                    onChange={(e) => setForm((f) => ({ ...f, cor_fixa: e.target.value }))}
                    className="h-10 w-14 rounded-lg border border-border-line cursor-pointer"
                  />
                  <input
                    value={form.cor_fixa}
                    onChange={(e) => setForm((f) => ({ ...f, cor_fixa: e.target.value }))}
                    className="flex-1 rounded-xl border border-border-line bg-background px-3 py-2 text-sm font-mono outline-none focus:border-brand"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-text-muted mb-1">Cor inicial</p>
                    <input
                      type="color"
                      value={form.cor_gradiente_inicio}
                      onChange={(e) => setForm((f) => ({ ...f, cor_gradiente_inicio: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-border-line cursor-pointer"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-muted mb-1">Cor final</p>
                    <input
                      type="color"
                      value={form.cor_gradiente_fim}
                      onChange={(e) => setForm((f) => ({ ...f, cor_gradiente_fim: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-border-line cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-black text-text-muted uppercase tracking-wider">Imagem (opcional)</label>
                <div className="mt-2 flex flex-col sm:flex-row gap-3">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border-line bg-background text-sm font-bold cursor-pointer hover:border-brand">
                    {enviandoImagem ? 'Enviando...' : 'Escolher imagem'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImagem} disabled={enviandoImagem} />
                  </label>
                  {form.imagem_url && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imagem_url: '' }))}
                      className="text-xs font-bold text-danger-text cursor-pointer"
                    >
                      Remover imagem
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-text-muted flex items-start gap-1.5">
                  <Info size={14} className="shrink-0 mt-0.5 text-brand" />
                  {BANNER_IMAGEM_INFO.texto}
                </p>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  className="accent-brand"
                />
                Banner ativo (visível na home)
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black text-text-muted uppercase tracking-wider">Pré-visualização</p>
              <BannerPreview banner={form} />
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="w-full bg-brand text-white py-3 rounded-xl text-sm font-black hover:brightness-110 disabled:opacity-60 cursor-pointer"
              >
                {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Criar banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`bg-surface border rounded-3xl p-4 space-y-3 ${banner.ativo ? 'border-border-line' : 'border-dashed border-text-muted/40 opacity-75'}`}
          >
            <BannerPreview banner={banner} compacto />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{banner.titulo}</p>
                <p className="text-[10px] text-text-muted">
                  Ordem {index + 1} · {banner.tipo_fundo === 'cor' ? 'Cor fixa' : 'Degradê'}
                  {!banner.ativo && ' · Inativo'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => mover(index, -1)} disabled={index === 0} className="p-2 rounded-lg hover:bg-background disabled:opacity-30 cursor-pointer" title="Subir">
                  <ChevronUp size={16} />
                </button>
                <button type="button" onClick={() => mover(index, 1)} disabled={index === banners.length - 1} className="p-2 rounded-lg hover:bg-background disabled:opacity-30 cursor-pointer" title="Descer">
                  <ChevronDown size={16} />
                </button>
                <button type="button" onClick={() => toggleAtivo(banner)} className="p-2 rounded-lg hover:bg-background cursor-pointer" title={banner.ativo ? 'Desativar' : 'Ativar'}>
                  {banner.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button type="button" onClick={() => abrirEditar(banner)} className="p-2 rounded-lg hover:bg-background cursor-pointer" title="Editar">
                  <Pencil size={16} />
                </button>
                <button type="button" onClick={() => remover(banner)} className="p-2 rounded-lg hover:bg-red-500/10 text-danger-text cursor-pointer" title="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="text-center py-12 border border-dashed border-border-line rounded-3xl text-text-muted font-bold">
          Nenhum banner cadastrado. Clique em &quot;Novo banner&quot; para começar.
        </div>
      )}
    </div>
  );
}
