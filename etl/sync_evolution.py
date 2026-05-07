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
from etl.gold.aggregators import aggregate_gold_data

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

def clean_text(text):
    if not text or pd.isna(text): return ""
    text = str(text).lower()
    nfkd_form = unicodedata.normalize('NFKD', text)
    text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    text = re.sub(r'[^a-z0-9 ]', ' ', text)
    return " ".join(text.split())

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
            
            if i == 0:
                print(f"🔍 DEBUG: Sample record keys for {year}: {list(w.keys())}")
                print(f"🔍 DEBUG: Sample record content: {w}")
                
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
    print(f"✅ Finished Syncing Works. Total: {total_processed}")

def sync_silver_despesas():
    print("📡 Syncing silver_despesas from POA Open Data...")
    url = "https://dadosabertos.poa.br/dataset/0a376fbb-4c35-4e51-93d0-ef05f32ff1e5/resource/e08dcf9a-9496-4540-a88a-10af1c4779ce/download/licitacon.csv"
    try:
        df = pd.read_csv(url, sep=';', encoding='utf-8')
        df = df[df['ano_licitacao'].isin([2024, 2025])] # Filtro para ser mais rápido
        
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        for i, row in df.head(2000).iterrows():
            # Inserção simplificada para popular o Dashboard
            cur.execute("""
                INSERT INTO silver_despesas (num_empenho, data_empenho, valor_pago, descricao, cnpj_fornecedor, nome_fornecedor, orgao)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (row.get('num_licitacao'), datetime(int(row['ano_licitacao']), 1, 1), 
                  float(str(row.get('valor_homologado', 0)).replace(',', '.')), 
                  row.get('desc_objeto'), str(row.get('fornec_venc_cnpj_cpf')), 
                  row.get('fornec_vencedor'), row.get('orgao_demandante')))
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"✅ Synced {len(df.head(2000))} expenses.")
    except Exception as e:
        print(f"❌ Error syncing expenses: {e}")

def run_matching():
    # Lógica simplificada de matching para popular as tabelas vinculadas
    print("🧠 Running matching logic...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("INSERT INTO obra_despesa_match (obra_id, despesa_id, score, confianca) SELECT o.id, d.id, 100, 'alta' FROM silver_obras o, silver_despesas d WHERE d.descricao ILIKE '%' || o.nome_obra || '%' ON CONFLICT DO NOTHING")
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    sync_silver_obras()
    sync_silver_despesas()
    run_matching()
    aggregate_gold_data() # Chama a função importada do etl.gold.aggregators
