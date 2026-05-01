import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def check_data():
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT MIN(data_empenho), MAX(data_empenho), COUNT(*) FROM silver_despesas")
    row = cur.fetchone()
    print(f"Despesas: Min={row[0]}, Max={row[1]}, Total={row[2]}")
    
    cur.execute("SELECT COUNT(*) FROM obra_despesa_match")
    count_match = cur.fetchone()[0]
    print(f"Matches: {count_match}")

    cur.execute("SELECT EXTRACT(YEAR FROM data_empenho) as year, COUNT(*) FROM silver_despesas GROUP BY year ORDER BY year")
    years = cur.fetchall()
    print(f"Anos nas despesas: {years}")
    
    conn.close()

if __name__ == "__main__":
    check_data()
