import { supabase } from './supabaseClient';

export async function fetchBannersPublicos() {
  const { data, error } = await supabase
    .from('marketplace_banners')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchBannersMaster() {
  const { data, error } = await supabase
    .from('marketplace_banners')
    .select('*')
    .order('ordem', { ascending: true })
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function criarBanner(payload) {
  const { data, error } = await supabase
    .from('marketplace_banners')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarBanner(id, payload) {
  const { data, error } = await supabase
    .from('marketplace_banners')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function excluirBanner(id) {
  const { error } = await supabase.from('marketplace_banners').delete().eq('id', id);
  if (error) throw error;
}

export async function reordenarBanner(id, novaOrdem) {
  return atualizarBanner(id, { ordem: novaOrdem });
}
