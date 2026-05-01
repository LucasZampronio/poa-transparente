import os
import psycopg2
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def audit():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("--- CONTAGEM DE REGISTROS POR CAMADA ---")
        
        # Bronze
        cur.execute("SELECT COUNT(*) FROM portal_transparencia_raw_records")
        print(f"Bronze (Raw Records): {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM portal_beneficios_municipio")
        print(f"Bronze (Beneficios): {cur.fetchone()[0]}")
        
        # Silver
        cur.execute("SELECT COUNT(*) FROM silver_obras")
        print(f"Silver (Obras): {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM silver_despesas")
        print(f"Silver (Despesas): {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM silver_fornecedores")
        print(f"Silver (Fornecedores): {cur.fetchone()[0]}")
        
        # Matching
        cur.execute("SELECT COUNT(*) FROM obra_despesa_match")
        print(f"Matching (Matches): {cur.fetchone()[0]}")
        
        # Gold
        cur.execute("SELECT COUNT(*) FROM gold_obras_com_gastos")
        print(f"Gold (Obras com Gastos): {cur.fetchone()[0]}")
        cur.execute("SELECT COUNT(*) FROM gold_series_temporais")
        print(f"Gold (Serie Temporal): {cur.fetchone()[0]}")
        
        print("\n--- VERIFICAÇÃO DE DADOS FUTUROS (2026+) ---")
        cur.execute("SELECT data FROM gold_series_temporais WHERE data >= '2026-01-01'")
        future_gold = cur.fetchall()
        print(f"Datas >= 2026 em Gold Series: {future_gold}")
        
        cur.execute("SELECT data_empenho FROM silver_despesas WHERE data_empenho >= '2026-01-01'")
        future_silver = cur.fetchall()
        print(f"Datas >= 2026 em Silver Despesas: {len(future_silver)} registros")

        print("\n--- CONSISTÊNCIA CAMADA GOLD ---")
        # Nulos em colunas críticas
        cur.execute("SELECT COUNT(*) FROM gold_obras_com_gastos WHERE valor_licitado IS NULL OR valor_total_gasto IS NULL")
        null_vals = cur.fetchone()[0]
        print(f"Obras Gold com valores nulos: {null_vals}")
        
        # Obras sem geolocalização na Gold (via join com Silver)
        cur.execute("""
            SELECT COUNT(*) 
            FROM gold_obras_com_gastos g
            JOIN silver_obras s ON g.obra_id = s.id
            WHERE s.latitude IS NULL OR s.longitude IS NULL
        """)
        no_geo = cur.fetchone()[0]
        print(f"Obras Gold sem geolocalização: {no_geo}")

        print("\n--- AUDITORIA DE LEGACY (public_expenses) ---")
        cur.execute("SELECT COUNT(*) FROM public_expenses")
        legacy_count = cur.fetchone()[0]
        cur.execute("SELECT MAX(created_at) FROM public_expenses")
        legacy_last_update = cur.fetchone()[0]
        
        cur.execute("SELECT MAX(created_at) FROM silver_despesas")
        silver_last_update = cur.fetchone()[0]
        
        print(f"Registros em public_expenses: {legacy_count}")
        print(f"Última atualização legacy: {legacy_last_update}")
        print(f"Última atualização silver: {silver_last_update}")

        print("\n--- VERIFICAÇÃO DE DUPLICATAS EM SILVER_OBRAS ---")
        cur.execute("""
            SELECT external_id, COUNT(*) 
            FROM silver_obras 
            GROUP BY external_id 
            HAVING COUNT(*) > 1
        """)
        dups = cur.fetchall()
        print(f"Duplicatas por external_id em silver_obras: {len(dups)}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro na auditoria: {e}")

if __name__ == "__main__":
    audit()
