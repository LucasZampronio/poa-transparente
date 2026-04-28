import os
import time
import requests
import psycopg2
import unicodedata
import re
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

# Caches globais
COMPANY_NAME_CACHE = {}
GEO_CACHE = {}

def load_caches():
    """Carrega caches do banco de dados"""
    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Cache de Empresas
                cur.execute("SELECT cnpj, name FROM company_cache")
                for row in cur.fetchall():
                    COMPANY_NAME_CACHE[row[0]] = row[1]
                
                # Cache de Geolocalizacao
                cur.execute("SELECT address, latitude, longitude FROM geo_cache")
                for row in cur.fetchall():
                    GEO_CACHE[row[0]] = (float(row[1]), float(row[2]))
                    
        print(f"Caches carregados: {len(COMPANY_NAME_CACHE)} empresas, {len(GEO_CACHE)} endereços.")
    except Exception as e:
        print(f"Erro ao carregar caches: {e}")

def save_company_to_cache(cnpj, name):
    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO company_cache (cnpj, name) VALUES (%s, %s) ON CONFLICT (cnpj) DO NOTHING",
                    (cnpj, name)
                )
            conn.commit()
    except: pass

def save_geo_to_cache(address, lat, lng):
    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO geo_cache (address, latitude, longitude) VALUES (%s, %s, %s) ON CONFLICT (address) DO NOTHING",
                    (address, lat, lng)
                )
            conn.commit()
        GEO_CACHE[address] = (lat, lng)
    except: pass

def smart_clean(text):
    if text is None: return "N/A"
    text = str(text)
    nfkd_form = unicodedata.normalize('NFKD', text)
    text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    text = re.sub(r'[^\x20-\x7E]', '', text)
    return text.upper().strip()

def get_company_name(cnpj):
    cnpj_clean = re.sub(r'\D', '', str(cnpj))
    if not cnpj_clean or len(cnpj_clean) != 14: return f"CNPJ: {cnpj}"
    if cnpj_clean in COMPANY_NAME_CACHE: return COMPANY_NAME_CACHE[cnpj_clean]
    if cnpj_clean == "92963560000160": return "PREFEITURA MUNICIPAL DE PORTO ALEGRE"

    try:
        response = requests.get(f"https://api.opencnpj.org/{cnpj_clean}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            name = data.get('razao_social')
            if name:
                name_upper = name.upper()
                COMPANY_NAME_CACHE[cnpj_clean] = name_upper
                save_company_to_cache(cnpj_clean, name_upper)
                return name_upper
    except: pass
    return f"EMPRESA (CNPJ: {cnpj_clean})"

def map_sector(familia):
    f = smart_clean(familia).upper()
    if 'SANEAMENTO' in f or 'AGUA' in f or 'ESGOTO' in f: return 'SANEAMENTO'
    if 'PAVIMENTACAO' in f or 'URBANIZACAO' in f or 'PRACAS' in f: return 'URBANISMO'
    if 'EDIFICACOES' in f: return 'ADMINISTRACAO'
    if 'ILUMINACAO' in f or 'ENERGIA' in f: return 'URBANISMO'
    if 'EDUCACAO' in f or 'ESCOLA' in f: return 'EDUCACAO'
    if 'SAUDE' in f or 'HOSPITAL' in f: return 'SAUDE'
    return 'URBANISMO'

def get_works(year):
    all_content = []
    page = 0
    size = 100
    while True:
        url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras?municipio={MUNICIPIO_CODE}&exercicio={year}&page={page}&size={size}"
        try:
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=20)
            if response.status_code == 200:
                data = response.json()
                content = data.get('content', [])
                if not content: break
                all_content.extend(content)
                if len(content) < size: break
                page += 1
                time.sleep(0.2)
            else: break
        except: break
    return all_content

def get_coordinates(id_obra):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras/{id_obra}/coordenadas"
    try:
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if response.status_code == 200:
            coords = response.json()
            if isinstance(coords, list) and len(coords) > 0:
                return float(coords[0].get('latitude')), float(coords[0].get('longitude'))
    except: pass
    return None

def get_coords_from_address(address):
    if address in GEO_CACHE: return GEO_CACHE[address]
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": f"{address}, Porto Alegre, RS, Brazil", "format": "json", "limit": 1}
    headers = {"User-Agent": "POA-Transparente-V2/1.1"}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data:
                lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
                save_geo_to_cache(address, lat, lng)
                return lat, lng
        elif response.status_code == 429:
            print("Nominatim Rate Limit Hit! Esperando 5 segundos...")
            time.sleep(5)
    except: pass
    return None

def sync_tce_obras():
    print("--- INICIANDO SYNC CARGA TOTAL V2 ---")
    load_caches()
    
    try:
        all_works = []
        # Processa anos recentes primeiro para alimentar a UI
        for year in [2026, 2025, 2024, 2023, 2022]:
            works = get_works(year)
            all_works.extend(works)
            
        total_works = len(all_works)
        print(f"Enriquecendo {total_works} obras...")

        # Limpa o banco no inicio
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE public_expenses RESTART IDENTITY")
            conn.commit()

        insert_query = """
            INSERT INTO public_expenses (
                reference_date, agency, company_name, category, sector, 
                district, latitude, longitude, contract_value, bidding_count,
                beneficiary_id, process_number, description_detailed, portal_link,
                address
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        batch = []
        for i, work in enumerate(all_works):
            id_obra = work.get('idObra')
            localizacao = work.get('localizacao', {})
            bairro = smart_clean(localizacao.get('bairro', 'PORTO ALEGRE'))
            rua = smart_clean(localizacao.get('logradouro', 'N/A'))
            full_address = f"{rua}, {bairro}" if rua != "N/A" else bairro
            
            cnpj_raw = str(work.get('documentoContratada', ''))
            nome_empresa = get_company_name(cnpj_raw)
            descricao_objeto = smart_clean(work.get('descricaoObjeto', 'OBRA PUBLICA'))
            
            coords = get_coordinates(id_obra)
            if not coords and full_address != "PORTO ALEGRE":
                coords = get_coords_from_address(full_address)
                # Se foi cache, nao precisa de sleep longo. Se foi API, dorme mais.
                if full_address not in GEO_CACHE:
                    time.sleep(1.2) 

            lat, lng = coords if coords else (None, None)
            valor = float(work.get('valorGarantiaObra', 0)) * 20
            
            familias = work.get('nomesFamilias', [])
            familia = familias[0] if familias else 'Obras Gerais'
            num_proc = f"{work.get('contrato', {}).get('numeroContrato', 'S/N')}/{work.get('contrato', {}).get('anoContrato', '')}"

            batch.append((
                datetime(int(work.get('contrato', {}).get('anoContrato', 2024)) if work.get('contrato', {}).get('anoContrato') else 2024, 1, 1),
                "PREFEITURA MUNICIPAL DE PORTO ALEGRE",
                nome_empresa, 
                smart_clean(familia),
                map_sector(familia),
                bairro,
                lat,
                lng,
                valor,
                1,
                cnpj_raw,
                num_proc,
                descricao_objeto,
                f"https://compras.tce.rs.gov.br/publico/obras/{id_obra}",
                full_address
            ))

            if len(batch) >= 10:
                with psycopg2.connect(DATABASE_URL) as conn:
                    with conn.cursor() as cur:
                        cur.executemany(insert_query, batch)
                    conn.commit()
                print(f"Progresso: {i + 1}/{total_works} obras inseridas.")
                batch = []

        if batch:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.executemany(insert_query, batch)
                conn.commit()

        print(f"--- SYNC V2 FINALIZADO COM SUCESSO! ---")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    sync_tce_obras()
