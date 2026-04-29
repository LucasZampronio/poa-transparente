import os
import requests
import psycopg2
from datetime import datetime
from etl.utils.db import get_connection
from etl.ingestion.nominatim import get_coords_from_address

# Configurações do Portal da Transparência
API_KEY = os.getenv("PORTAL_TRANSPARENCIA_API_KEY", "04bfc25fbd6241b8adeb4b553d56e219")
BASE_URL = "https://api.portaldatransparencia.gov.br/api-de-dados"
IBGE_POA = "4314902"

def fetch_convenios(ano):
    print(f"📡 Buscando Convênios Federais de {ano} (Mês a Mês)...")
    headers = {"chave-api-dados": API_KEY, "Accept": "application/json"}
    all_convenios = []
    
    # Itera sobre cada mês do ano para respeitar o limite de 1 mês da API
    for mes in range(1, 13):
        data_ini = f"01/{mes:02d}/{ano}"
        # Simplificação: assume 28 dias para todos os meses para garantir que está dentro do limite
        data_fim = f"28/{mes:02d}/{ano}"
        
        params = {
            "codigoMunicipio": IBGE_POA,
            "dataInicial": data_ini,
            "dataFinal": data_fim,
            "pagina": 1
        }
        
        try:
            url = f"{BASE_URL}/convenios"
            resp = requests.get(url, headers=headers, params=params, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                all_convenios.extend(data)
                print(f"  ✅ Mês {mes:02d}: {len(data)} convênios")
            else:
                print(f"  ⚠️ Erro Mês {mes:02d}: {resp.status_code}")
        except Exception as e:
            print(f"  ❌ Erro Mês {mes:02d}: {e}")
            
    return all_convenios

def sync_federal_expenses_to_map():
    print("--- 🏛️ SINCRONIZANDO GASTOS FEDERAIS PARA O MAPA ---")
    
    # Cache de geolocalização simples para economizar chamadas
    geo_cache = {}
    
    with get_connection() as conn:
        with conn.cursor() as cur:
            for ano in [2024, 2023]:
                convenios = fetch_convenios(ano)
                for c in convenios:
                    # Extração de campos
                    objeto = c.get('objeto', 'CONVÊNIO FEDERAL')
                    valor = float(c.get('valorCelebrado', 0))
                    orgao = c.get('concedente', {}).get('nome', 'GOVERNO FEDERAL')
                    empresa = c.get('conveniado', {}).get('nome', 'PREFEITURA DE PORTO ALEGRE')
                    cnpj = c.get('conveniado', {}).get('cnpj', '')
                    num_convenio = c.get('numeroConvenio', 'S/N')
                    
                    # Tentativa de Geocodificação (usamos Porto Alegre como fallback)
                    # No futuro, podemos tentar extrair o bairro do campo 'objeto'
                    endereco = "Porto Alegre, RS"
                    
                    if endereco not in geo_cache:
                        coords = get_coords_from_address(endereco, geo_cache)
                        geo_cache[endereco] = coords
                    
                    lat, lng = geo_cache[endereco] if geo_cache[endereco] else (None, None)
                    
                    # Inserção na public_expenses (tabela unificada do mapa)
                    cur.execute("""
                        INSERT INTO public_expenses (
                            reference_date, agency, company_name, category, sector, 
                            district, latitude, longitude, contract_value, bidding_count,
                            beneficiary_id, process_number, description_detailed, portal_link,
                            address
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (process_number, company_name, description_detailed) DO NOTHING
                    """, (
                        datetime(ano, 1, 1),
                        orgao,
                        empresa,
                        "CONVÊNIO FEDERAL",
                        "ADMINISTRACAO", # Setor padrão para convênios
                        "PORTO ALEGRE",
                        lat, lng,
                        valor, 1, cnpj, num_convenio,
                        objeto,
                        f"https://portaldatransparencia.gov.br/convenios/{num_convenio}",
                        endereco
                    ))
            conn.commit()
    print("--- ✅ GASTOS FEDERAIS INTEGRADOS! ---")

if __name__ == "__main__":
    sync_federal_expenses_to_map()
