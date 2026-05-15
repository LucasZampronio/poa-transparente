import time
import requests
import logging
from etl.silver.cleaners import smart_clean

from etl.utils.decorators import with_retry

# Configuração básica de log para aprendizado do estagiário
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ingestion.tce")

CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"

@with_retry(retries=3, backoff=2)
def get_works_page(year, page, size):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras?municipio={MUNICIPIO_CODE}&exercicio={year}&page={page}&size={size}"
    response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
    response.raise_for_status()
    return response.json()

def get_works(year):
    logger.info(f"🔍 Fetching works for year {year}...")
    all_content = []
    page = 0
    size = 100
    while True:
        try:
            data = get_works_page(year, page, size)
            content = data.get('content', [])
            if not content: 
                break
            
            all_content.extend(content)
            logger.info(f"   - Page {page}: Found {len(content)} works. Total so far: {len(all_content)}")
            
            # Check if it's the last page
            if data.get('last') is True or len(content) < size:
                break
                
            page += 1
            time.sleep(0.5) # Avoid rate limiting
        except requests.exceptions.RequestException as e:
            logger.error(f"   ❌ Network error on page {page}: {e}")
            raise # Re-raise to let the orchestrator know it failed
        except Exception as e:
            logger.error(f"   ❌ Unexpected error on page {page}: {e}")
            raise
            
    return all_content

@with_retry(retries=3, backoff=2)
def get_coordinates(id_obra):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras/{id_obra}/coordenadas"
    response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    if response.status_code == 200:
        coords = response.json()
        if isinstance(coords, list) and len(coords) > 0:
            return float(coords[0].get('latitude')), float(coords[0].get('longitude'))
    return None

@with_retry(retries=3, backoff=2)
def get_responsaveis(id_obra):
    url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras/{id_obra}/responsaveis"
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
    return None, None
