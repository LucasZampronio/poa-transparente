import requests
import json
import os

# Endpoint oficial da Prefeitura de Porto Alegre (ArcGIS)
GEO_ENDPOINT = "https://geopoa.portoalegre.rs.gov.br/arcgis/rest/services/A02_SOLO_CRIADO/bairros/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson"
OUTPUT_PATH = "web/public/data/bairros_poa.geojson"

def fetch_neighborhoods():
    print(f"📡 Buscando fronteiras dos bairros em {GEO_ENDPOINT}...")
    try:
        response = requests.get(GEO_ENDPOINT, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Processamento e Normalização
        new_features = []
        for feature in data.get('features', []):
            properties = feature.get('properties', {})
            # O nome do bairro costuma vir em campos como 'NOME' ou 'nome'
            nome_original = properties.get('NOME') or properties.get('nome') or "DESCONHECIDO"
            
            # Normalização básica para placeholder de scores (o frontend espera health_score e security_score)
            # Em uma fase futura, poderíamos cruzar com dados reais do banco
            feature['properties'] = {
                "name": nome_original.upper(),
                "health_score": 50, # Placeholder
                "security_score": 50 # Placeholder
            }
            new_features.append(feature)
            
        data['features'] = new_features
        
        # Garantir diretório
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
            
        print(f"✅ Arquivo {OUTPUT_PATH} atualizado com {len(new_features)} bairros.")
        
    except Exception as e:
        print(f"❌ Erro ao buscar bairros: {e}")

if __name__ == "__main__":
    fetch_neighborhoods()
