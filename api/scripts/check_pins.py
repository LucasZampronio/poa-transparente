import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def check_pins():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Busca por coordenadas únicas de gastos identificados por IA
    cur.execute("""
        SELECT latitude, longitude, address, COUNT(*) 
        FROM public_expenses 
        WHERE district = 'IDENTIFICADO POR IA' 
        GROUP BY latitude, longitude, address
    """)
    rows = cur.fetchall()
    
    print(f"📍 Total de locais únicos (pins) identificados por IA: {len(rows)}")
    for lat, lng, addr, count in rows:
        print(f" - {addr}: {count} despesas associadas ({lat}, {lng})")
        
    conn.close()

if __name__ == "__main__":
    check_pins()
