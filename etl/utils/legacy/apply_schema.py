import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def apply_schema():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        with open('db/init/002_gold_layer.sql', 'r') as f:
            sql = f.read()
            cur.execute(sql)
        
        conn.commit()
        cur.close()
        conn.close()
        print("Schema applied successfully.")
    except Exception as e:
        print(f"Error applying schema: {e}")

if __name__ == "__main__":
    apply_schema()
