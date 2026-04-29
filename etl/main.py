import sys
import os
from datetime import datetime

# Garantir que o diretório raiz do projeto esteja no path para imports relativos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from etl.utils.db import get_connection, load_company_cache, load_geo_cache
from etl.silver.cleaners import smart_clean, map_sector
from etl.ingestion.tce import get_works, get_coordinates, get_responsaveis
from etl.ingestion.open_cnpj import get_company_name
from etl.ingestion.nominatim import get_coords_from_address
from etl.ingestion.cgu import sync_federal_expenses_to_map
from etl.gold.aggregators import aggregate_gold_data

def sync_tce_pipeline():
    print("--- 🚀 INICIANDO NOVO PIPELINE ETL (V4 - Modular) ---")
    
    # 1. Sincroniza Obras do TCE
    sync_tce_works()
    
    # 2. Sincroniza Convênios Federais (CGU)
    sync_federal_expenses_to_map()
    
    # 3. Agrega Camada Gold
    aggregate_gold_data()

def sync_tce_works():
    company_cache = load_company_cache()
    geo_cache = load_geo_cache()
    
    try:
        all_works = []
        seen_works = set()
        for year in [2026, 2025, 2024, 2023, 2022]:
            print(f"📡 Buscando obras de {year}...")
            works = get_works(year)
            for w in works:
                id_obra = w.get('idObra')
                if id_obra not in seen_works:
                    all_works.append(w)
                    seen_works.add(id_obra)
            
        total_works = len(all_works)
        print(f"📦 Total de obras únicas: {total_works}")
        
        insert_query = """
            INSERT INTO public_expenses (
                reference_date, agency, company_name, category, sector, 
                district, latitude, longitude, contract_value, bidding_count,
                beneficiary_id, process_number, description_detailed, portal_link,
                address, fiscal_name, fiscal_info, technical_family, technical_subfamily
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (process_number, company_name, description_detailed) 
            DO UPDATE SET 
                contract_value = EXCLUDED.contract_value,
                fiscal_name = EXCLUDED.fiscal_name,
                fiscal_info = EXCLUDED.fiscal_info,
                technical_family = EXCLUDED.technical_family,
                technical_subfamily = EXCLUDED.technical_subfamily
        """

        geocoded_count = 0
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Opcional: cur.execute("TRUNCATE TABLE public_expenses RESTART IDENTITY")
                for i, work in enumerate(all_works):
                    id_obra = work.get('idObra')
                    loc = work.get('localizacao', {})
                    bairro = smart_clean(loc.get('bairro', 'PORTO ALEGRE'))
                    rua = smart_clean(loc.get('logradouro', 'N/A'))
                    full_address = f"{rua}, {bairro}" if rua != "N/A" else bairro
                    
                    cnpj_raw = str(work.get('documentoContratada', ''))
                    nome_empresa = get_company_name(cnpj_raw, company_cache)
                    
                    # Geolocalização
                    coords = get_coordinates(id_obra)
                    if not coords:
                        coords = geo_cache.get(full_address) or get_coords_from_address(full_address, geo_cache)

                    if coords: geocoded_count += 1
                    lat, lng = coords if coords else (None, None)
                    
                    # Fiscalização
                    fiscal_nome, fiscal_info = get_responsaveis(id_obra)
                    
                    # Categorização
                    familias = work.get('nomesFamilias', [])
                    tech_family = smart_clean(familias[0]) if familias else "N/A"
                    tech_subfamily = smart_clean(work.get('nomesSubfamilias', [])[0]) if work.get('nomesSubfamilias') else "N/A"
                    setor = map_sector(familias)

                    valor = float(work.get('valorGarantiaObra', 0)) * 20
                    num_proc = f"{work.get('contrato', {}).get('numeroContrato', 'S/N')}/{work.get('contrato', {}).get('anoContrato', '')}"
                    ano = int(work.get('contrato', {}).get('anoContrato', 2024)) if work.get('contrato', {}).get('anoContrato') else 2024

                    cur.execute(insert_query, (
                        datetime(ano, 1, 1),
                        "PREFEITURA MUNICIPAL DE PORTO ALEGRE",
                        nome_empresa, 
                        tech_family, 
                        setor,
                        bairro,
                        lat, lng,
                        valor, 1, cnpj_raw, num_proc,
                        smart_clean(work.get('descricaoObjeto', 'OBRA PUBLICA')),
                        f"https://compras.tce.rs.gov.br/publico/obras/{id_obra}",
                        full_address, fiscal_nome, fiscal_info, tech_family, tech_subfamily
                    ))

                    if i % 50 == 0:
                        print(f"📑 Progresso: {i}/{total_works}")
                        conn.commit()
                
            conn.commit()

        print(f"--- ✨ SYNC FINALIZADO! Total: {total_works} | Com Mapa: {geocoded_count} ---")
        
        # Chama a agregação Gold ao final do pipeline
        aggregate_gold_data()

    except Exception as e:
        print(f"❌ Erro crítico no ETL: {e}")

if __name__ == "__main__":
    sync_tce_pipeline()
