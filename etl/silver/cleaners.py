import unicodedata
import re

def smart_clean(text):
    if text is None or str(text).lower() in ['nan', 'none', '', 'null']: return "N/A"
    text = str(text)
    nfkd_form = unicodedata.normalize('NFKD', text)
    text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    text = re.sub(r'[^\x20-\x7E]', '', text)
    return text.upper().strip()

def normalize_bairro(bairro_name):
    """
    Normaliza nomes de bairros para evitar duplicatas por caixa alta/baixa
    ou caracteres especiais. Ex: 'Centro Histórico' -> 'CENTRO HISTORICO'
    """
    if not bairro_name or str(bairro_name).upper() == 'PORTO ALEGRE':
        return 'CENTRO' # Default ou tratamento para casos vazios
    
    clean = smart_clean(bairro_name)
    # Remove termos comuns que podem variar
    clean = clean.replace('BAIRRO ', '').replace(' DISTRICT', '')
    return clean.strip()

def map_sector(families):
    if not families: return 'URBANISMO'
    f = " ".join(families).upper()
    if 'SANEAMENTO' in f or 'AGUA' in f or 'ESGOTO' in f: return 'SANEAMENTO'
    if 'PAVIMENTACAO' in f or 'URBANIZACAO' in f or 'PRACAS' in f: return 'URBANISMO'
    if 'EDIFICACOES' in f: return 'ADMINISTRACAO'
    if 'ILUMINACAO' in f or 'ENERGIA' in f: return 'URBANISMO'
    if 'EDUCACAO' in f or 'ESCOLA' in f: return 'EDUCACAO'
    if 'SAUDE' in f or 'HOSPITAL' in f: return 'SAUDE'
    if 'HABITACAO' in f: return 'HABITACAO'
    if 'CULTURA' in f: return 'CULTURA'
    if 'TRANSPORTE' in f or 'MOBILIDADE' in f: return 'TRANSPORTE'
    return 'URBANISMO'
