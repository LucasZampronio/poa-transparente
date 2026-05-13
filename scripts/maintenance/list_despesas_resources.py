import requests

def list_resources(pkg_name):
    url = f'https://dadosabertos.poa.br/api/3/action/package_show?id={pkg_name}'
    try:
        r = requests.get(url).json()
        if r.get('success'):
            pkg = r.get('result', {})
            print(f"📦 Dataset: {pkg.get('title')}")
            for res in pkg.get('resources', []):
                print(f"  - {res.get('name')}: {res.get('url')}")
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == '__main__':
    # The package id for "Despesas" from previous search seems to be b5eac908-416d-42f0-9fb6-432f1b717ff1
    list_resources('b5eac908-416d-42f0-9fb6-432f1b717ff1')
