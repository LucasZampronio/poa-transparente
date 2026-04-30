import os
import requests
import pandas as pd
import psycopg2
import unicodedata
import re
from rapidfuzz import fuzz
from datetime import datetime
from etl.ingestion.tce import get_coordinates
from etl.ingestion.nominatim import get_coords_from_address
from etl.ingestion.open_cnpj import get_company_name
from etl.utils.db import load_geo_cache, load_company_cache

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
    print("📡 Syncing silver_obras from TCE-RS with Geocoding and Contractor info...")
    geo_cache = load_geo_cache()
    company_cache = load_company_cache()
    all_works = []
    for year in [2026, 2025, 2024, 2023, 2022]:
        url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras?municipio={MUNICIPIO_CODE}&exercicio={year}&page=0&size=100"
        try:
            resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
            if resp.status_code == 200:
                all_works.extend(resp.json().get('content', []))
        except: pass

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    geocoded_count = 0
    for i, w in enumerate(all_works):
        ext_id = w.get('idObra')
        nome = w.get('descricaoObjeto', 'N/A')
        valor = float(w.get('valorGarantiaObra', 0)) * 20 # Proxy value
        bairro = w.get('localizacao', {}).get('bairro', 'PORTO ALEGRE')
        rua = w.get('localizacao', {}).get('logradouro', '')
        
        # Contractor info
        cnpj = str(w.get('documentoContratada', '')).strip()
        nome_empresa = get_company_name(cnpj, company_cache) if cnpj else "N/A"

        # Geolocalização
        coords = get_coordinates(ext_id)
        if not coords:
            full_address = f"{rua}, {bairro}" if rua else bairro
            coords = geo_cache.get(full_address) or get_coords_from_address(full_address, geo_cache)

        lat, lng = coords if coords else (None, None)
        if lat: geocoded_count += 1

        situacao = w.get('situacaoObra', 'N/A')
        orgao = w.get('contrato', {}).get('nomeOrgao', 'PREFEITURA POA')
        ano_exercicio = int(w.get('exercicio', year))
        data_inicio = datetime(ano_exercicio, 1, 1)

        cur.execute("""
            INSERT INTO silver_obras (external_id, nome_obra, descricao, valor_licitado, bairro, latitude, longitude, situacao, orgao, link_tce, data_inicio, contratada_cnpj, contratada_nome)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (external_id) DO UPDATE SET
                valor_licitado = EXCLUDED.valor_licitado,
                latitude = COALESCE(EXCLUDED.latitude, silver_obras.latitude),
                longitude = COALESCE(EXCLUDED.longitude, silver_obras.longitude),
                situacao = EXCLUDED.situacao,
                orgao = EXCLUDED.orgao,
                data_inicio = COALESCE(EXCLUDED.data_inicio, silver_obras.data_inicio),
                contratada_cnpj = EXCLUDED.contratada_cnpj,
                contratada_nome = EXCLUDED.contratada_nome
        """, (ext_id, nome, nome, valor, bairro, lat, lng, situacao, orgao, f"https://compras.tce.rs.gov.br/publico/obras/{ext_id}", data_inicio, cnpj, nome_empresa))

        if i % 20 == 0:
            conn.commit()
            print(f"📑 Progress: {i}/{len(all_works)} works synced.")
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Synced {len(all_works)} works. Geocoded: {geocoded_count}")

def sync_silver_despesas():
    print("📡 Syncing silver_despesas from POA Open Data with Geocoding...")
    geo_cache = load_geo_cache()
    csv_path = "tmp_licitacon.csv"
    if not os.path.exists(csv_path):
        url = "https://dadosabertos.poa.br/dataset/0a376fbb-4c35-4e51-93d0-ef05f32ff1e5/resource/e08dcf9a-9496-4540-a88a-10af1c4779ce/download/licitacon.csv"
        resp = requests.get(url)
        with open(csv_path, 'wb') as f:
            f.write(resp.content)
            
    df = pd.read_csv(csv_path, sep=';', encoding='utf-8')
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Filter only relevant and recent
    df = df[df['ano_licitacao'].isin([2023, 2024, 2025, 2026])]
    df = df.head(10000)
    
    geocoded_count = 0
    for i, row in df.iterrows():
        desc = row.get('desc_objeto', '')
        cnpj = str(row.get('fornec_venc_cnpj_cpf', ''))
        fornecedor = row.get('fornec_vencedor', 'N/A')
        orgao = row.get('orgao_demandante', 'PREFEITURA POA')
        
        # Geocodificação de despesa (Heurística: busca por locais no texto ou usa o órgão como base)
        # Para despesas genéricas, tentamos geolocalizar o Órgão se não houver local específico na descrição
        query_geo = f"{desc}, Porto Alegre" if len(desc) < 100 else f"{orgao}, Porto Alegre"
        coords = geo_cache.get(query_geo) or get_coords_from_address(query_geo, geo_cache)
        
        lat, lng = coords if coords else (None, None)
        if lat: geocoded_count += 1
        
        valor_str = str(row.get('valor_homologado', '0')).replace('.', '').replace(',', '.')
        try:
            valor = float(valor_str)
        except:
            valor = 0
            
        cur.execute("""
            INSERT INTO silver_despesas (num_empenho, data_empenho, valor_empenhado, descricao, cnpj_fornecedor, nome_fornecedor, orgao, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (row.get('num_licitacao'), datetime(int(row['ano_licitacao']), 1, 1), valor, desc, cnpj, fornecedor, orgao, lat, lng))

        if cnpj and cnpj != 'nan':
            cur.execute("""
                INSERT INTO silver_fornecedores (cnpj, nome)
                VALUES (%s, %s) ON CONFLICT (cnpj) DO NOTHING
            """, (cnpj, fornecedor))
            
        if i % 100 == 0:
            conn.commit()
            print(f"📑 Progress: {i}/{len(df)} expenses synced. Geocoded: {geocoded_count}")
            
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Synced {len(df)} records to silver_despesas. Total Geocoded: {geocoded_count}")

def run_matching():
    print("🧠 Starting matching logic (V2 - Supplier Aware)...")
    conn = psycopg2.connect(DATABASE_URL)
    
    obras = pd.read_sql("SELECT id, nome_obra, valor_licitado, contratada_nome FROM silver_obras LIMIT 1000", conn)
    despesas = pd.read_sql("SELECT id, descricao, nome_fornecedor, valor_empenhado FROM silver_despesas LIMIT 10000", conn)
    
    matches = []
    
    for _, obra in obras.iterrows():
        obra_id = obra['id']
        obra_nome_clean = clean_text(obra['nome_obra'])
        obra_valor = float(obra['valor_licitado'])
        obra_contratada = clean_text(obra['contratada_nome'])
        
        for _, desp in despesas.iterrows():
            desp_id = desp['id']
            desp_desc_clean = clean_text(desp['descricao'])
            desp_valor = float(desp['valor_empenhado'])
            desp_fornecedor = clean_text(desp['nome_fornecedor'])
            
            # 1. Similaridade de Texto (Objeto da Obra vs Descrição da Despesa)
            text_sim = fuzz.token_sort_ratio(obra_nome_clean, desp_desc_clean)
            
            # 2. Similaridade de Fornecedor
            if obra_contratada and desp_fornecedor:
                supp_sim = fuzz.token_sort_ratio(obra_contratada, desp_fornecedor)
            else:
                supp_sim = 0
            
            # 3. Similaridade de Valor
            if obra_valor > 0 and desp_valor > 0:
                val_diff = abs(obra_valor - desp_valor) / max(obra_valor, desp_valor)
                value_sim = max(0, 100 - (val_diff * 100))
            else:
                value_sim = 0
                
            # Pesos: Texto (50%), Fornecedor (30%), Valor (20%)
            score = (text_sim * 0.5) + (supp_sim * 0.3) + (value_sim * 0.2)
            
            if score > 50:
                confianca = "alta" if score > 80 else "media"
                matches.append((int(obra_id), int(desp_id), float(score), confianca))
    
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE obra_despesa_match CASCADE")
    for m in matches:
        cur.execute("""
            INSERT INTO obra_despesa_match (obra_id, despesa_id, score, confianca)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (obra_id, despesa_id) DO NOTHING
        """, m)
        
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Generated {len(matches)} matches.")

def populate_gold():
    print("🏆 Populating gold layer...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # 1. gold_obras_com_gastos
    cur.execute("TRUNCATE TABLE gold_obras_com_gastos CASCADE")
    cur.execute("""
        INSERT INTO gold_obras_com_gastos (obra_id, nome_obra, valor_licitado, valor_total_gasto, percentual_execucao, quantidade_despesas)
        SELECT 
            o.id, o.nome_obra, o.valor_licitado,
            SUM(d.valor_empenhado) as total_gasto,
            CASE WHEN o.valor_licitado > 0 THEN (SUM(d.valor_empenhado) / o.valor_licitado) * 100 ELSE 0 END,
            COUNT(d.id)
        FROM silver_obras o
        JOIN obra_despesa_match m ON o.id = m.obra_id
        JOIN silver_despesas d ON m.despesa_id = d.id
        WHERE m.confianca IN ('alta', 'media')
        GROUP BY o.id, o.nome_obra, o.valor_licitado
    """)
    
    # 2. gold_top_empresas
    cur.execute("TRUNCATE TABLE gold_top_empresas CASCADE")
    cur.execute("""
        INSERT INTO gold_top_empresas (cnpj, empresa, total_recebido, quantidade_contratos)
        SELECT 
            cnpj_fornecedor, nome_fornecedor,
            SUM(valor_empenhado),
            COUNT(DISTINCT num_empenho)
        FROM silver_despesas
        WHERE cnpj_fornecedor IS NOT NULL AND cnpj_fornecedor != 'nan'
        GROUP BY cnpj_fornecedor, nome_fornecedor
        ORDER BY SUM(valor_empenhado) DESC
        LIMIT 10
    """)
    
    # 3. gold_gastos_por_bairro
    cur.execute("TRUNCATE TABLE gold_gastos_por_bairro CASCADE")
    cur.execute("""
        INSERT INTO gold_gastos_por_bairro (bairro, total_gasto, quantidade_obras)
        SELECT 
            o.bairro,
            SUM(d.valor_empenhado),
            COUNT(DISTINCT o.id)
        FROM silver_obras o
        JOIN obra_despesa_match m ON o.id = m.obra_id
        JOIN silver_despesas d ON m.despesa_id = d.id
        WHERE m.confianca IN ('alta', 'media')
        GROUP BY o.bairro
    """)

    # 4. gold_top_agencies
    cur.execute("TRUNCATE TABLE gold_top_agencies CASCADE")
    cur.execute("""
        INSERT INTO gold_top_agencies (agency, total_spent, quantidade_contratos)
        SELECT 
            o.orgao,
            SUM(d.valor_empenhado),
            COUNT(DISTINCT d.id)
        FROM silver_obras o
        JOIN obra_despesa_match m ON o.id = m.obra_id
        JOIN silver_despesas d ON m.despesa_id = d.id
        WHERE m.confianca IN ('alta', 'media')
        GROUP BY o.orgao
    """)
    
    # 5. gold_series_temporais
    cur.execute("TRUNCATE TABLE gold_series_temporais CASCADE")
    cur.execute("""
        INSERT INTO gold_series_temporais (data, total_gasto)
        SELECT 
            data_empenho,
            SUM(valor_empenhado)
        FROM silver_despesas
        GROUP BY data_empenho
        ORDER BY data_empenho
    """)
    
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Gold layer populated.")

if __name__ == "__main__":
    sync_silver_obras()
    sync_silver_despesas()
    run_matching()
    populate_gold()
