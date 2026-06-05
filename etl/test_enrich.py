import sys
import os

# Ajusta path para importar do projeto
sys.path.append(os.getcwd())

from etl.ingestion.open_cnpj import get_company_name

cache = {}
cnpj = "40157310000139" # Exemplo do log
nome = get_company_name(cnpj, cache)
print(f"CNPJ: {cnpj} -> NOME: {nome}")
