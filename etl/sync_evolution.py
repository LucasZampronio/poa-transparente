import os
import requests
import psycopg2
import unicodedata
import re
import psutil
import sys
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
    print(f"   🧠 RAM Usage: {mem:.2f} MB", flush=True)

def sync_silver_obras():
    print("📡 Syncing silver_obras (ULTRA-VERBOSE MODE)...", flush=True)
    log_memory()
    geo_cache = load_geo_cache()
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    geocoded_count = 0
    total_processed = 0

    for year in [2026, 2025, 2024, 2023, 2022]:
        print(f"📅 Year: {year}", flush=True)
        works_year = get_works(year) 
        
        if not works_year: 
            print(f"   ∅ No works found for {year}", flush=True)
            continue

        print(f"   📦 Found {len(works_year)} works. Starting sync...", flush=True)

        for i, w in enumerate(works_year):
            ext_id = w.get('idObra')
            if not ext_id: continue
                
            nome = smart_clean(w.get('descricaoObjeto', 'Obra Sem Nome'))
            print(f"   🚜 [{total_processed + 1}/{len(works_year)}] Processing: {nome[:50]}...", flush=True)
            
            loc = w.get('localizacao', {})
            bairro = normalize_bairro(loc.get('bairro', 'Centro Histórico'))
            rua = smart_clean(loc.get('logradouro', ''))
            cep = str(loc.get('cep', '')).strip().replace('-', '')
            
            # Extração detalhada de valores
            v_total = w.get('valorTotal', 0)
            v_contrato = w.get('valorContrato', 0)
            v_garantia = w.get('valorGarantiaObra', 0)
            # Valor principal segue a prioridade: Contrato -> Total -> Garantia
            valor_principal = v_contrato if v_contrato > 0 else (v_total if v_total > 0 else v_garantia)
            
            # Detalhes (chamadas de API individuais)
            print(f"      📡 Fetching details for work {ext_id}...", end="", flush=True)
            fiscal_nome, fiscal_info = get_responsaveis(ext_id)
            coords = get_coordinates(ext_id)
            print(" Done.", flush=True)

            # Extrair dados da contratada
            contrato_data = w.get('contrato', {})
            empresa_nome = smart_clean(contrato_data.get('nomeContratado', 'EMPRESA NÃO INFORMADA'))
            empresa_cnpj = contrato_data.get('cpfCnpjContratado', 'N/A')
            
            if not coords:
                # 1ª Tentativa: CEP + Logradouro (Mais preciso)
                if cep and cep != "0" and rua and rua != "N/A":
                    cep_address = f"{rua}, {cep}, Brazil"
                    print(f"      📍 Geocoding by CEP+Street: {cep_address[:40]}...", end="", flush=True)
                    coords = geo_cache.get(cep_address) or get_coords_from_address(cep_address, geo_cache)
                    if coords: print(" Success!", flush=True)
                    else: print(" Failed.", flush=True)
                    import time
                    time.sleep(1)

                # 2ª Tentativa: Endereço completo (Fallback padrão)
                if not coords and rua and rua != "N/A":
                    full_address = f"{rua}, {bairro}, Porto Alegre"
                    print(f"      📍 Geocoding by Address: {full_address[:40]}...", end="", flush=True)
                    coords = geo_cache.get(full_address) or get_coords_from_address(full_address, geo_cache)
                    if coords: print(" Success!", flush=True)
                    else: print(" Failed.", flush=True)
                    import time
                    time.sleep(1)
                
                # 3ª Tentativa: Apenas o bairro (Último recurso para garantir presença no mapa)
                if not coords:
                    fallback_address = f"{bairro}, Porto Alegre"
                    print(f"      📍 Fallback to Neighborhood: {fallback_address}...", end="", flush=True)
                    coords = geo_cache.get(fallback_address) or get_coords_from_address(fallback_address, geo_cache)
                    if coords:
                        import random
                        # Jitter para evitar sobreposição no centro do bairro
                        coords = (coords[0] + random.uniform(-0.001, 0.001), 
                                 coords[1] + random.uniform(-0.001, 0.001))
                        print(" Success (with jitter)!", flush=True)
                    else:
                        print(" Total failure.", flush=True)
                    import time
                    time.sleep(1)

            lat, lng = coords if coords else (None, None)
            if lat: geocoded_count += 1

            cur.execute("""
                INSERT INTO silver_obras (
                    external_id, nome_obra, descricao, valor_licitado, bairro, logradouro, 
                    latitude, longitude, situacao, orgao, link_tce, data_inicio,
                    contratada_cnpj, contratada_nome, fiscal_nome, fiscal_info,
                    valor_total, valor_contrato, valor_garantia
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (external_id) DO UPDATE SET
                    valor_licitado = EXCLUDED.valor_licitado,
                    nome_obra = EXCLUDED.nome_obra,
                    latitude = COALESCE(EXCLUDED.latitude, silver_obras.latitude),
                    longitude = COALESCE(EXCLUDED.longitude, silver_obras.longitude),
                    contratada_cnpj = EXCLUDED.contratada_cnpj,
                    contratada_nome = EXCLUDED.contratada_nome,
                    fiscal_nome = EXCLUDED.fiscal_nome,
                    fiscal_info = EXCLUDED.fiscal_info,
                    valor_total = EXCLUDED.valor_total,
                    valor_contrato = EXCLUDED.valor_contrato,
                    valor_garantia = EXCLUDED.valor_garantia
            """, (ext_id, nome, nome, valor_principal, bairro, rua, lat, lng, 
                  w.get('situacaoObra', 'N/A'), 
                  contrato_data.get('nomeOrgao', 'PREFEITURA POA'),
                  f"https://compras.tce.rs.gov.br/publico/obras/{ext_id}",
                  datetime(year, 1, 1),
                  empresa_cnpj, empresa_nome, fiscal_nome, fiscal_info,
                  v_total, v_contrato, v_garantia))

            total_processed += 1
            # Commit a cada obra para visibilidade imediata no frontend
            conn.commit()
            if total_processed % 5 == 0:
                log_memory()

        del works_year
        
    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Sync Finished. Total: {total_processed} Geocoded: {geocoded_count}", flush=True)

def sync_silver_despesas():
    print("📡 Syncing silver_despesas from Dados Abertos POA...", flush=True)
    
    # URLs dos recursos identificados (2022 e 2023 possuem dados)
    resources = [
        {"year": 2022, "url": "https://dadosabertos.poa.br/dataset/b5eac908-416d-42f0-9fb6-432f1b717ff1/resource/b9ec16ee-e3a0-4f65-bf71-fc012320baed/download/despesas_2022.csv"},
        {"year": 2023, "url": "https://dadosabertos.poa.br/dataset/b5eac908-416d-42f0-9fb6-432f1b717ff1/resource/b4f27d52-b65b-4516-b540-ce6cd6788607/download/despesas_2023.csv"}
    ]
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    total_inserted = 0
    
    for res in resources:
        year = res["year"]
        url = res["url"]
        print(f"   📥 Downloading despesas {year}...", flush=True)
        
        try:
            response = requests.get(url, timeout=60)
            if response.status_code != 200:
                print(f"   ⚠️ Error downloading {year}: {response.status_code}")
                continue
                
            import io
            import pandas as pd
            
            # Decodifica usando ISO-8859-1 (comum em portais gov BR) e usa separador ';'
            content = response.content.decode('iso-8859-1')
            df = pd.read_csv(io.StringIO(content), sep=';')
            
            print(f"   📊 Processando {len(df)} registros para {year}...", flush=True)
            
            for _, row in df.iterrows():
                # Mapeamento baseado na inspeção do CSV
                # Colunas: ['data_extracao', 'orgao', 'nome_orgao', 'exercicio', 'mes', ..., 'vlemp', 'vlliq', 'vlpag']
                
                try:
                    # Criamos um num_empenho sintético ou usamos um existente se houver (o CSV não parece ter o ID do empenho direto, vamos usar o índice/mes)
                    mes = int(row['mes'])
                    data_empenho = datetime(year, mes, 1)
                    
                    cur.execute("""
                        INSERT INTO silver_despesas (
                            num_empenho, data_empenho, valor_empenhado, valor_liquidado, valor_pago,
                            descricao, nome_fornecedor, orgao
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        f"EMP-{year}-{mes}-{total_inserted}",
                        data_empenho,
                        float(str(row['vlemp']).replace(',', '.')),
                        float(str(row['vlliq']).replace(',', '.')),
                        float(str(row['vlpag']).replace(',', '.')),
                        row['desc_elemento'] if 'desc_elemento' in row else 'Despesa Orçamentária',
                        row['nome_orgao'], # Fallback já que não temos o fornecedor detalhado neste CSV
                        row['nome_orgao']
                    ))
                    total_inserted += 1
                except Exception as e:
                    continue # Pula erros de parsing individuais
            
            conn.commit()
            print(f"   ✅ Year {year} synced.", flush=True)
            
        except Exception as e:
            print(f"   ❌ Error processing {year}: {e}")
            
    cur.close()
    conn.close()
    print(f"✨ Total despesas synced: {total_inserted}")

if __name__ == "__main__":
    sync_silver_obras()
    sync_silver_despesas()
    aggregate_gold_data()
