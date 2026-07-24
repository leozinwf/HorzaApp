const PESO_PLANO = { plus: 3, pro: 2, free: 1 };

function minutosDoHorario(valor) {
  if (!valor) return null;
  const parte = String(valor).substring(0, 5);
  const [h, m] = parte.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function barbeariaAbertaAgora(barbearia, agora = new Date()) {
  const dias = barbearia?.dias_funcionamento;
  if (!Array.isArray(dias) || dias.length === 0) return false;
  if (!dias.includes(agora.getDay())) return false;

  const abre = minutosDoHorario(barbearia?.hora_abertura);
  const fecha = minutosDoHorario(barbearia?.hora_fechamento);
  if (abre == null || fecha == null) return false;

  const atual = agora.getHours() * 60 + agora.getMinutes();
  return atual >= abre && atual <= fecha;
}

export function aplicarFiltroRapido(lista, filtroId) {
  if (!lista?.length) return [];

  let resultado = [...lista];

  if (filtroId === 'estacionamento') {
    resultado = resultado.filter((b) => b.tem_estacionamento === true);
  }

  if (filtroId === 'aberto') {
    resultado = resultado.filter((b) => barbeariaAbertaAgora(b));
  }

  if (filtroId === 'proximos') {
    resultado.sort((a, b) => {
      const da = a.distancia_km ?? Number.POSITIVE_INFINITY;
      const db = b.distancia_km ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return resultado;
  }

  if (filtroId === 'avaliacao') {
    resultado.sort((a, b) => {
      const pa = PESO_PLANO[a.plan_slug] || 1;
      const pb = PESO_PLANO[b.plan_slug] || 1;
      if (pb !== pa) return pb - pa;
      if (a.distancia_km != null && b.distancia_km != null) return a.distancia_km - b.distancia_km;
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });
    return resultado;
  }

  return resultado;
}

export const FILTROS_RAPIDOS = [
  { id: 'avaliacao', label: 'Avaliação', emoji: '⭐', descricao: 'Parceiros em destaque (Pro/Plus) primeiro' },
  { id: 'proximos', label: 'Mais Próximos', emoji: '📍', descricao: 'Ordena pela menor distância' },
  { id: 'aberto', label: 'Aberto Agora', emoji: '✂️', descricao: 'Somente barbearias abertas neste momento' },
  { id: 'estacionamento', label: 'Estacionamento', emoji: '🚗', descricao: 'Com estacionamento disponível' },
];
