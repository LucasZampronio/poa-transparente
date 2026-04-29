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

COMPANY_NAME_CACHE = {}
GEO_CACHE = {}

def load_caches():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT beneficiary_id, company_name FROM public_expenses WHERE company_name IS NOT NULL")
        for row in cur.fetchall():
            COMPANY_NAME_CACHE[row[0]] = row[1]
            
        cur.execute("SELECT address, latitude, longitude FROM geo_cache")
        for row in cur.fetchall():
            GEO_CACHE[row[0]] = (float(row[1]), float(row[2]))
            
        cur.close()
        conn.close()
        print(f"Caches carregados: {len(COMPANY_NAME_CACHE)} empresas, {len(GEO_CACHE)} endereços.")
    except: pass

def save_company_to_cache(cnpj, name):
    pass # No need for manual file save, we pull from DB

def save_geo_to_cache(address, lat, lng):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO geo_cache (address, latitude, longitude) VALUES (%s, %s, %s) ON CONFLICT (address) DO NOTHING",
            (address, lat, lng)
        )
        conn.commit()
        cur.close()
        conn.close()
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
                return name_upper
    except: pass
    return f"EMPRESA (CNPJ: {cnpj_clean})"

def map_sector(families):
    if not families: return 'URBANISMO'
    f = " ".join(families).upper()
    if 'SANEAMENTO' in f or 'AGUA' in f or 'ESGOTO' in f: return 'SANEAMENTO'
    if 'PAVIMENTACAO' in f or 'URBANIZACAO' in f or 'PRACAS' in f: return 'URBANISMO'
    if 'EDIFICACOES' in f: return 'ADMINISTRACAO'
    if 'ILUMINACAO' in f or 'ENERGIA' in f: return 'URBANISMO'
    if 'EDUCACAO' in f or 'ESCOLA' in f: return 'EDUCACAO'
    if 'SAUDE' in f or 'HOSPITAL' in f: return 'SAUDE'
    if 'HABITACAO' in f: return 'HABITACAO'
    if 'CULTURA' in f: return 'CULTURA'
    if 'TRANSPORTE' in f or 'MOBILIDADE' in f: return 'TRANSPORTE'
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
                time.sleep(0.1)
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

def get_responsaveis(id_obra):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras/{id_obra}/responsaveis"
    try:
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            responsaveis = data.get('content', [])
            for r in responsaveis:
                papel = smart_clean(r.get('papelProjeto', ''))
                if 'FISCALIZACAO' in papel:
                    nome = r.get('nomeResponsavelTecnico')
                    setor = r.get('setor', 'N/A')
                    vinculo = r.get('vinculo', 'N/A')
                    return nome, f"Setor: {setor} | Vinculo: {vinculo}"
    except: pass
    return None, None

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
    except: pass
    return None

def sync_tce_obras():
    print("--- 🚀 INICIANDO SYNC CARGA TOTAL V3 (Fiscalização & Categorias) ---")
    load_caches()
    
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
        
        # Limpa para garantir refresh total (opcional, mas bom para debug agora)
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE public_expenses RESTART IDENTITY")
            conn.commit()

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
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                for i, work in enumerate(all_works):
                    id_obra = work.get('idObra')
                    loc = work.get('localizacao', {})
                    bairro = smart_clean(loc.get('bairro', 'PORTO ALEGRE'))
                    rua = smart_clean(loc.get('logradouro', 'N/A'))
                    full_address = f"{rua}, {bairro}" if rua != "N/A" else bairro
                    
                    cnpj_raw = str(work.get('documentoContratada', ''))
                    nome_empresa = get_company_name(cnpj_raw)
                    
                    # Geolocalização
                    coords = get_coordinates(id_obra)
                    log_geo = "TCE-RS"
                    if not coords:
                        coords = GEO_CACHE.get(full_address) or get_coords_from_address(full_address)
                        log_geo = "NOMINATIM/CACHE" if coords else "NULO"

                    if coords: geocoded_count += 1
                    lat, lng = coords if coords else (None, None)
                    
                    # Fiscalização
                    fiscal_nome, fiscal_info = get_responsaveis(id_obra)
                    
                    # Categorização Técnica
                    familias = work.get('nomesFamilias', [])
                    subfamilias = work.get('nomesSubfamilias', [])
                    tech_family = smart_clean(familias[0]) if familias else "N/A"
                    tech_subfamily = smart_clean(subfamilias[0]) if subfamilias else "N/A"
                    setor = map_sector(familias)

                    valor = float(work.get('valorGarantiaObra', 0)) * 20
                    num_proc = f"{work.get('contrato', {}).get('numeroContrato', 'S/N')}/{work.get('contrato', {}).get('anoContrato', '')}"
                    ano = int(work.get('contrato', {}).get('anoContrato', 2024)) if work.get('contrato', {}).get('anoContrato') else 2024

                    cur.execute(insert_query, (
                        datetime(ano, 1, 1),
                        "PREFEITURA MUNICIPAL DE PORTO ALEGRE",
                        nome_empresa, 
                        tech_family, # Agora usamos a família real como categoria
                        setor,       # O setor do mapa (URBANISMO, SAUDE, etc)
                        bairro,
                        lat, lng,
                        valor, 1, cnpj_raw, num_proc,
                        smart_clean(work.get('descricaoObjeto', 'OBRA PUBLICA')),
                        f"https://compras.tce.rs.gov.br/publico/obras/{id_obra}",
                        full_address, fiscal_nome, fiscal_info, tech_family, tech_subfamily
                    ))

                    if i % 20 == 0:
                        print(f"📑 Progresso: {i}/{total_works} | Geo: {log_geo} | Fiscal: {fiscal_nome[:15] if fiscal_nome else 'N/A'}")
                        conn.commit()
                
            conn.commit()

        print(f"--- ✨ SYNC FINALIZADO! Total: {total_works} | Com Mapa: {geocoded_count} ---")
    except Exception as e:
        print(f"❌ Erro crítico no ETL: {e}")

if __name__ == "__main__":
    sync_tce_obras()
