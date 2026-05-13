from etl.utils.db import get_connection

def check():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'silver_despesas'")
                print("Columns in silver_despesas:")
                for row in cur.fetchall():
                    print(f"  - {row[0]} ({row[1]})")
                
                cur.execute("SELECT count(*) FROM silver_despesas")
                print(f"Total silver_despesas: {cur.fetchone()[0]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check()
