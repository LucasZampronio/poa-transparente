import requests
import json

def search_ckan(query):
    print(f"\n🔍 Buscando por: {query}")
    url = f'https://dadosabertos.poa.br/api/3/action/package_search?q={query}'
    try:
        r = requests.get(url).json()
        if not r.get('success'):
            print("❌ Erro na API")
            return
            
        results = r.get('result', {}).get('results', [])
        for pkg in results:
            print(f"📦 Dataset: {pkg.get('title')}")
            for res in pkg.get('resources', []):
                if 'csv' in res.get('format', '').lower():
                    print(f"  🔗 CSV: {res.get('url')}")
    except Exception as e:
        print(f"❌ Erro: {e}")

search_ckan('unidade')
search_ckan('posto')
search_ckan('parque')
search_ckan('praca')
search_ckan('museu')
search_ckan('teatro')
search_ckan('administrativo')
