export const montarEndereco = (dados) => {
  if (!dados) return '';
  const partes = [dados.rua, dados.numero, dados.bairro, dados.cidade, dados.estado, dados.cep].filter(Boolean);
  return partes.join(', ');
};

export const montarEnderecoRota = (dados) => montarEndereco(dados);

export const urlsRota = (dados) => {
  const endereco = montarEndereco(dados);
  const encoded = encodeURIComponent(endereco);
  const lat = dados?.latitude;
  const lng = dados?.longitude;

  const destino = lat && lng ? `${lat},${lng}` : encoded;

  return {
    google: lat && lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    waze: lat && lng
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://waze.com/ul?q=${encoded}&navigate=yes`,
    mapsVer: lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  };
};

const geoCache = new Map();

export async function obterCoordenadasBarbearia(barbearia) {
  if (!barbearia) return null;
  const lat = Number(barbearia.latitude ?? barbearia.lat);
  const lng = Number(barbearia.longitude ?? barbearia.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  const endereco = montarEndereco(barbearia);
  if (!endereco) return null;

  if (geoCache.has(barbearia.id)) return geoCache.get(barbearia.id);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    );
    const data = await res.json();
    if (data?.[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache.set(barbearia.id, coords);
      return coords;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function resolverCoordenadasLista(barbearias) {
  const comCoords = await Promise.all(
    barbearias.map(async (b) => {
      const coords = await obterCoordenadasBarbearia(b);
      return coords ? { ...b, lat: coords.lat, lng: coords.lng } : { ...b };
    })
  );
  return comCoords;
}
