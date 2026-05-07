import os
import requests
import psycopg2
import unicodedata
import re
import csv
from datetime import datetime
from etl.ingestion.tce import get_coordinates, get_responsaveis
from etl.ingestion.nominatim import get_coords_from_address
from etl.ingestion.open_cnpj import get_company_name
from etl.utils.db import load_geo_cache, load_company_cache
from etl.silver.cleaners import normalize_bairro, smart_clean
from etl.gold.aggregators import aggregate_gold_data

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

def sync_silver_obras():
    print("📡 Syncing silver_obras (ULTRA-LIGHT MODE)...")
    geo_cache = load_geo_cache()
    # Company cache desativado se falhar para economizar RAM
    try:
        company_cache = load_company_cache()
    except:
        company_cache = {}
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    geocoded_count = 0
    total_processed = 0

    for year in [2026, 2025, 2024, 2023, 2022]:
        print(f"📅 Year: {year}")
        page = 0
        while True:
            url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras?municipio={MUNICIPIO_CODE}&exercicio={year}&page={page}&size=50"
            try:
                resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
                if resp.status_code != 200: break
                
                data = resp.json()
                works = data.get('content', [])
                if not works: break
                
                for w in works:
                    ext_id = w.get('idObra')
                    if not ext_id: continue
                    
                    nome = smart_clean(w.get('descricaoObjeto', 'Obra Sem Nome'))
                    loc = w.get('localizacao', {})
                    bairro = normalize_bairro(loc.get('bairro', 'Centro Histórico'))
                    rua = smart_clean(loc.get('logradouro', ''))
                    valor = w.get('valorTotal', w.get('valorContrato', w.get('valorGarantiaObra', 0)))
                    
                    # Detalhes (chamadas de API individuais - lento mas seguro para RAM)
                    fiscal_nome, fiscal_info = get_responsaveis(ext_id)
                    coords = get_coordinates(ext_id)
                    
                    if not coords:
                        full_address = f"{rua}, {bairro}, Porto Alegre"
                        coords = geo_cache.get(full_address) or get_coords_from_address(full_address, geo_cache)

                    lat, lng = coords if coords else (None, None)
                    if lat: geocoded_count += 1

                    cur.execute("""
                        INSERT INTO silver_obras (
                            external_id, nome_obra, descricao, valor_licitado, bairro, logradouro, 
                            latitude, longitude, situacao, orgao, link_tce, data_inicio
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (external_id) DO UPDATE SET
                            valor_licitado = EXCLUDED.valor_licitado,
                            nome_obra = EXCLUDED.nome_obra,
                            latitude = COALESCE(EXCLUDED.latitude, silver_obras.latitude),
                            longitude = COALESCE(EXCLUDED.longitude, silver_obras.longitude)
                    """, (ext_id, nome, nome, valor, bairro, rua, lat, lng, 
                          w.get('situacaoObra', 'N/A'), 
                          w.get('contrato', {}).get('nomeOrgao', 'PREFEITURA POA'),
                          f"https://compras.tce.rs.gov.br/publico/obras/{ext_id}",
                          datetime(year, 1, 1)))

                    total_processed += 1
                
                conn.commit()
                print(f"   - Page {page} processed. Total: {total_processed}")
                
                if data.get('last') is True: break
                page += 1
            except Exception as e:
                print(f"   ⚠️ Error on year {year} page {page}: {e}")
                break
                
    cur.close()
    conn.close()
    print(f"✅ Works Synced: {total_processed}")

def sync_silver_despesas():
    print("📡 Syncing silver_despesas (No-Pandas Mode)...")
    # Implementação futura com biblioteca csv nativa para economizar RAM
    pass

if __name__ == "__main__":
    sync_silver_obras()
    aggregate_gold_data()
