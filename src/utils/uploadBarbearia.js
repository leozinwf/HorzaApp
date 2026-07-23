import { supabase } from '../services/supabaseClient';

export async function uploadImagemBarbearia(barbeariaId, file, tipo = 'logo') {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Envie uma imagem (JPG, PNG ou WebP).');
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${barbeariaId}/${tipo}.${ext}`;

  const { error } = await supabase.storage.from('barbearias').upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('barbearias').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
