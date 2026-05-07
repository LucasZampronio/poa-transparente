import sys
import os

# Garantir que o diretório raiz do projeto esteja no path para imports relativos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from etl.sync_evolution import sync_silver_obras, sync_silver_despesas
from etl.gold.aggregators import aggregate_gold_data

def sync_pipeline():
    print("--- 🚀 INICIANDO PIPELINE ETL MEDALLION ---")
    
    # 1. Sincroniza Obras do TCE (Silver)
    sync_silver_obras()
    
    # 2. Sincroniza Despesas (Silver)
    sync_silver_despesas()
    
    # 3. Agrega Camada Gold
    aggregate_gold_data()
    
    print("--- ✨ PIPELINE FINALIZADO COM SUCESSO! ---")

if __name__ == "__main__":
    sync_pipeline()
