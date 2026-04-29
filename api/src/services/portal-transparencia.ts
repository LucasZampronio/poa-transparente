import crypto from 'crypto';
import { pool } from '../db.js';

const BASE_URL = 'https://api.portaldatransparencia.gov.br/api-de-dados';

export async function portalGet<T>(path: string, params: Record<string, string | number>) {
  const url = new URL(`${BASE_URL}${path}`);
  const apiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;

  if (!apiKey) {
    throw new Error('Chave da API do Portal da Transparencia não configurada (PORTAL_TRANSPARENCIA_API_KEY).');
  }

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), {
    headers: {
      'chave-api-dados': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Portal Transparencia HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export type BolsaFamiliaResponse = {
  id: number;
  dataReferencia: string;
  municipio: {
    codigoIBGE: string;
    nomeIBGE: string;
    pais: string;
    nomeIBGEex: string;
    uf: {
      sigla: string;
      nome: string;
    };
  };
  tipo: {
    id: number;
    descricao: string;
    descricaoDetalhada: string;
  };
  valor: number;
  quantidadeBeneficiados: number;
};

export type ConvenioResponse = {
  id: number;
  numeroConvenio: string;
  objeto: string;
  valorCelebrado: number;
  dataAssinatura: string;
  situacao: string;
  concedente: {
    nome: string;
    orgaoSuperior: string;
  };
  conveniado: {
    nome: string;
    cnpj: string;
  };
  localidade: {
    nome: string;
    uf: string;
  };
};

export async function fetchConvenios(codigoIbge: string, ano: number) {
  // A API usa dataInicial e dataFinal no formato dd/MM/yyyy
  const params = {
    codigoMunicipioIbge: codigoIbge,
    dataInicial: `01/01/${ano}`,
    dataFinal: `31/12/${ano}`,
    pagina: 1
  };
  
  return portalGet<ConvenioResponse[]>('/convenios', params);
}

export async function syncBolsaFamilia(mesAno: string, codigoIbge: string) {
  const datasetKey = 'bolsa-familia-por-municipio';
  
  // 1. Cria a run de sync no BD
  const client = await pool.connect();
  let syncRunId: string | null = null;
  
  try {
    await client.query('BEGIN');
    const runResult = await client.query(
      `INSERT INTO portal_transparencia_sync_runs (dataset_key, request_params, status) 
       VALUES ($1, $2, 'RUNNING') RETURNING id`,
      [datasetKey, JSON.stringify({ mesAno, codigoIbge })]
    );
    syncRunId = runResult.rows[0].id as string;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }

  // 2. Busca na API
  let data: BolsaFamiliaResponse[] = [];
  try {
    // A API do Portal usa paginação. Assumindo página 1 para começar.
    data = await portalGet<BolsaFamiliaResponse[]>('/novo-bolsa-familia-por-municipio', {
      mesAno,
      codigoIbge,
      pagina: 1
    });
  } catch (error: any) {
    await client.query(
      `UPDATE portal_transparencia_sync_runs SET status = 'FAILED', error_message = $1, finished_at = NOW() WHERE id = $2`,
      [error.message, syncRunId]
    );
    client.release();
    throw error;
  }

  // 3. Insere os dados no banco
  try {
    await client.query('BEGIN');

    for (const record of data) {
      const externalId = String(record.id);
      const payloadString = JSON.stringify(record);
      const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');
      
      // 3a. Salva na tabela Raw (Bronze)
      await client.query(
        `INSERT INTO portal_transparencia_raw_records (
          dataset_key, external_id, scope_key, reference_key, data_referencia, payload_hash, payload, last_sync_run_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (dataset_key, external_id) DO UPDATE SET 
          payload = EXCLUDED.payload,
          payload_hash = EXCLUDED.payload_hash,
          last_seen_at = NOW()`,
        [
          datasetKey,
          externalId,
          codigoIbge,
          mesAno,
          record.dataReferencia,
          payloadHash,
          payloadString,
          syncRunId
        ]
      );

      // 3b. Salva na tabela Analítica
      await client.query(
        `INSERT INTO portal_beneficios_municipio (
          dataset_key, external_id, mes_ano, data_referencia, 
          municipio_codigo_ibge, municipio_nome, uf_sigla, 
          beneficio_tipo_id, beneficio_tipo_descricao, beneficio_tipo_detalhe, 
          valor, quantidade_beneficiados, raw_payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (dataset_key, external_id) DO UPDATE SET 
          valor = EXCLUDED.valor,
          quantidade_beneficiados = EXCLUDED.quantidade_beneficiados,
          raw_payload = EXCLUDED.raw_payload,
          synced_at = NOW()`,
        [
          datasetKey,
          externalId,
          parseInt(mesAno, 10),
          record.dataReferencia,
          record.municipio.codigoIBGE,
          record.municipio.nomeIBGE,
          record.municipio.uf.sigla,
          record.tipo.id,
          record.tipo.descricao,
          record.tipo.descricaoDetalhada,
          record.valor,
          record.quantidadeBeneficiados,
          payloadString
        ]
      );
    }

    await client.query(
      `UPDATE portal_transparencia_sync_runs 
       SET status = 'SUCCESS', records_fetched = $1, pages_fetched = 1, finished_at = NOW() 
       WHERE id = $2`,
      [data.length, syncRunId]
    );

    await client.query('COMMIT');
  } catch (err: any) {
    await client.query('ROLLBACK');
    await client.query(
      `UPDATE portal_transparencia_sync_runs SET status = 'FAILED', error_message = $1, finished_at = NOW() WHERE id = $2`,
      [err.message, syncRunId]
    );
    throw err;
  } finally {
    client.release();
  }

  return { syncedRecords: data.length };
}

export async function getBolsaFamiliaFromDb(mesAno: number, codigoIbge: string) {
  const result = await pool.query(
    `SELECT 
        id, 
        mes_ano, 
        municipio_codigo_ibge as codigo_ibge, 
        municipio_nome as nome_municipio, 
        valor as valor_transferido, 
        quantidade_beneficiados as quantidade_beneficiarios
     FROM portal_beneficios_municipio 
     WHERE dataset_key = 'bolsa-familia-por-municipio' 
       AND mes_ano = $1 
       AND municipio_codigo_ibge = $2`,
    [mesAno, codigoIbge]
  );
  return result.rows;
}
