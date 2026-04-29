import requests
import re

def get_company_name(cnpj, cache):
    cnpj_clean = re.sub(r'\D', '', str(cnpj))
    if not cnpj_clean or len(cnpj_clean) != 14: return f"CNPJ: {cnpj}"
    if cnpj_clean in cache: return cache[cnpj_clean]
    if cnpj_clean == "92963560000160": return "PREFEITURA MUNICIPAL DE PORTO ALEGRE"

    try:
        response = requests.get(f"https://api.opencnpj.org/{cnpj_clean}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            name = data.get('razao_social')
            if name:
                name_upper = name.upper()
                cache[cnpj_clean] = name_upper
                return name_upper
    except: pass
    return f"EMPRESA (CNPJ: {cnpj_clean})"
