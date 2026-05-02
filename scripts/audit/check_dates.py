import os
import psycopg2
from datetime import date

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def check_dates():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("--- Silver Obras (data_inicio) ---")
        cur.execute("""
            SELECT 
                EXTRACT(YEAR FROM data_inicio) as year, 
                COUNT(*),
                MIN(data_inicio),
                MAX(data_inicio)
            FROM silver_obras 
            GROUP BY year 
            ORDER BY year
        """)
        rows = cur.fetchall()
        for row in rows:
            print(f"Year: {row[0]}, Count: {row[1]}, Min: {row[2]}, Max: {row[3]}")
            
        print("\n--- Silver Despesas (data_empenho) ---")
        cur.execute("""
            SELECT 
                EXTRACT(YEAR FROM data_empenho) as year, 
                COUNT(*),
                MIN(data_empenho),
                MAX(data_empenho)
            FROM silver_despesas 
            GROUP BY year 
            ORDER BY year
        """)
        rows = cur.fetchall()
        for row in rows:
            print(f"Year: {row[0]}, Count: {row[1]}, Min: {row[2]}, Max: {row[3]}")

        print("\n--- Sample Raw Values ---")
        cur.execute("SELECT data_inicio FROM silver_obras LIMIT 1")
        val_obra = cur.fetchone()
        print(f"Raw data_inicio (obra): {val_obra[0]} | Type: {type(val_obra[0])}")

        cur.execute("SELECT data_empenho FROM silver_despesas LIMIT 1")
        val_despesa = cur.fetchone()
        print(f"Raw data_empenho (despesa): {val_despesa[0]} | Type: {type(val_despesa[0])}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_dates()
