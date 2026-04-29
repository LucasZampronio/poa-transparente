import { pool } from '../db.js';

const CNPJ_POA = "92963560000160";
const MUNICIPIO_CODE = "88301";
const BASE_URL = "https://portal.tce.rs.gov.br/api/obras/v1";

export async function fetchTceObras(year: number) {
  const url = `${BASE_URL}/orgaos/${CNPJ_POA}/obras?municipio=${MUNICIPIO_CODE}&exercicio=${year}&page=0&size=100`;
  const response = await fetch(url, {
    headers: { "User-Agent": "POA-Transparente-API/1.0" }
  });

  if (!response.ok) {
    throw new Error(`TCE API Error: ${response.statusText}`);
  }

  const data: any = await response.json();
  return data.content || [];
}

export async function fetchTceCoordinates(idObra: number) {
  const url = `${BASE_URL}/orgaos/${CNPJ_POA}/obras/${idObra}/coordenadas`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "POA-Transparente-API/1.0" }
    });
    if (response.ok) {
      const coords: any = await response.json();
      if (Array.isArray(coords) && coords.length > 0) {
        return {
          latitude: parseFloat(coords[0].latitude),
          longitude: parseFloat(coords[0].longitude)
        };
      }
    }
  } catch (e) {
    console.error(`Error fetching coords for work ${idObra}:`, e);
  }
  return null;
}

function mapSector(familia: string) {
  const f = familia.toUpperCase();
  if (f.includes('SANEAMENTO') || f.includes('AGUA') || f.includes('ESGOTO')) return 'SANEAMENTO';
  if (f.includes('PAVIMENTACAO') || f.includes('URBANIZACAO') || f.includes('PRACAS')) return 'URBANISMO';
  if (f.includes('EDIFICACOES')) return 'ADMINISTRACAO';
  if (f.includes('ILUMINACAO') || f.includes('ENERGIA')) return 'URBANISMO';
  if (f.includes('EDUCACAO') || f.includes('ESCOLA')) return 'EDUCACAO';
  if (f.includes('SAUDE') || f.includes('HOSPITAL')) return 'SAUDE';
  return 'URBANISMO';
}

async function getCompanyName(cnpj: string): Promise<string> {
  if (!cnpj || cnpj === 'CNPJ OCULTO' || cnpj.length < 11) return 'CONTRATADA NAO IDENTIFICADA';
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj === "92963560000160") return "PREFEITURA MUNICIPAL DE PORTO ALEGRE";

  // Tenta buscar no cache do banco primeiro
  try {
    const cached = await pool.query<{ name: string }>('SELECT name FROM company_cache WHERE cnpj = $1', [cleanCnpj]);
    if (cached.rows.length > 0) {
      return cached.rows[0].name;
    }
  } catch (e) {
    console.error('Error reading company cache:', e);
  }

  try {
    const response = await fetch(`https://api.opencnpj.org/${cleanCnpj}`, {
      headers: { "User-Agent": "POA-Transparente-API/1.0" }
    });
    if (response.ok) {
      const data: any = await response.json();
      const name = (data.razao_social || data.nome_fantasia || `EMPRESA (${cnpj})`).toUpperCase();
      
      // Salva no cache
      try {
        await pool.query(
          'INSERT INTO company_cache (cnpj, name) VALUES ($1, $2) ON CONFLICT (cnpj) DO NOTHING',
          [cleanCnpj, name]
        );
      } catch (e) {
        console.error('Error saving to company cache:', e);
      }
      
      return name;
    }
  } catch (e) {
    console.error(`Error fetching company name for ${cnpj}:`, e);
  }
  return `EMPRESA (${cnpj})`;
}

/**
 * @deprecated Esta função de sincronização direta via Node.js é considerada LEGADA.
 * O novo pipeline de dados utiliza Python (etl/sync_evolution.py) com arquitetura Medallion
 * e lógica de fuzzy matching entre obras e despesas.
 */
export async function syncTceObras(year: number) {
  const obras = await fetchTceObras(year);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const obra of obras) {
      const idObra = obra.idObra;
      const valorGarantia = obra.valorGarantiaObra || 0;
      const valorEstimado = valorGarantia ? valorGarantia * 20 : 150000.0;
      
      const bairro = (obra.localizacao?.bairro || 'PORTO ALEGRE').toUpperCase();
      const familia = (obra.nomesFamilias && obra.nomesFamilias[0]) || 'Obras Gerais';
      const setor = mapSector(familia);
      const numContrato = `${obra.contrato?.numeroContrato || 'S/N'}/${obra.contrato?.anoContrato || ''}`;
      const cnpj = obra.documentoContratada || 'CNPJ OCULTO';
      
      const companyName = await getCompanyName(cnpj);

      const coords = await fetchTceCoordinates(idObra);
      
      const lat = coords?.latitude || null;
      const lng = coords?.longitude || null;

      await client.query(`
        INSERT INTO public_expenses (
          reference_date, agency, company_name, category, sector, 
          district, latitude, longitude, contract_value, bidding_count,
          beneficiary_id, process_number, description_detailed, portal_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (process_number, company_name, description_detailed) 
        DO UPDATE SET 
          contract_value = EXCLUDED.contract_value,
          latitude = COALESCE(EXCLUDED.latitude, public_expenses.latitude),
          longitude = COALESCE(EXCLUDED.longitude, public_expenses.longitude),
          portal_link = EXCLUDED.portal_link
      `, [
        new Date(year, 0, 1),
        "PREFEITURA MUNICIPAL DE PORTO ALEGRE",
        companyName,
        familia.toUpperCase(),
        setor,
        bairro,
        lat,
        lng,
        valorEstimado,
        1,
        cnpj,
        numContrato,
        obra.descricaoObjeto || 'Sem descrição.',
        `https://compras.tce.rs.gov.br/publico/obras/${idObra}`
      ]);
    }

    await client.query('COMMIT');
    return { count: obras.length };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
