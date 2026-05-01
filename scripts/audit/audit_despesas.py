import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://poa:poa@localhost:5432/poa_transparente')

def audit_despesas():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print('--- AUDIT: silver_despesas Integrity ---')
        # 1. Duplicates in despesas (num_empenho)
        cur.execute('SELECT num_empenho, COUNT(*) FROM silver_despesas WHERE num_empenho IS NOT NULL GROUP BY num_empenho HAVING COUNT(*) > 1 LIMIT 10')
        despesa_dupes = cur.fetchall()
        print(f'Duplicate empenhos found: {len(despesa_dupes)}')
        for d in despesa_dupes:
             print(f"  Empenho {d['num_empenho']}: {d['count']} occurrences")

        # 2. Orphans (Despesas without matches)
        cur.execute('SELECT COUNT(*) as count FROM silver_despesas d LEFT JOIN obra_despesa_match m ON d.id = m.despesa_id WHERE m.id IS NULL')
        orphans = cur.fetchone()['count']
        cur.execute('SELECT COUNT(*) as count FROM silver_despesas')
        total_despesas = cur.fetchone()['count']
        print(f'Total despesas: {total_despesas}')
        print(f'Orphan despesas (no match): {orphans} ({round(orphans/total_despesas*100, 2) if total_despesas > 0 else 0}%)')

        # 3. Match confidence distribution
        print('\n--- AUDIT: Match Confidence ---')
        cur.execute('SELECT confianca, COUNT(*) FROM obra_despesa_match GROUP BY confianca')
        conf_dist = cur.fetchall()
        for c in conf_dist:
            print(f"  Confidence {c['confianca']}: {c['count']}")

        # 4. Check for null values in critical silver_obras fields
        print('\n--- AUDIT: Silver Obras Data Quality ---')
        cur.execute('SELECT COUNT(*) as count FROM silver_obras WHERE bairro IS NULL')
        null_bairro = cur.fetchone()['count']
        cur.execute('SELECT COUNT(*) as count FROM silver_obras WHERE valor_licitado IS NULL OR valor_licitado = 0')
        zero_value = cur.fetchone()['count']
        print(f'Obras with null bairro: {null_bairro}')
        print(f'Obras with null/zero value: {zero_value}')

        cur.close()
        conn.close()
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    audit_despesas()
