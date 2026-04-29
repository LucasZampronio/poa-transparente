import json

with open('tmp_pagamentos.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

for result in data['result']['results']:
    print(f"Dataset: {result['title']} ({result['name']})")
    for res in result['resources']:
        print(f"  Resource: {res['name']} ({res['format']}) - {res['url']}")
