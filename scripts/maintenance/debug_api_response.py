import requests
import json

def debug_api():
    try:
        r = requests.get('http://localhost:4000/api/expenses/map')
        if r.status_code != 200:
            print(f"Error: {r.status_code}")
            return
        
        data = r.json()
        print(f"Total items returned: {len(data)}")
        if data:
            print("First item sample:")
            print(json.dumps(data[0], indent=2))
            
            # Check for unique external_ids in response
            ids = [item.get('process_number') for item in data]
            print(f"Unique process_numbers: {len(set(ids))}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == '__main__':
    debug_api()
