import os
import requests
import psycopg2
import unicodedata
import re
import psutil
from datetime import datetime
from etl.ingestion.tce import get_coordinates, get_responsaveis, get_works
from etl.ingestion.nominatim import get_coords_from_address
from etl.utils.db import load_geo_cache
from etl.silver.cleaners import normalize_bairro, smart_clean
from etl.gold.aggregators import aggregate_gold_data

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

def log_memory():
    process = psutil.Process(os.getpid())
    mem = process.memory_info().rss / 1024 / 1024
    print(f"🧠 RAM Usage: {mem:.2f} MB")

def sync_silver_obras():
    print("📡 Syncing silver_obras (Performance Mode)...")
    log_memory()
    geo_cache = load_geo_cache()
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    geocoded_count = 0
    total_processed = 0

    for year in [2026, 2025, 2024, 2023, 2022]:
        print(f"📅 Year: {year}")
        works_year = get_works(year) # Agora usamos a função de paginação real
        log_memory()
        
        if not works_year: continue

        for i, w in enumerate(works_year):
            ext_id = w.get('idObra')
            if not ext_id: continue
                
            nome = smart_clean(w.get('descricaoObjeto', 'Obra Sem Nome'))
            loc = w.get('localizacao', {})
            bairro = normalize_bairro(loc.get('bairro', 'Centro Histórico'))
            rua = smart_clean(loc.get('logradouro', ''))
            valor = w.get('valorTotal', w.get('valorContrato', w.get('valorGarantiaObra', 0)))
            
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
            if total_processed % 100 == 0:
                conn.commit()
                print(f"📑 Progress: {total_processed} works. ", end="")
                log_memory()

        del works_year
        
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Sync Finished. Total: {total_processed}")

if __name__ == "__main__":
    sync_silver_obras()
    aggregate_gold_data()
