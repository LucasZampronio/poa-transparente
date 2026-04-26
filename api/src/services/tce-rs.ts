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

      const coords = await fetchTceCoordinates(idObra);
      
      // Fallback simplificado (em produção usaríamos uma tabela de bairros)
      const lat = coords?.latitude || -30.0330 + (Math.random() - 0.5) * 0.01;
      const lng = coords?.longitude || -51.2210 + (Math.random() - 0.5) * 0.01;

      await client.query(`
        INSERT INTO public_expenses (
          reference_date, agency, company_name, category, sector, 
          district, latitude, longitude, contract_value, bidding_count,
          beneficiary_id, process_number, description_detailed, portal_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        new Date(year, 0, 1),
        "PREFEITURA MUNICIPAL DE PORTO ALEGRE",
        (obra.descricaoObjeto || 'OBRA PUBLICA').substring(0, 180).toUpperCase(),
        familia.toUpperCase(),
        setor,
        bairro,
        lat,
        lng,
        valorEstimado,
        1,
        obra.documentoContratada || 'CNPJ OCULTO',
        numContrato,
        obra.descricaoObjeto || 'Sem descrição.',
        'https://tce.rs.gov.br/licitacon'
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
