import os
import time
import requests
import psycopg2
import unicodedata
import re
import random
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

# Bairros base caso a obra não tenha coordenada cadastrada
GEO_REFERENCE = {
    "CENTRO HISTORICO": (-30.0330, -51.2210),
    "PRAIA DE BELAS": (-30.0500, -51.2250),
    "FLORESTA": (-30.0210, -51.2090),
    "AZENHA": (-30.0480, -51.2150),
    "PARTENON": (-30.0550, -51.1801),
    "PASSO D AREIA": (-30.0125, -51.1622),
}

def smart_clean(text):
    if text is None: return "N/A"
    text = str(text)
    nfkd_form = unicodedata.normalize('NFKD', text)
    text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    text = re.sub(r'[^\x20-\x7E]', '', text)
    return text.upper().strip()

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
    # Pagination: The API uses page=0,1,2... We'll fetch the first page with size=100 for simplicity in this demo.
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras?municipio={MUNICIPIO_CODE}&exercicio={year}&page=0&size=100"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"}
    
    print(f"Buscando obras de {year} na API do TCE-RS...")
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        # The API returns an envelope with 'content' as the array of works
        return data.get('content', [])
    print(f"Erro ao buscar obras de {year}: HTTP {response.status_code}")
    return []

def get_coordinates(id_obra):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras/{id_obra}/coordenadas"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"}
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            coords = response.json()
            if isinstance(coords, list) and len(coords) > 0:
                return float(coords[0].get('latitude')), float(coords[0].get('longitude'))
    except Exception as e:
        pass
    return None

def sync_tce_obras():
    print("--- INICIANDO SYNC DE OBRAS TCE-RS (ALTA FIDELIDADE) ---")
    try:
        all_works = []
        for year in [2023, 2024]:
            works = get_works(year)
            all_works.extend(works)
            time.sleep(1) # Respeitando o rate limit da API
            
        print(f"Total de {len(all_works)} obras encontradas no TCE-RS para POA (amostra inicial).")

        df_final_rows = []
        obras_com_coord = 0

        for work in all_works:
            id_obra = work.get('idObra')
            if not id_obra: continue
            
            # A API retorna o valor da garantia. Como garantia de obra pública é 
            # de 5%, multiplicamos por 20 para ter uma estimativa do valor total do contrato.
            valor_garantia = work.get('valorGarantiaObra', 0)
            valor_estimado = float(valor_garantia) * 20 if valor_garantia else 150000.0

            localizacao = work.get('localizacao', {})
            bairro = smart_clean(localizacao.get('bairro', 'PORTO ALEGRE'))
            
            familias = work.get('nomesFamilias', ['Obras Gerais'])
            familia = familias[0] if familias else 'Obras Gerais'
            setor = map_sector(familia)
            
            contrato = work.get('contrato', {})
            num_contrato = f"{contrato.get('numeroContrato', 'S/N')}/{contrato.get('anoContrato', '')}"

            # Buscando coordenadas reais
            coords = get_coordinates(id_obra)
            if coords:
                lat, lng = coords
                obras_com_coord += 1
            else:
                # Fallback para o centro do bairro se a obra não tiver coordenada cadastrada
                base_coords = GEO_REFERENCE.get(bairro, (-30.0330, -51.2210))
                lat = base_coords[0] + random.uniform(-0.005, 0.005)
                lng = base_coords[1] + random.uniform(-0.005, 0.005)

            df_final_rows.append((
                datetime(int(contrato.get('anoContrato', 2023)), 1, 1),
                "PREFEITURA MUNICIPAL DE PORTO ALEGRE",
                smart_clean(work.get('descricaoObjeto', 'OBRA PUBLICA'))[:250],
                smart_clean(familia),
                setor,
                bairro,
                lat,
                lng,
                valor_estimado,
                1,
                str(work.get('documentoContratada', 'CNPJ OCULTO')),
                num_contrato,
                smart_clean(work.get('descricaoObjeto', 'Sem descrição.')),
                f"https://tce.rs.gov.br/licitacon"
            ))

            # Pequeno delay para não sobrecarregar a API do TCE ao buscar coordenadas
            time.sleep(0.5)

        print(f"Mineracao concluida. {obras_com_coord} obras possuem coordenadas de GPS exatas cadastradas no TCE!")

        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Inserindo obras no banco de dados geoespacial...")
                cur.execute("TRUNCATE TABLE public_expenses RESTART IDENTITY")
                insert_query = """
                    INSERT INTO public_expenses (
                        reference_date, agency, company_name, category, sector, 
                        district, latitude, longitude, contract_value, bidding_count,
                        beneficiary_id, process_number, description_detailed, portal_link
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cur.executemany(insert_query, df_final_rows)
            conn.commit()

        print("--- SYNC TCE-RS CONCLUIDO COM SUCESSO! ---")

    except Exception as e:
        import traceback
        print(f"Erro fatal: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    sync_tce_obras()
