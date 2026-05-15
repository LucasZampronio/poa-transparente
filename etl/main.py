import sys
import os

# Garantir que o diretório raiz do projeto esteja no path para imports relativos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from etl.sync_evolution import sync_silver_obras, sync_silver_despesas
from etl.gold.aggregators import aggregate_gold_data

def sync_pipeline():
    print("--- 🚀 INICIANDO PIPELINE ETL MEDALLION ---")
    
    try:
        # 1. Sincroniza Obras do TCE (Silver)
        print("\n[STEP 1/3] Sincronizando Obras (TCE-RS)...")
        sync_silver_obras()
        
        # 2. Sincroniza Despesas (Silver)
        print("\n[STEP 2/3] Sincronizando Despesas (Dados Abertos POA)...")
        sync_silver_despesas()
        
        # 3. Agrega Camada Gold
        print("\n[STEP 3/3] Agregando Camada Gold...")
        aggregate_gold_data()
        
        print("\n--- ✨ PIPELINE FINALIZADO COM SUCESSO! ---")
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR no Pipeline ETL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    sync_pipeline()
