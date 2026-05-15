import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

const BASE_URL = 'https://dados.gov.br/api/3/action';

export async function openDataGet<T>(path: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  const token = process.env.CONECTA_GOV_TOKEN;

  if (!token) {
    throw new Error('Token do Conecta GOV não configurado (CONECTA_GOV_TOKEN).');
  }

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  }, 10000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dados Abertos HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Exemplo de função para buscar datasets relacionados a Porto Alegre
 */
export async function searchPoaDatasets() {
  return openDataGet('/package_search', {
    q: 'Porto Alegre',
    rows: 10
  });
}
