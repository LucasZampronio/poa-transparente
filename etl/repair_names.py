import os
import psycopg2
from etl.ingestion.open_cnpj import get_company_name
from etl.utils.db import load_company_cache
from etl.gold.aggregators import aggregate_gold_data

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def repair_names():
    print("🛠️ Iniciando Reparo Cirúrgico de Nomes...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    company_cache = load_company_cache()

    # 1. Busca obras que estão sem nome de empresa mas tem CNPJ
    cur.execute("SELECT id, contratada_cnpj FROM silver_obras WHERE contratada_nome = 'N/A' OR contratada_nome = 'EMPRESA NÃO INFORMADA'")
    rows = cur.fetchall()
    print(f"🔍 Encontradas {len(rows)} obras para reparar.")

    for obra_id, cnpj in rows:
        if cnpj and cnpj != 'N/A' and len(cnpj) > 10:
            nome = get_company_name(cnpj, company_cache)
            if nome:
                print(f"✅ Atualizando ID {obra_id}: {nome[:40]}")
                cur.execute("UPDATE silver_obras SET contratada_nome = %s WHERE id = %s", (nome, obra_id))
    
    conn.commit()
    print("🚀 Nomes atualizados. Rodando agregação Gold...")
    aggregate_gold_data()
    
    cur.close()
    conn.close()
    print("✨ Reparo concluído!")

if __name__ == "__main__":
    repair_names()
