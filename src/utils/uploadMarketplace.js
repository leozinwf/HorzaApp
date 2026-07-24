import { supabase } from '../services/supabaseClient';

export async function uploadImagemBanner(bannerId, file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Envie uma imagem (JPG, PNG ou WebP).');
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 2 MB.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `banners/${bannerId}.${ext}`;

  const { error } = await supabase.storage.from('marketplace').upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('marketplace').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
