import requests
import json
import os

CNPJ_POA = "92963560000160"
MUNICIPIO_CODE = "88301"
year = 2025

url = f"https://portal.tce.rs.gov.br/api/obras/v1/orgaos/{CNPJ_POA}/obras?municipio={MUNICIPIO_CODE}&exercicio={year}&page=0&size=1"
response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
data = response.json()
print("TCE API SAMPLE:")
print(json.dumps(data['content'][0] if data.get('content') else {}, indent=2))
