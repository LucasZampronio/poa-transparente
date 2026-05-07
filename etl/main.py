import sys
import os

# No Docker, os arquivos do diretório /etl são copiados para /app.
# Portanto, os módulos estão na raiz do PYTHONPATH.
from sync_evolution import sync_silver_obras, sync_silver_despesas
from gold.aggregators import aggregate_gold_data

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
