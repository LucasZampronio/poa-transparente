import os
import psycopg2
import sys
import os

# Adiciona o diretório raiz ao path para importar o nominatim
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from etl.ingestion.nominatim import get_coords_from_address
from etl.utils.db import load_geo_cache

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def populate():
    print("🌍 Buscando coordenadas para novos equipamentos públicos...")
    geo_cache = load_geo_cache()
    
    facilities_to_add = [
        # Saúde
        ("USF Primeiro de Maio", "SAUDE", "Av. Professor Oscar Pereira, 6199"),
        ("USF Mato Sampaio", "SAUDE", "R. Condor, 450"),
        ("USF Lomba do Pinheiro", "SAUDE", "Estr. João de Oliveira Remião, 6111"),
        ("USF Restinga", "SAUDE", "R. Eng. Oscar de Oliveira Ramos, 461"),
        ("USF Ipanema", "SAUDE", "Av. Guaíba, 2020"),
        ("USF Cruzeiro do Sul", "SAUDE", "R. Professor Manoel Lobato, 151"),
        ("USF Bom Jesus", "SAUDE", "R. São Felipe, 120"),
        ("HOSPITAL MATERNO INFANTIL PRESIDENTE VARGAS", "SAUDE", "Av. Independência, 661"),
        
        # Educação
        ("EMEF Liberato Salzano Vieira da Cunha", "EDUCACAO", "R. Xavier de Carvalho, 274"),
        ("EMEF Alberto Pasqualini", "EDUCACAO", "R. Américo Vespúcio, 461"),
        ("EMEF Saint Hilaire", "EDUCACAO", "Av. Sen. Salgado Filho, 11000"),
        ("EMEF Mario Quintana", "EDUCACAO", "R. Chácara do Banco, 71"),
        ("EMEF Leocadia Felizardo Prestes", "EDUCACAO", "R. Paulo Gomes de Oliveira, 200"),
        
        # Administração / Sedes
        ("SECRETARIA MUNICIPAL DE EDUCACAO", "ADMINISTRACAO", "R. dos Andradas, 680"),
        ("SECRETARIA MUNICIPAL DA FAZENDA", "ADMINISTRACAO", "R. Sete de Setembro, 609"),
        ("SECRETARIA MUNICIPAL DE CULTURA", "ADMINISTRACAO", "Av. Independência, 453"),
        ("SECRETARIA MUNICIPAL DE MOBILIDADE URBANA", "ADMINISTRACAO", "R. João Neves da Fontoura, 7"),
        ("PROCERGS", "TECNOLOGIA", "R. Sete de Setembro, 1088"),
        ("CARRIS", "TRANSPORTE", "R. Albion, 385")
    ]

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    added_count = 0
    for name, ftype, addr in facilities_to_add:
        print(f"🔍 Geocodificando: {name}...")
        coords = get_coords_from_address(addr, geo_cache)
        if coords:
            lat, lng = coords
            cur.execute("""
                INSERT INTO public_facilities (name, type, address, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    address = EXCLUDED.address;
            """, (name.upper(), ftype, addr, lat, lng))
            added_count += 1
        else:
            print(f"⚠️ Não foi possível localizar: {addr}")

    conn.commit()
    cur.close()
    conn.close()
    print(f"✅ Finalizado! {added_count} novos equipamentos adicionados ao catálogo.")

if __name__ == "__main__":
    populate()
