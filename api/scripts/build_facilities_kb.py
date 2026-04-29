import os
import pandas as pd
import psycopg2
import sys
import time
import requests

# Adiciona o diretório raiz ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from etl.ingestion.nominatim import get_coords_from_address
from etl.utils.db import load_geo_cache

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
SCHOOLS_CSV_URL = "https://dadosabertos.poa.br/dataset/5d204437-8335-43d5-8df3-102a35fc97fb/resource/5579bc8e-1e47-47ef-a06e-9f08da28dec8/download/cadastro_escolas.csv"

def build_kb():
    print("📥 Baixando cadastro oficial de escolas de Porto Alegre...")
    try:
        response = requests.get(SCHOOLS_CSV_URL)
        with open("schools_poa.csv", "wb") as f:
            f.write(response.content)
        
        # Tenta ler o CSV de forma resiliente
        try:
            df = pd.read_csv("schools_poa.csv", sep=";", encoding="utf-8", on_bad_lines='skip')
        except:
            df = pd.read_csv("schools_poa.csv", sep=";", encoding="latin1", on_bad_lines='skip')
        
        print(f"📊 {len(df)} escolas carregadas.")

        geo_cache = load_geo_cache()
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        success_count = 0
        # Processa um lote maior
        for _, row in df.head(150).iterrows():
            nome = str(row.get('nome', '')).strip().upper()
            if not nome or len(nome) < 3: continue
                
            logradouro = str(row.get('logradouro', '')).strip()
            bairro = str(row.get('bairro', '')).strip()
            
            endereco_completo = f"{logradouro}, {bairro}"
            
            print(f"🔍 Processando: {nome}...")
            # Tenta encontrar as coordenadas via Nominatim (com cache)
            coords = get_coords_from_address(f"{nome}, Porto Alegre", geo_cache)
            if not coords:
                coords = get_coords_from_address(f"{logradouro}, {bairro}, Porto Alegre", geo_cache)
            
            if coords:
                lat, lng = coords
                cur.execute("""
                    INSERT INTO public_facilities (name, type, address, latitude, longitude)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        address = EXCLUDED.address
                """, (nome, 'EDUCACAO', endereco_completo, lat, lng))
                success_count += 1
                time.sleep(0.5) # Educado
            else:
                print(f"⚠️ Falha: {nome}")

        conn.commit()
        cur.close()
        conn.close()
        print(f"✅ KB atualizada! {success_count} locais inseridos.")

    except Exception as e:
        print(f"❌ Erro ao construir KB: {e}")

if __name__ == "__main__":
    build_kb()
