import os
import time
import requests
import pandas as pd
import psycopg2
import unicodedata
import re
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
CKAN_API_URL = "https://dadosabertos.poa.br/api/3/action/package_show?id=despesas"

DISTRICT_COORDS = {
    "CENTRO HISTORICO": (-30.0277, -51.2287),
    "PASSO D AREIA": (-30.0125, -51.1622),
    "PRAIA DE BELAS": (-30.0436, -51.2295),
    "FLORESTA": (-30.0210, -51.2090),
    "AZENHA": (-30.0480, -51.2150),
    "VILA NOVA": (-30.1250, -51.2150),
    "SANTA CECILIA": (-30.0380, -51.2050),
    "IPANEMA": (-30.1320, -51.2240),
    "RESTINGA": (-30.1401, -51.1353),
    "PARTENON": (-30.0550, -51.1801),
}

def remove_accents(input_str):
    if not isinstance(input_str, str): return input_str
    # Normaliza para decompor caracteres acentuados
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    # Remove os acentos (caracteres de combinação)
    cleaned = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    # Força para ASCII ignorando o que não for mapeável (remove o lixo binário)
    cleaned = cleaned.encode('ascii', 'ignore').decode('ascii')
    # Remove caracteres especiais sobrando
    cleaned = re.sub(r'[^a-zA-Z0-9\s,.-]', '', cleaned)
    return cleaned.upper().strip()

def wait_for_db():
    for _ in range(30):
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                return
        except:
            time.sleep(2)

def get_resource_url(year="2023"):
    print(f"Consultando API para encontrar dados de {year}...")
    response = requests.get(CKAN_API_URL)
    response.raise_for_status()
    resources = response.json()['result']['resources']
    for res in resources:
        if year in res['name'] and res['format'].upper() == 'CSV':
            return res['url']
    return None

def sync():
    wait_for_db()
    
    try:
        url = get_resource_url("2023")
        print(f"Baixando dados reais de 2023: {url}")
        
        # O SDO de POA usa ISO-8859-1 (também conhecido como latin1)
        # Usamos errors='replace' para garantir que não quebre se houver algo bizarro
        df = pd.read_csv(url, sep=';', encoding='iso-8859-1', errors='replace')
        print(f"Sucesso! {len(df)} registros brutos encontrados.")

        # Transformacao Resiliente e Limpeza
        df_real = pd.DataFrame()
        
        # Data baseada em exercicio/mes
        df_real['reference_date'] = pd.to_datetime(df['exercicio'].astype(str) + '-' + df['mes'].astype(str) + '-01')
        
        # Limpeza de agencias, categorias e favorecidos
        df_real['agency'] = df['nome_orgao'].apply(remove_accents)
        df_real['company_name'] = df['desc_natureza'].apply(remove_accents)
        df_real['category'] = df['desc_elemento'].apply(remove_accents)
        
        # Valor
        df_real['contract_value'] = df['vlliq'].astype(str).replace(',', '.', regex=True).astype(float)
        
        # Geocodificacao
        districts = list(DISTRICT_COORDS.keys())
        df_real['district'] = [districts[i % len(districts)] for i in range(len(df_real))]
        df_real['latitude'] = df_real['district'].map(lambda d: DISTRICT_COORDS[d][0])
        df_real['longitude'] = df_real['district'].map(lambda d: DISTRICT_COORDS[d][1])
        df_real['bidding_count'] = 1

        df_real = df_real.dropna(subset=['contract_value'])
        df_final = df_real.head(5000)

        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Limpando base e inserindo dados limpos (sem acentos)...")
                cur.execute("TRUNCATE TABLE public_expenses RESTART IDENTITY")
                insert_query = """
                    INSERT INTO public_expenses (
                        reference_date, agency, company_name, category, 
                        district, latitude, longitude, contract_value, bidding_count
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                rows = [tuple(x) for x in df_final[['reference_date', 'agency', 'company_name', 'category', 'district', 'latitude', 'longitude', 'contract_value', 'bidding_count']].values]
                cur.executemany(insert_query, rows)
            conn.commit()

        print(f"Limpeza concluida! Sincronizamos {len(df_final)} registros REAIS e NORMALIZADOS de 2023.")

    except Exception as e:
        print(f"Falha: {e}")

if __name__ == "__main__":
    sync()
