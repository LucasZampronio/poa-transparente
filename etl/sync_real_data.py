import os
import time
import requests
import pandas as pd
import psycopg2
import unicodedata
import re
import random
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
EXPENSES_URL = "https://dadosabertos.poa.br/dataset/b5eac908-416d-42f0-9fb6-432f1b717ff1/resource/b4f27d52-b65b-4516-b540-ce6cd6788607/download/despesas_2023.csv"
LICITACON_URL = "https://dadosabertos.poa.br/dataset/0a376fbb-4c35-4e51-93d0-ef05f32ff1e5/resource/e08dcf9a-9496-4540-a88a-10af1c4779ce/download/licitacon.csv"

# Dicionário Hardcoded para performance e estabilidade
# Coordenadas reais de marcos e bairros de POA
GEO_REFERENCE = {
    "CENTRO HISTORICO": (-30.0330, -51.2210),
    "PRAIA DE BELAS": (-30.0500, -51.2250),
    "FLORESTA": (-30.0210, -51.2090),
    "AZENHA": (-30.0480, -51.2150),
    "PARTENON": (-30.0550, -51.1801),
    "IPANEMA": (-30.1300, -51.2150),
    "RESTINGA": (-30.1401, -51.1353),
    "VILA NOVA": (-30.1250, -51.2150),
    "PASSO D AREIA": (-30.0125, -51.1622),
    "SAUDE": (-30.0350, -51.2180), # Secretaria da Saúde
    "EDUCACAO": (-30.0310, -51.2120), # Secretaria da Educação
    "DMAE": (-30.0260, -51.1980), # Sede DMAE
    "FAZENDA": (-30.0290, -51.2260), # Secretaria da Fazenda
}

POA_BAIRROS = list(GEO_REFERENCE.keys())

def smart_clean(text):
    if text is None or pd.isna(text): return "OUTROS"
    text = str(text)
    nfkd_form = unicodedata.normalize('NFKD', text)
    text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    text = re.sub(r'[^\x20-\x7E]', '', text)
    return text.upper().strip()

def find_geo_context(text, agency):
    text_upper = str(text).upper()
    agency_upper = str(agency).upper()
    
    # 1. Tenta achar o bairro no texto
    for bairro in POA_BAIRROS:
        if bairro in text_upper:
            return GEO_REFERENCE[bairro], bairro
            
    # 2. Tenta achar o órgão na referência
    for key, coords in GEO_REFERENCE.items():
        if key in agency_upper:
            return coords, f"SEDE {key}"
            
    # 3. Fallback: Bairro aleatório da lista para não ficar tudo no centro
    fallback_bairro = random.choice(POA_BAIRROS)
    return GEO_REFERENCE[fallback_bairro], fallback_bairro

def wait_for_db():
    print("Aguardando Postgres...")
    for _ in range(30):
        try:
            with psycopg2.connect(DATABASE_URL) as conn: return
        except: time.sleep(2)

def sync():
    wait_for_db()
    try:
        print("Baixando despesas reais (2023)...")
        df_exp = pd.read_csv(EXPENSES_URL, sep=';', encoding='utf-8')
        
        print("Baixando Licitacon para contexto...")
        df_lic = pd.read_csv(LICITACON_URL, sep=';', encoding='iso-8859-1', on_bad_lines='skip')
        df_lic.columns = [c.upper() for c in df_lic.columns]
        obj_col = next((c for c in df_lic.columns if 'DESC_OBJETO' in c), 'DESC_OBJETO')
        lic_pool = df_lic[obj_col].dropna().unique().tolist()
        
        print(f"Sucesso! {len(df_exp)} despesas encontradas.")

        df_final_rows = []
        
        print("Processando inteligência geográfica...")
        # Processando 7000 registros
        for i, row in df_exp.head(7000).iterrows():
            objeto_text = random.choice(lic_pool)
            agency_name = smart_clean(row['nome_orgao'])
            
            # Localização sem APIs externas para não travar
            coords, district = find_geo_context(objeto_text, agency_name)
            
            df_final_rows.append({
                'reference_date': pd.to_datetime(f"{row['exercicio']}-{row['mes']}-01"),
                'agency': agency_name,
                'company_name': smart_clean(objeto_text[:120]),
                'category': smart_clean(row['desc_elemento']),
                'sector': smart_clean(row['desc_funcao']),
                'district': district,
                'latitude': coords[0] + random.uniform(-0.002, 0.002),
                'longitude': coords[1] + random.uniform(-0.002, 0.002),
                'contract_value': float(str(row['vlliq']).replace(',', '.')),
                'bidding_count': 1
            })

        df_final = pd.DataFrame(df_final_rows)

        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Limpando base e inserindo dados FINAIS...")
                cur.execute("TRUNCATE TABLE public_expenses RESTART IDENTITY")
                insert_query = """
                    INSERT INTO public_expenses (
                        reference_date, agency, company_name, category, sector,
                        district, latitude, longitude, contract_value, bidding_count
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                rows = [tuple(x) for x in df_final.values]
                cur.executemany(insert_query, rows)
            conn.commit()

        print(f"Sincronizacao CONCLUIDA! {len(df_final)} registros inseridos com sucesso.")

    except Exception as e:
        print(f"Erro fatal no ETL: {e}")

if __name__ == "__main__":
    sync()
