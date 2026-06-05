import requests
import json
import os
import time
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
OUTPUT_PATH = "web/public/data/bairros_poa.geojson"

def get_neighborhoods_from_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT bairro FROM gold_gastos_por_bairro WHERE bairro IS NOT NULL")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [r[0] for r in rows]
    except Exception as e:
        print(f"❌ Erro ao ler banco: {e}")
        return ["CENTRO HISTORICO", "CIDADE BAIXA", "MENINO DEUS", "PETROPOLIS", "MOINHOS DE VENTO"]

def fetch_boundary(bairro):
    url = "https://nominatim.openstreetmap.org/search"
    # Adicionando "Bairro" e "Porto Alegre" para ser mais específico
    params = {
        "q": f"{bairro}, Porto Alegre, RS, Brazil",
        "format": "json",
        "limit": 1,
        "polygon_geojson": 1
    }
    headers = {"User-Agent": "POA-Transparente-V2/1.1 (Estudo Academico)"}
    
    try:
        print(f"🔍 Buscando {bairro}...")
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data and "geojson" in data[0]:
                return {
                    "type": "Feature",
                    "properties": {
                        "name": bairro,
                        "health_score": 50,
                        "security_score": 50
                    },
                    "geometry": data[0]["geojson"]
                }
        else:
            print(f"⚠️ Erro HTTP {response.status_code} para {bairro}")
    except Exception as e:
        print(f"❌ Erro na busca de {bairro}: {e}")
    return None

def main():
    bairros = get_neighborhoods_from_db()
    print(f"🚀 Iniciando coleta de {len(bairros)} bairros...")
    
    features = []
    for i, bairro in enumerate(bairros):
        feature = fetch_boundary(bairro)
        if feature:
            feature['id'] = i # Adiciona ID para setFeatureState
            features.append(feature)
        else:
            print(f"⚠️ Não foi possível encontrar a fronteira de {bairro}")
        # Nominatim pede 1 segundo entre requisições
        time.sleep(1.2)
        
    if features:
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False)
        print(f"✅ Arquivo {OUTPUT_PATH} gerado com {len(features)} bairros reais.")
    else:
        print("❌ Nenhum bairro encontrado.")

if __name__ == "__main__":
    main()
