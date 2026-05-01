import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://poa:poa@localhost:5432/poa_transparente')

def audit():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print('--- AUDIT: silver_obras Duplicates ---')
        # 1. Check by external_id
        cur.execute('SELECT external_id, COUNT(*) FROM silver_obras WHERE external_id IS NOT NULL GROUP BY external_id HAVING COUNT(*) > 1')
        ext_dupes = cur.fetchall()
        print(f'Duplicates by external_id: {len(ext_dupes)}')
        for d in ext_dupes:
            print(f"  ID {d['external_id']}: {d['count']} occurrences")

        # 2. Check by business key (name, agency, value)
        cur.execute('SELECT nome_obra, orgao, valor_licitado, COUNT(*) FROM silver_obras GROUP BY nome_obra, orgao, valor_licitado HAVING COUNT(*) > 1')
        biz_dupes = cur.fetchall()
        print(f'Duplicates by business key: {len(biz_dupes)}')
        for d in biz_dupes:
            print(f"  Obra: {d['nome_obra']} | Orgao: {d['orgao']} | Valor: {d['valor_licitado']} | Count: {d['count']}")

        print('\n--- AUDIT: gold_gastos_por_bairro Consistency ---')
        cur.execute('SELECT COUNT(*) as count FROM gold_gastos_por_bairro')
        gold_count = cur.fetchone()['count']
        print(f'Records in gold_gastos_por_bairro: {gold_count}')
        
        # 3. Aggregation check
        # Gold total_gasto should be the sum of matched despesas, not necessarily silver_obras.valor_licitado
        # Let's check how many silver_obras are in gold_obras_com_gastos
        cur.execute('SELECT COUNT(*) as count FROM gold_obras_com_gastos')
        gold_obras_count = cur.fetchone()['count']
        print(f'Records in gold_obras_com_gastos: {gold_obras_count}')

        # 4. Detailed comparison for Gold vs Silver by Bairro
        # Calculate expected values from Silver (obras matched with expenses)
        cur.execute('''
            SELECT 
                s.bairro, 
                SUM(g.valor_total_gasto) as expected_sum, 
                COUNT(g.obra_id) as expected_count
            FROM silver_obras s
            JOIN gold_obras_com_gastos g ON s.id = g.obra_id
            WHERE s.bairro IS NOT NULL
            GROUP BY s.bairro
        ''')
        expected = cur.fetchall()
        
        print('\nConsistency Check (Aggregated Silver/Gold Obras vs Gold Bairro):')
        for exp in expected:
            cur.execute('SELECT total_gasto, quantidade_obras FROM gold_gastos_por_bairro WHERE bairro = %s', (exp['bairro'],))
            gold_bairro = cur.fetchone()
            if gold_bairro:
                match = (float(exp['expected_sum']) == float(gold_bairro['total_gasto'])) and (exp['expected_count'] == gold_bairro['quantidade_obras'])
                status = "OK" if match else "MISMATCH"
                print(f"  Bairro: {exp['bairro']:<20} | Expected: Sum={exp['expected_sum']}, Cnt={exp['expected_count']} | Gold: Sum={gold_bairro['total_gasto']}, Cnt={gold_bairro['quantidade_obras']} | Status: {status}")
            else:
                print(f"  Bairro: {exp['bairro']:<20} | Expected: Sum={exp['expected_sum']}, Cnt={exp['expected_count']} | Gold: NOT FOUND")

        cur.close()
        conn.close()
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    audit()
