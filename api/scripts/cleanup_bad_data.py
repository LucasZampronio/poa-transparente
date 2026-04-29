import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def cleanup():
    print("🧹 Iniciando limpeza de dados corrompidos...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 1. Remove entrada vazia da KB
        cur.execute("DELETE FROM public_facilities WHERE name = '' OR name IS NULL")
        print(f"✅ Entradas vazias removidas de public_facilities.")

        # 2. Limpa public_expenses de gastos identificados por erro (sem endereço real)
        cur.execute("DELETE FROM public_expenses WHERE district = 'IDENTIFICADO POR IA' AND (address = '' OR address IS NULL)")
        print(f"✅ Gastos órfãos removidos de public_expenses.")

        conn.commit()
        cur.close()
        conn.close()
        print("✨ Limpeza concluída!")
    except Exception as e:
        print(f"❌ Erro na limpeza: {e}")

if __name__ == "__main__":
    cleanup()
