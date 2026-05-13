import requests
import pandas as pd
import io

def inspect_despesas():
    url = "https://dadosabertos.poa.br/dataset/b5eac908-416d-42f0-9fb6-432f1b717ff1/resource/b9293840-dead-43e5-8cd5-a158d971fa8f/download/despesas_2025.csv"
    try:
        print(f"Downloading {url}...")
        response = requests.get(url, stream=True, timeout=30)
        content = b""
        for chunk in response.iter_content(chunk_size=1024):
            content += chunk
            if len(content) > 1024 * 100: # 100KB
                break
        
        # Try to detect separator
        s = content.decode('iso-8859-1')
        df = pd.read_csv(io.StringIO(s), sep=';', nrows=5)
        print("Columns found (sep=;):")
        print(df.columns.tolist())
        print("Sample data:")
        print(df.head(2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    inspect_despesas()
