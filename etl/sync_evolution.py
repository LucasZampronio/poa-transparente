import os
import requests
import pandas as pd
import psycopg2
import unicodedata
import re
from rapidfuzz import fuzz
from datetime import datetime
from etl.ingestion.tce import get_coordinates, get_responsaveis, get_works
from etl.ingestion.nominatim import get_coords_from_address
from etl.ingestion.open_cnpj import get_company_name
from etl.utils.db import load_geo_cache, load_company_cache
from etl.silver.cleaners import normalize_bairro, smart_clean

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

def sync_silver_obras():
    print("📡 Syncing silver_obras from TCE-RS (Memory-Optimized)...")
    geo_cache = load_geo_cache()
    company_cache = load_company_cache()
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    geocoded_count = 0
    total_processed = 0

    # Processamos ano a ano para não estourar a memória (OOM 137 fix)
    for year in [2026, 2025, 2024, 2023, 2022]:
        print(f"📅 Processing year: {year}")
        works_year = get_works(year)
        
        if not works_year:
            continue

        for i, w in enumerate(works_year):
            ext_id = w.get('idObra')
            if not ext_id:
                continue
                
            nome = smart_clean(w.get('objeto', w.get('nomeObra', 'Obra Sem Nome')))
            bairro = normalize_bairro(w.get('localizacao', {}).get('bairro', 'Centro Histórico'))
            valor = w.get('valorTotal', w.get('valorLicitado', 0))
            rua = smart_clean(w.get('localizacao', {}).get('logradouro', ''))
            
            # Contractor info
            cnpj = str(w.get('documentoContratada', '')).strip()
            nome_empresa = get_company_name(cnpj, company_cache) if cnpj else "N/A"

            # Fiscal e Uso
            fiscal_nome, fiscal_info = get_responsaveis(ext_id)
            finalidade = ", ".join(w.get('caracteristicas', [])) if w.get('caracteristicas') else "N/A"

            # Geolocalização
            coords = get_coordinates(ext_id)
            if not coords:
                full_address = f"{rua}, {bairro}, Porto Alegre" if rua and rua != 'N/A' else f"{bairro}, Porto Alegre"
                coords = geo_cache.get(full_address) or get_coords_from_address(full_address, geo_cache)

            lat, lng = coords if coords else (None, None)
            if lat: geocoded_count += 1

            situacao = w.get('situacaoObra', 'N/A')
            orgao = w.get('contrato', {}).get('nomeOrgao', 'PREFEITURA POA')
            
            # Datas
            ano_exercicio = int(w.get('exercicio', year))
            data_inicio_raw = w.get('dataValidadeGarantiaObra') 
            try:
                data_inicio = datetime.fromisoformat(data_inicio_raw) if data_inicio_raw else datetime(ano_exercicio, 1, 1)
            except:
                data_inicio = datetime(ano_exercicio, 1, 1)

            cur.execute("""
                INSERT INTO silver_obras (
                    external_id, nome_obra, descricao, valor_licitado, bairro, logradouro, 
                    latitude, longitude, situacao, orgao, link_tce, data_inicio, 
                    contratada_cnpj, contratada_nome, fiscal_nome, fiscal_info, finalidade
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (external_id) DO UPDATE SET
                    valor_licitado = EXCLUDED.valor_licitado,
                    nome_obra = EXCLUDED.nome_obra,
                    logradouro = EXCLUDED.logradouro,
                    latitude = COALESCE(EXCLUDED.latitude, silver_obras.latitude),
                    longitude = COALESCE(EXCLUDED.longitude, silver_obras.longitude),
                    situacao = EXCLUDED.situacao,
                    orgao = EXCLUDED.orgao,
                    data_inicio = COALESCE(EXCLUDED.data_inicio, silver_obras.data_inicio),
                    contratada_cnpj = EXCLUDED.contratada_cnpj,
                    contratada_nome = EXCLUDED.contratada_nome,
                    fiscal_nome = EXCLUDED.fiscal_nome,
                    fiscal_info = EXCLUDED.fiscal_info,
                    finalidade = EXCLUDED.finalidade
            """, (ext_id, nome, nome, valor, bairro, rua, lat, lng, situacao, orgao, f"https://compras.tce.rs.gov.br/publico/obras/{ext_id}", data_inicio, cnpj, nome_empresa, fiscal_nome, fiscal_info, finalidade))

            total_processed += 1
            if total_processed % 50 == 0:
                conn.commit()
                print(f"📑 Progress: {total_processed} works synced so far...")

        # Limpeza explícita de memória para o próximo ano
        del works_year
        
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Finished. Total processed: {total_processed}. Geocoded: {geocoded_count}")

def sync_silver_despesas(): pass
def run_matching(): pass
def populate_gold(): pass

if __name__ == "__main__":
    sync_silver_obras()
