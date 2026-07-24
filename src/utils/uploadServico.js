import { supabase } from '../services/supabaseClient';

export async function uploadImagemServico(barbeariaId, file, servicoId) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Envie uma imagem (JPG, PNG ou WebP).');
  }
  if (!barbeariaId || !servicoId) {
    throw new Error('Identificadores inválidos para upload.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${barbeariaId}/servicos/${servicoId}.${ext}`;

  const { error } = await supabase.storage.from('barbearias').upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('barbearias').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
