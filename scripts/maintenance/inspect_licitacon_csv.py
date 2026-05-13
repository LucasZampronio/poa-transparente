import requests
import pandas as pd
import io

def inspect_csv():
    url = "https://dadosabertos.poa.br/dataset/0a376fbb-4c35-4e51-93d0-ef05f32ff1e5/resource/e08dcf9a-9496-4540-a88a-10af1c4779ce/download/licitacon.csv"
    try:
        print(f"Downloading {url}...")
        # Download only the beginning of the file to save bandwidth
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
    inspect_csv()
