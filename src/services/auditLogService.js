import { supabase } from './supabaseClient';

const STORAGE_PREFIX = 'horza_audit_';
const MAX_LOCAL = 200;

const readLocal = (barbeariaId) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${barbeariaId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocal = (barbeariaId, entries) => {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${barbeariaId}`,
      JSON.stringify(entries.slice(0, MAX_LOCAL))
    );
  } catch {
    /* storage cheio ou indisponível */
  }
};

export const auditLogService = {
  async registrar({
    barbeariaId,
    usuarioId,
    usuarioNome,
    modulo,
    acao,
    descricao,
    detalhes = null,
  }) {
    const entry = {
      id: crypto.randomUUID(),
      barbearia_id: barbeariaId,
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      modulo,
      acao,
      descricao,
      detalhes,
      criado_em: new Date().toISOString(),
    };

    if (barbeariaId) {
      const local = readLocal(barbeariaId);
      writeLocal(barbeariaId, [entry, ...local]);
    }

    try {
      await supabase.from('historico_admin').insert([entry]);
    } catch {
      /* tabela pode não existir ainda */
    }

    return entry;
  },

  async listar(barbeariaId, modulo = null, limite = 50) {
    try {
      let query = supabase
        .from('historico_admin')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .order('criado_em', { ascending: false })
        .limit(limite);

      if (modulo) query = query.eq('modulo', modulo);

      const { data, error } = await query;
      if (!error && data?.length) return data;
    } catch {
      /* fallback local */
    }

    const local = readLocal(barbeariaId);
    const filtrado = modulo ? local.filter((e) => e.modulo === modulo) : local;
    return filtrado.slice(0, limite);
  },
};
