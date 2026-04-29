import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def debug_expenses():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT address, description_detailed, agency, latitude, longitude 
        FROM public_expenses 
        WHERE district = 'IDENTIFICADO POR IA' 
        LIMIT 20
    """)
    rows = cur.fetchall()
    
    print(f"--- Debugging AI-Enriched Expenses ---")
    for addr, desc, agency, lat, lng in rows:
        print(f"Addr: [{addr}] | Agency: {agency} | Lat: {lat} | Lng: {lng}")
        # print(f"Desc: {desc[:50]}...")
        
    conn.close()

if __name__ == "__main__":
    debug_expenses()
