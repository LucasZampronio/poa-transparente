import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def run_query(query, params=None):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(query, params)
        if cur.description:
            columns = [desc[0] for desc in cur.description]
            data = cur.fetchall()
            return columns, data
        conn.commit()
        return None, None
    except Exception as e:
        print(f"Error executing query: {e}")
        return None, None
    finally:
        if 'conn' in locals():
            conn.close()

def print_table(cols, data):
    if not data:
        print("Nenhum dado encontrado.")
        return
    header = " | ".join(cols)
    print(header)
    print("-" * len(header))
    for row in data:
        print(" | ".join(str(item) for item in row))

def validate():
    print("=== Validação de Métricas da Camada Gold ===\n")

    # 1. Agregação de despesas por bairro
    print("1. Top 5 Bairros por Gastos (gold_gastos_por_bairro):")
    cols, data = run_query("SELECT bairro, total_gasto, quantidade_obras FROM gold_gastos_por_bairro ORDER BY total_gasto DESC LIMIT 5")
    print_table(cols, data)

    # 2. Top 5 Fornecedores
    print("\n2. Top 5 Fornecedores (gold_top_empresas):")
    cols, data = run_query("SELECT empresa, total_recebido, quantidade_contratos FROM gold_top_empresas ORDER BY total_recebido DESC LIMIT 5")
    print_table(cols, data)

    # 3. Bolsa Família e BPC (portal_beneficios_municipio)
    print("\n3. Benefícios Sociais (Bolsa Família / BPC) em portal_beneficios_municipio:")
    cols, data = run_query("""
        SELECT beneficio_tipo_descricao, SUM(valor) as total_valor, SUM(quantidade_beneficiados) as total_beneficiados
        FROM portal_beneficios_municipio
        GROUP BY beneficio_tipo_descricao
    """)
    print_table(cols, data)

    # 4. Check Silver Despesas for consistency
    print("\n4. Consistência Silver Despesas (Top 5 por valor):")
    cols, data = run_query("SELECT nome_fornecedor, valor_pago, orgao, data_empenho FROM silver_despesas ORDER BY valor_pago DESC LIMIT 5")
    print_table(cols, data)
    
    # 5. Check if Bolsa Familia/BPC are in silver_despesas
    print("\n5. Busca por 'Bolsa' ou 'Prestação Continuada' em silver_despesas:")
    cols, data = run_query("SELECT COUNT(*) FROM silver_despesas WHERE descricao ILIKE '%%Bolsa%%' OR descricao ILIKE '%%Continuada%%'")
    print(f"Ocorrências em silver_despesas: {data[0][0] if data else 0}")

if __name__ == "__main__":
    validate()
