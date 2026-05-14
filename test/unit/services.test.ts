import { jest } from '@jest/globals';
import { portalGet, fetchConvenios, getBolsaFamiliaFromDb, syncBolsaFamilia } from '../../api/src/services/portal-transparencia.js';
import { openDataGet, searchPoaDatasets } from '../../api/src/services/conecta-dados-abertos.js';
import { pool } from '../../api/src/db.js';

describe('API Services (Unit)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { 
      ...originalEnv, 
      PORTAL_TRANSPARENCIA_API_KEY: 'test-key',
      CONECTA_GOV_TOKEN: 'test-token'
    };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Portal Transparencia Service', () => {
    it('portalGet should throw error if API key is missing', async () => {
      delete process.env.PORTAL_TRANSPARENCIA_API_KEY;
      await expect(portalGet('/test', {})).rejects.toThrow('Chave da API do Portal da Transparencia não configurada');
    });

    it('portalGet should call fetch with correct URL and headers', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'ok' }) };
      jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse as any);

      const result = await portalGet('/test', { param1: 'val1' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.portaldatransparencia.gov.br/api-de-dados/test?param1=val1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'chave-api-dados': 'test-key'
          })
        })
      );
      expect(result).toEqual({ data: 'ok' });
    });

    it('fetchConvenios should call portalGet with convenio params', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ 
        ok: true, 
        json: () => Promise.resolve([]) 
      } as any);

      const result = await fetchConvenios('4314902', 2024);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/convenios?codigoMunicipioIbge=4314902&dataInicial=01%2F01%2F2024&dataFinal=31%2F12%2F2024'),
        expect.any(Object)
      );
      expect(result).toEqual([]);
    });

    it('getBolsaFamiliaFromDb should return rows from DB', async () => {
      const mockRows = [{ id: 1, valor: 100 }];
      jest.spyOn(pool, 'query').mockResolvedValue({ rows: mockRows } as any);

      const result = await getBolsaFamiliaFromDb(202401, '4314902');

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [202401, '4314902']);
      expect(result).toEqual(mockRows);
    });

    it('syncBolsaFamilia should handle API errors and update status to FAILED', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('INSERT INTO portal_transparencia_sync_runs')) {
            return { rows: [{ id: 'run-123' }] };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      jest.spyOn(pool, 'connect').mockResolvedValue(mockClient as any);
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API Down'));

      await expect(syncBolsaFamilia('202401', '4314902')).rejects.toThrow('API Down');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE portal_transparencia_sync_runs SET status = 'FAILED'"),
        expect.any(Array)
      );
    });
  });

  describe('Conecta Dados Abertos Service', () => {
    it('openDataGet should throw if token is missing', async () => {
      delete process.env.CONECTA_GOV_TOKEN;
      await expect(openDataGet('/test')).rejects.toThrow('Token do Conecta GOV não configurado');
    });

    it('openDataGet should call fetch with Bearer token', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
      jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse as any);

      const result = await openDataGet('/package_search', { q: 'poa' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/package_search?q=poa'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('searchPoaDatasets should call openDataGet with default poa query', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({ 
        ok: true, 
        json: () => Promise.resolve({ results: [] }) 
      } as any);

      const result = await searchPoaDatasets();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=Porto+Alegre'),
        expect.any(Object)
      );
      expect(result).toEqual({ results: [] });
    });
  });
});
