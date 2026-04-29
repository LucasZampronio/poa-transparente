import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def init_db():
    print("🚀 Iniciando Seed de Equipamentos Públicos...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Cria a tabela de equipamentos
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public_facilities (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE,
                type TEXT,
                address TEXT,
                latitude NUMERIC(9,6),
                longitude NUMERIC(9,6)
            );
        """)

        # Insere locais estratégicos de Porto Alegre
        facilities = [
            ('HOSPITAL BANCO DE OLHOS', 'SAUDE', 'R. Engenheiro Walter Boehl, 285', -30.0267, -51.1645),
            ('UBS SANTA MARTA', 'SAUDE', 'R. Cap. Montanha, 27', -30.0298, -51.2294),
            ('HOSPITAL DE PRONTO SOCORRO', 'SAUDE', 'Largo Teodoro Herzl, s/n', -30.0354, -51.2185),
            ('SECRETARIA DA SAUDE', 'ADMINISTRACAO', 'Av. Joao Pessoa, 325', -30.0381, -51.2244),
            ('PACO MUNICIPAL', 'ADMINISTRACAO', 'Praca Montevideo, 10', -30.0277, -51.2312),
            ('DEMHAB', 'HABITACAO', 'Av. Princesa Isabel, 1115', -30.0465, -51.2058),
            ('DMAE', 'SANEAMENTO', 'R. 24 de Outubro, 200', -30.0289, -51.2065)
        ]

        for name, ftype, addr, lat, lng in facilities:
            cur.execute("""
                INSERT INTO public_facilities (name, type, address, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name) DO NOTHING;
            """, (name, ftype, addr, lat, lng))

        conn.commit()
        cur.close()
        conn.close()
        print("✅ Equipamentos Públicos semeados com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao semear banco: {e}")

if __name__ == "__main__":
    init_db()
