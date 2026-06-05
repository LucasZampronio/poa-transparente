import os
import requests
import psycopg2
import unicodedata
import re
import psutil
import sys
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import psycopg2.extras
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

def log_memory():
    process = psutil.Process(os.getpid())
    mem = process.memory_info().rss / 1024 / 1024
    print(f"   🧠 RAM Usage: {mem:.2f} MB", flush=True)

def process_single_work(w, year, geo_cache, company_cache):
    """Processa uma única obra (chamadas de API e enriquecimento) - Thread-Safe para I/O"""
    try:
        ext_id = w.get('idObra')
        if not ext_id: return None
            
        nome = smart_clean(w.get('descricaoObjeto', 'Obra Sem Nome'))
        
        loc = w.get('localizacao', {})
        bairro = normalize_bairro(loc.get('bairro', 'Centro Histórico'))
        rua = smart_clean(loc.get('logradouro', ''))
        cep = str(loc.get('cep', '')).strip().replace('-', '')
        
        # Extração detalhada de valores
        v_total_detalhe = w.get('valorTotal', 0)
        v_contrato = w.get('valorContrato', 0)
        v_garantia = w.get('valorGarantiaObra', 0)
        
        # Valor Principal (Teto do Contrato)
        valor_principal = v_contrato if v_contrato > 0 else (v_total_detalhe if v_total_detalhe > 0 else v_garantia)
        
        # Simulação de Valor Executado (Total Gasto até agora)
        # Em um sistema real, buscaríamos as medições. Aqui vamos usar a Garantia como 
        # o valor contratado e o valor licitado como a estimativa original.
        v_licitado = valor_principal * 1.1 # Estima que o licitado era 10% maior (comum em editais)
        v_executado = v_garantia # O valor de garantia costuma ser o valor base do contrato assinado
        
        fiscal_nome, fiscal_info = get_responsaveis(ext_id)
        coords = get_coordinates(ext_id)

        contrato_data = w.get('contrato', {})
        empresa_cnpj = str(w.get('documentoContratada') or contrato_data.get('cpfCnpjContratado') or 'N/A')
        empresa_nome = smart_clean(w.get('nomeContratada') or contrato_data.get('nomeContratado', ''))
        
        if not empresa_nome or empresa_nome in ['EMPRESA NAO INFORMADA', '', 'N/A']:
            if empresa_cnpj != 'N/A' and len(empresa_cnpj) > 10:
                empresa_nome = get_company_name(empresa_cnpj, company_cache) or 'EMPRESA NÃO INFORMADA'
            else:
                empresa_nome = 'EMPRESA NÃO INFORMADA'

        if not coords:
            if cep and cep != "0" and rua and rua != "N/A":
                cep_address = f"{rua}, {cep}, Brazil"
                coords = geo_cache.get(cep_address) or get_coords_from_address(cep_address, geo_cache)
            if not coords and rua and rua != "N/A":
                full_address = f"{rua}, {bairro}, Porto Alegre"
                coords = geo_cache.get(full_address) or get_coords_from_address(full_address, geo_cache)
            if not coords:
                fallback_address = f"{bairro}, Porto Alegre"
                coords = geo_cache.get(fallback_address) or get_coords_from_address(fallback_address, geo_cache)
                if coords:
                    import random
                    coords = (coords[0] + random.uniform(-0.001, 0.001), coords[1] + random.uniform(-0.001, 0.001))

        lat, lng = coords if coords else (None, None)

        return (ext_id, nome, nome, valor_principal, bairro, rua, lat, lng, 
                w.get('situacaoObra', 'N/A'), 
                contrato_data.get('nomeOrgao', 'PREFEITURA POA'),
                f"https://compras.tce.rs.gov.br/publico/obras/{ext_id}",
                datetime(year, 1, 1),
                empresa_cnpj, empresa_nome, fiscal_nome, fiscal_info,
                v_total, v_contrato, v_garantia, subfamilia)
    except Exception as e:
        print(f"      ❌ Erro ao processar obra {w.get('idObra')}: {e}")
        return None

def sync_silver_obras():
    print("📡 Syncing silver_obras (ULTRA-VERBOSE MODE)...", flush=True)
    log_memory()
    geo_cache = load_geo_cache()
    company_cache = load_company_cache()
    
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
            
            # Extração detalhada de valores (Fallback hierárquico)
            # A API de listagem do TCE-RS é limitada. Valor contrato > Valor Total > Valor Garantia
            v_total = w.get('valorTotal', 0)
            v_contrato = w.get('valorContrato', 0)
            v_garantia = w.get('valorGarantiaObra', 0)
            
            # Se v_contrato for 0, mas temos v_garantia, usamos v_garantia como estimativa do contrato
            valor_principal = v_contrato if v_contrato > 0 else (v_total if v_total > 0 else v_garantia)
            
            # Detalhes (chamadas de API individuais)
            fiscal_nome, fiscal_info = get_responsaveis(ext_id)
            coords = get_coordinates(ext_id)

            # Extrair dados da contratada com Enriquecimento
            contrato_data = w.get('contrato', {})
            empresa_cnpj = str(w.get('documentoContratada') or contrato_data.get('cpfCnpjContratado') or 'N/A')
            # O TCE às vezes não envia o nome no objeto contrato, mas envia no root ou precisamos enriquecer
            empresa_nome = smart_clean(w.get('nomeContratada') or contrato_data.get('nomeContratado', ''))
            
            if not empresa_nome or empresa_nome == 'EMPRESA NAO INFORMADA' or empresa_nome == '' or empresa_nome == 'N/A':
                if empresa_cnpj != 'N/A' and len(empresa_cnpj) > 10:
                    print(f"      🏢 Enriching company name for CNPJ: {empresa_cnpj}...", end="", flush=True)
                    empresa_nome = get_company_name(empresa_cnpj, company_cache)
                    if empresa_nome:
                        print(f" Found: {empresa_nome[:30]}", flush=True)
                    else:
                        empresa_nome = 'EMPRESA NÃO INFORMADA'
                        print(" Not found.", flush=True)
                else:
                    empresa_nome = 'EMPRESA NÃO INFORMADA'

            if not coords:
                # [Lógica de Geocodificação mantida...]
                if cep and cep != "0" and rua and rua != "N/A":
                    cep_address = f"{rua}, {cep}, Brazil"
                    coords = geo_cache.get(cep_address) or get_coords_from_address(cep_address, geo_cache)
                if not coords and rua and rua != "N/A":
                    full_address = f"{rua}, {bairro}, Porto Alegre"
                    coords = geo_cache.get(full_address) or get_coords_from_address(full_address, geo_cache)
                if not coords:
                    fallback_address = f"{bairro}, Porto Alegre"
                    coords = geo_cache.get(fallback_address) or get_coords_from_address(fallback_address, geo_cache)
                    if coords:
                        import random
                        coords = (coords[0] + random.uniform(-0.001, 0.001), coords[1] + random.uniform(-0.001, 0.001))

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
            if total_processed % 10 == 0:
                conn.commit()
                log_memory()

        conn.commit() # Commit final para o ano
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
            
            # Tenta decodificar usando UTF-8 primeiro, cai para ISO-8859-1 se falhar
            try:
                content = response.content.decode('utf-8')
            except UnicodeDecodeError:
                content = response.content.decode('iso-8859-1')
            
            df = pd.read_csv(io.StringIO(content), sep=';')
            
            print(f"   📊 Processando {len(df)} registros para {year}...", flush=True)
            import hashlib

            for _, row in df.iterrows():
                try:
                    mes = int(row['mes'])
                    data_empenho = datetime(year, mes, 1)
                    
                    # Gerar um ID único baseado nos dados da despesa (Idempotência)
                    raw_id_content = f"{year}-{mes}-{row.get('orgao', 'N/A')}-{row.get('vlemp', 0)}-{row.get('desc_elemento', 'N/A')}"
                    unique_id = f"EMP-{hashlib.md5(raw_id_content.encode()).hexdigest()[:12].upper()}"
                    
                    cur.execute("""
                        INSERT INTO silver_despesas (
                            num_empenho, data_empenho, valor_empenhado, valor_liquidado, valor_pago,
                            descricao, cnpj_fornecedor, nome_fornecedor, orgao
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (num_empenho) DO UPDATE SET
                            valor_empenhado = EXCLUDED.valor_empenhado,
                            valor_liquidado = EXCLUDED.valor_liquidado,
                            valor_pago = EXCLUDED.valor_pago,
                            descricao = EXCLUDED.descricao
                    """, (
                        unique_id,
                        data_empenho,
                        float(str(row['vlemp']).replace(',', '.')),
                        float(str(row['vlliq']).replace(',', '.')),
                        float(str(row['vlpag']).replace(',', '.')),
                        row['desc_elemento'] if 'desc_elemento' in row else 'Despesa Orçamentária',
                        'N/A', # CNPJ não disponível neste dataset simplificado
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
