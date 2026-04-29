import json

with open('tmp_datasets.json', 'r') as f:
    data = json.load(f)

for result in data['result']['results']:
    print(f"Dataset: {result['title']} ({result['name']})")
    for res in result['resources']:
        print(f"  Resource: {res['name']} ({res['format']}) - {res['url']}")
