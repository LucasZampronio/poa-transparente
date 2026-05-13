import requests
import json

def debug_all_endpoints():
    endpoints = [
        '/api/expenses/map',
        '/api/rankings/expenses',
        '/api/rankings/companies',
        '/api/rankings/agencies',
        '/api/summary',
        '/api/sectors'
    ]
    
    for ep in endpoints:
        try:
            r = requests.get(f'http://localhost:4000{ep}')
            print(f"Endpoint {ep}: Status {r.status_code}, Items: {len(r.json()) if r.status_code == 200 else 'N/A'}")
            if r.status_code != 200:
                print(f"  Error Detail: {r.text[:200]}")
        except Exception as e:
            print(f"Endpoint {ep}: Exception {e}")

if __name__ == '__main__':
    debug_all_endpoints()
