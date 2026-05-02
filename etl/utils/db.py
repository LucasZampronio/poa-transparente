import os
from psycopg2 import pool
from contextlib import contextmanager

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

# Initialize connection pool
try:
    connection_pool = pool.SimpleConnectionPool(1, 20, DATABASE_URL)
    if connection_pool:
        print("✅ Connection pool created successfully")
except Exception as e:
    print(f"❌ Error creating connection pool: {e}")
    connection_pool = None

@contextmanager
def get_connection():
    if not connection_pool:
        raise Exception("Connection pool is not initialized")
    
    conn = connection_pool.getconn()
    try:
        yield conn
    finally:
        connection_pool.putconn(conn)

def load_company_cache():
    cache = {}
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT beneficiary_id, company_name FROM public_expenses WHERE company_name IS NOT NULL")
                for row in cur.fetchall():
                    cache[row[0]] = row[1]
    except Exception as e:
        print(f"Warning: Could not load company cache: {e}")
    return cache

def load_geo_cache():
    cache = {}
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT address, latitude, longitude FROM geo_cache")
                for row in cur.fetchall():
                    cache[row[0]] = (float(row[1]), float(row[2]))
    except Exception as e:
        print(f"Warning: Could not load geo cache: {e}")
    return cache

def save_geo_to_cache(address, lat, lng):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO geo_cache (address, latitude, longitude) VALUES (%s, %s, %s) ON CONFLICT (address) DO NOTHING",
                    (address, lat, lng)
                )
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not save geo to cache: {e}")
