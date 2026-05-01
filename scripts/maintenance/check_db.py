import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def check():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM silver_obras")
    obras = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM silver_obras WHERE latitude IS NOT NULL")
    geocoded = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM gold_obras_com_gastos")
    gold = cur.fetchone()[0]
    
    print(f"Obras: {obras}")
    print(f"Geocodificadas: {geocoded}")
    print(f"Gold Obras: {gold}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    check()
