import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def audit_v2():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("--- AUDITORIA DETALHADA V2 ---")
        
        # 1. Datas de empenho reais
        cur.execute("SELECT DISTINCT EXTRACT(YEAR FROM data_empenho) as ano FROM silver_despesas ORDER BY ano DESC")
        anos = cur.fetchall()
        print(f"Anos presentes em silver_despesas: {[int(a[0]) for a in anos if a[0] is not None]}")
        
        # 2. Por que silver_fornecedores está vazio?
        cur.execute("SELECT COUNT(DISTINCT cnpj_fornecedor) FROM silver_despesas WHERE cnpj_fornecedor IS NOT NULL")
        distinct_cnpj = cur.fetchone()[0]
        print(f"CNPJs distintos em silver_despesas: {distinct_cnpj}")
        cur.execute("SELECT COUNT(*) FROM silver_fornecedores")
        fornecedores_count = cur.fetchone()[0]
        print(f"Registros em silver_fornecedores: {fornecedores_count}")
        
        # 3. Conteúdo de gold_series_temporais
        cur.execute("SELECT * FROM gold_series_temporais")
        series = cur.fetchall()
        print(f"Conteúdo de gold_series_temporais (total {len(series)}): {series}")
        
        # 4. Bairros em silver_obras
        cur.execute("SELECT COUNT(*) FROM silver_obras WHERE bairro IS NULL")
        obras_sem_bairro = cur.fetchone()[0]
        print(f"Obras sem bairro definido: {obras_sem_bairro}")

        # 5. Matching Score Distribution
        cur.execute("SELECT confianca, COUNT(*) FROM obra_despesa_match GROUP BY confianca")
        dist = cur.fetchall()
        print(f"Distribuição de confiança no Matching: {dist}")

        # 6. Legacy status check - Are there any new records in public_expenses that are NOT in silver_despesas?
        # Actually, let's just see if public_expenses has recent data_referencia
        cur.execute("SELECT MAX(reference_date) FROM public_expenses")
        max_ref_legacy = cur.fetchone()[0]
        print(f"Data de referência máxima no Legacy: {max_ref_legacy}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro na auditoria V2: {e}")

if __name__ == "__main__":
    audit_v2()
