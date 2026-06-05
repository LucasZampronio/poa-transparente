import json
import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")
INPUT_PATH = "web/public/data/bairros_poa.geojson"
OUTPUT_PATH = "web/public/data/bairros_poa.geojson"

def get_gold_stats():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT bairro, total_gasto, quantidade_obras FROM gold_gastos_por_bairro")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {r[0]: {"total": float(r[1]), "obras": r[2]} for r in rows}
    except Exception as e:
        print(f"❌ Erro ao ler banco: {e}")
        return {}

def enrich_geojson():
    print(f"🥇 Enriquecendo {INPUT_PATH} com dados da camada Gold...")
    stats = get_gold_stats()
    
    if not os.path.exists(INPUT_PATH):
        print(f"❌ Arquivo {INPUT_PATH} não encontrado.")
        return

    with open(INPUT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    max_gasto = max([s["total"] for s in stats.values()] + [1])
    
    new_features = []
    for feature in data.get('features', []):
        name = feature['properties']['name']
        bairro_stats = stats.get(name)
        
        # Se não encontrar pelo nome exato, tentamos uma busca mais flexível (opcional)
        if not bairro_stats:
            # Tenta encontrar no dict stats ignorando acentos ou variações se necessário
            # Por agora, mantemos exato pois normalize_bairro já deve ter ajudado
            pass
            
        gasto = bairro_stats["total"] if bairro_stats else 0
        obras = bairro_stats["obras"] if bairro_stats else 0
        
        # Calcula um score de 0 a 100 baseado no gasto relativo ao máximo
        # Usamos uma escala logarítmica para melhor visualização (opcional)
        score = (gasto / max_gasto) * 100 if max_gasto > 0 else 0
        
        feature['properties']['health_score'] = min(100, score * 1.5) # Simulação de Saúde
        feature['properties']['security_score'] = min(100, score) # Simulação de Segurança
        feature['properties']['total_gasto'] = gasto
        feature['properties']['quantidade_obras'] = obras
        
        new_features.append(feature)
        
    data['features'] = new_features
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
        
    print(f"✅ Arquivo {OUTPUT_PATH} enriquecido com sucesso.")

if __name__ == "__main__":
    enrich_geojson()
