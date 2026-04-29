import json

with open('tmp_gor.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

print(f"Dataset: {data['result']['title']}")
for res in data['result']['resources']:
    print(f"  Resource: {res['name']} ({res['format']}) - {res['url']}")
