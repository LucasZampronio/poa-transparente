import os
import psycopg2
import re
import random
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

def add_jitter(coord):
    # Adiciona um desvio de aprox. 10-30 metros para evitar sobreposição exata
    return float(coord) + (random.uniform(-0.0002, 0.0002))

def enrich_expenses():
    print("🧠 Iniciando Agente de Enriquecimento Geográfico (V2 - Com Jitter e Siglas)...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # 1. Carrega os equipamentos públicos conhecidos
        cur.execute("SELECT name, latitude, longitude, type FROM public_facilities")
        facilities = cur.fetchall()
        
        # Mapeamento de siglas para nomes completos no catálogo
        acronyms = {
            'SMED': 'SECRETARIA MUNICIPAL DE EDUCACAO',
            'SMS': 'SECRETARIA DA SAUDE',
            'SMF': 'SECRETARIA MUNICIPAL DA FAZENDA',
            'SMC': 'SECRETARIA MUNICIPAL DE CULTURA',
            'SMMU': 'SECRETARIA MUNICIPAL DE MOBILIDADE URBANA',
            'HPS': 'HOSPITAL DE PRONTO SOCORRO'
        }

        # 2. Busca um volume maior de despesas
        cur.execute("""
            SELECT id, descricao, nome_fornecedor, valor_empenhado, data_empenho, orgao, cnpj_fornecedor, num_empenho
            FROM silver_despesas 
            ORDER BY valor_empenhado DESC
            LIMIT 5000
        """)
        despesas = cur.fetchall()
        
        mapped_count = 0
        for d_id, desc, fornecedor, valor, data, orgao, cnpj, num in despesas:
            found_loc = None
            desc_upper = (desc or "").upper()
            orgao_upper = (orgao or "").upper()
            
            # Tenta encontrar por nome completo ou núcleo do nome
            for name, lat, lng, ftype in facilities:
                core_name = re.sub(r'^(EMEF|USF|UBS|HOSPITAL|SECRETARIA)\s+', '', name)
                if name in desc_upper or (len(core_name) > 8 and core_name in desc_upper):
                    found_loc = (name, lat, lng, ftype)
                    break
            
            # Se não encontrou, tenta por siglas na descrição ou no campo órgão
            if not found_loc:
                for sigla, full_name in acronyms.items():
                    if f" {sigla} " in f" {desc_upper} " or sigla in orgao_upper:
                        # Busca as coordenadas do nome completo no catálogo
                        for name, lat, lng, ftype in facilities:
                            if name == full_name:
                                found_loc = (name, lat, lng, ftype)
                                break
                        if found_loc: break

            if found_loc:
                name, lat, lng, ftype = found_loc
                
                # Aplica Jitter para não sobrepor pins
                j_lat = add_jitter(lat)
                j_lng = add_jitter(lng)

                # Usamos o ID da despesa na descrição para garantir unicidade no ON CONFLICT
                unique_desc = f"{desc} (REF: {num}-{d_id})"

                cur.execute("""
                    INSERT INTO public_expenses (
                        reference_date, agency, company_name, category, sector, 
                        district, latitude, longitude, contract_value, bidding_count,
                        beneficiary_id, process_number, description_detailed, portal_link,
                        address
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (process_number, company_name, description_detailed) 
                    DO UPDATE SET 
                        latitude = EXCLUDED.latitude, 
                        longitude = EXCLUDED.longitude,
                        address = EXCLUDED.address
                """, (
                    data,
                    orgao,
                    fornecedor,
                    ftype,
                    ftype,
                    "IDENTIFICADO POR IA",
                    j_lat, j_lng,
                    valor, 1, cnpj, num,
                    unique_desc,
                    f"https://transparencia.portoalegre.rs.gov.br/despesa/{num}",
                    name
                ))
                mapped_count += 1

        conn.commit()
        cur.close()
        conn.close()
        print(f"✨ Sucesso! {mapped_count} despesas comuns foram mapeadas e espalhadas (jitter) no mapa.")
    except Exception as e:
        print(f"❌ Erro no enriquecimento: {e}")

if __name__ == "__main__":
    enrich_expenses()
