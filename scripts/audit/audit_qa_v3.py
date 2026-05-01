import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def audit_v3():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("--- AUDITORIA V3: INVESTIGAÇÃO DE NAN E FORNECEDORES ---")
        
        # 1. Verificar se há NaN em valor_pago
        cur.execute("SELECT COUNT(*) FROM silver_despesas WHERE valor_pago::text = 'NaN'")
        nan_count = cur.fetchone()[0]
        print(f"Registros com 'NaN' em valor_pago na Silver: {nan_count}")
        
        # 2. Verificar os fornecedores
        cur.execute("SELECT cnpj_fornecedor, nome_fornecedor, COUNT(*) FROM silver_despesas GROUP BY 1, 2")
        fornecedores = cur.fetchall()
        print(f"Fornecedores em silver_despesas: {fornecedores}")
        
        # 3. Amostra de dados do legacy com 2026
        cur.execute("SELECT * FROM public_expenses WHERE reference_date >= '2026-01-01' LIMIT 5")
        future_legacy = cur.fetchall()
        print(f"Amostra Legacy 2026: {future_legacy}")

        # 4. Verificar se a tabela bronze_raw_records foi populada alguma vez
        cur.execute("SELECT COUNT(*) FROM portal_transparencia_sync_runs")
        sync_runs = cur.fetchone()[0]
        print(f"Total de sync_runs em Bronze: {sync_runs}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro na auditoria V3: {e}")

if __name__ == "__main__":
    audit_v3()
