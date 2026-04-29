import json

with open('tmp_execucao.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

for result in data['result']['results']:
    print(f"Dataset: {result['title']} ({result['name']})")
