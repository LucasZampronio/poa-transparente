import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def find_schools():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, descricao, orgao 
        FROM silver_despesas 
        WHERE descricao ILIKE '%EMEF%' 
           OR descricao ILIKE '%EMEI%' 
           OR orgao ILIKE '%EDUCA%'
        LIMIT 20
    """)
    rows = cur.fetchall()
    
    print(f"--- Education-Related Expenses ---")
    for d_id, desc, orgao in rows:
        print(f"ID: {d_id} | Orgao: {orgao} | Desc: {desc[:100]}...")
        
    conn.close()

if __name__ == "__main__":
    find_schools()
