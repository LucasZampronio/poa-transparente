from etl.utils.db import get_connection
import os

def check():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT count(*) FROM silver_obras")
                print(f"silver_obras: {cur.fetchone()[0]}")
                
                cur.execute("SELECT count(*) FROM silver_obras WHERE latitude IS NOT NULL")
                print(f"silver_obras with lat: {cur.fetchone()[0]}")
                
                cur.execute("SELECT count(*) FROM gold_obras_com_gastos")
                print(f"gold_obras_com_gastos: {cur.fetchone()[0]}")
                
                cur.execute("SELECT count(*) FROM gold_gastos_por_bairro")
                print(f"gold_gastos_por_bairro: {cur.fetchone()[0]}")
                
                cur.execute("SELECT count(*) FROM gold_series_temporais")
                print(f"gold_series_temporais: {cur.fetchone()[0]}")

                cur.execute("SELECT count(distinct external_id) FROM silver_obras WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
                print(f"Unique geocoded works: {cur.fetchone()[0]}")

                cur.execute("SELECT external_id, count(*) FROM silver_obras GROUP BY external_id HAVING count(*) > 1")
                print(f"Duplicates: {cur.fetchall()}")

                cur.execute("SELECT count(*) FROM silver_obras WHERE latitude = 0 OR longitude = 0")
                print(f"Works with zero coords: {cur.fetchone()[0]}")

                cur.execute("SELECT count(distinct (latitude, longitude)) FROM silver_obras")
                print(f"Unique coordinates: {cur.fetchone()[0]}")

                cur.execute("SELECT * FROM silver_obras LIMIT 1")
                print(f"Sample obra: {cur.fetchone()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check()
