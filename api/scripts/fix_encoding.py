import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def fix_encoding(text):
    if not text:
        return text
    try:
        # Tenta converter de UTF-8 interpretado como Latin-1 de volta para bytes e depois para UTF-8 real
        # Ex: "Ã§" -> bytes([0xC3, 0xA7]) -> "ç"
        return text.encode('latin-1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text

def run_fix():
    print("🛠️ Iniciando correção de encoding no banco de dados...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 1. Corrige silver_despesas
        cur.execute("SELECT id, descricao, nome_fornecedor, orgao FROM silver_despesas")
        rows = cur.fetchall()
        for row in rows:
            new_desc = fix_encoding(row[1])
            new_forn = fix_encoding(row[2])
            new_orgao = fix_encoding(row[3])
            
            cur.execute("""
                UPDATE silver_despesas 
                SET descricao = %s, nome_fornecedor = %s, orgao = %s 
                WHERE id = %s
            """, (new_desc, new_forn, new_orgao, row[0]))

        # 2. Corrige public_expenses (o que já foi pro mapa)
        cur.execute("SELECT id, description_detailed, company_name, agency, address FROM public_expenses")
        rows = cur.fetchall()
        for row in rows:
            new_desc = fix_encoding(row[1])
            new_comp = fix_encoding(row[2])
            new_agency = fix_encoding(row[3])
            new_addr = fix_encoding(row[4])
            
            cur.execute("""
                UPDATE public_expenses 
                SET description_detailed = %s, company_name = %s, agency = %s, address = %s 
                WHERE id = %s
            """, (new_desc, new_comp, new_agency, new_addr, row[0]))

        conn.commit()
        cur.close()
        conn.close()
        print("✅ Encoding corrigido com sucesso em todas as tabelas!")
    except Exception as e:
        print(f"❌ Erro ao corrigir encoding: {e}")

if __name__ == "__main__":
    run_fix()
