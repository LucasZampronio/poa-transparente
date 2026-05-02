import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def check():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    print("Distinct years in silver_despesas:")
    cur.execute("SELECT DISTINCT EXTRACT(YEAR FROM data_empenho) as ano FROM silver_despesas ORDER BY ano")
    for row in cur.fetchall():
        print(row[0])
        
    print("\nDistinct years in silver_obras:")
    cur.execute("SELECT DISTINCT EXTRACT(YEAR FROM data_inicio) as ano FROM silver_obras ORDER BY ano")
    for row in cur.fetchall():
        print(row[0])
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    check()
