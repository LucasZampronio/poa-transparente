import time
import requests
from etl.silver.cleaners import smart_clean

CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

def get_works(year):
    print(f"🔍 Fetching works for year {year}...")
    all_content = []
    page = 0
    size = 100
    while True:
        url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras?municipio={MUNICIPIO_CODE}&exercicio={year}&page={page}&size={size}"
        try:
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
            if response.status_code == 200:
                data = response.json()
                content = data.get('content', [])
                if not content: 
                    break
                
                all_content.extend(content)
                print(f"   - Page {page}: Found {len(content)} works. Total so far: {len(all_content)}")
                
                # Check if it's the last page
                if data.get('last') is True or len(content) < size:
                    break
                    
                page += 1
                time.sleep(0.5) # Avoid rate limiting
            else:
                print(f"   ⚠️ Error {response.status_code} on page {page}")
                break
        except Exception as e:
            print(f"   ❌ Exception: {e}")
            break
    return all_content

def get_coordinates(id_obra):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras/{id_obra}/coordenadas"
    try:
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if response.status_code == 200:
            coords = response.json()
            if isinstance(coords, list) and len(coords) > 0:
                return float(coords[0].get('latitude')), float(coords[0].get('longitude'))
    except Exception as e:
        print(f"   ⚠️ Exception on get_coordinates({id_obra}): {e}")
    return None

def get_responsaveis(id_obra):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras/{id_obra}/responsaveis"
    try:
        response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            responsaveis = data.get('content', [])
            for r in responsaveis:
                papel = smart_clean(r.get('papelProjeto', ''))
                if 'FISCALIZACAO' in papel:
                    nome = r.get('nomeResponsavelTecnico')
                    setor = r.get('setor', 'N/A')
                    vinculo = r.get('vinculo', 'N/A')
                    return nome, f"Setor: {setor} | Vinculo: {vinculo}"
    except Exception as e:
        print(f"   ⚠️ Exception on get_responsaveis({id_obra}): {e}")
    return None, None
