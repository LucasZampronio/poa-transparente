import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def count_expenses():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    cur.execute("SELECT COUNT(*) FROM public_expenses")
    total = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM public_expenses WHERE district = 'IDENTIFICADO POR IA'")
    enriched = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM public_expenses WHERE category = 'CONVÊNIO FEDERAL'")
    federal = cur.fetchone()[0]
    
    # O restante são obras do TCE
    tce = total - enriched - federal
    
    print(f"Total: {total}")
    print(f"Obras (TCE-RS): {tce}")
    print(f"Despesas Administrativas (IA/Open Data): {enriched}")
    print(f"Convênios Federais (CGU): {federal}")
    
    conn.close()

if __name__ == "__main__":
    count_expenses()
