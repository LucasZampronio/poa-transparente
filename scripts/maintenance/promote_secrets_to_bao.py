import os
import requests
import json
from dotenv import load_dotenv

# Configurações do OpenBao
BAO_ADDR = os.getenv("BAO_ADDR", "http://localhost:8200")
BAO_TOKEN = os.getenv("BAO_TOKEN")  # Root token ou token com permissão de escrita
KV_PATH = "secret/data/poa-transparente" # Caminho padrão para segredos KV v2

def promote_secrets():
    """
    Lê segredos do ambiente atual (ou .env) e os envia para o OpenBao.
    """
    if not BAO_TOKEN:
        print("❌ Erro: BAO_TOKEN não configurado. Forneça o Root Token do OpenBao.")
        return

    # Lista de segredos que queremos promover
    secrets_to_promote = [
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "PORTAL_TRANSPARENCIA_API_KEY",
        "CONECTA_GOV_TOKEN",
        "GF_ADMIN_PASSWORD"
    ]

    data = {}
    for secret in secrets_to_promote:
        val = os.getenv(secret)
        if val:
            data[secret] = val
            print(f"✅ Coletado: {secret}")
        else:
            print(f"⚠️ Aviso: {secret} não encontrado no ambiente.")

    if not data:
        print("❌ Nenhum segredo encontrado para promover.")
        return

    # Payload para OpenBao KV v2
    payload = {
        "data": data
    }

    headers = {
        "X-Bao-Token": BAO_TOKEN,
        "Content-Type": "application/json"
    }

    url = f"{BAO_ADDR}/v1/{KV_PATH}"
    
    print(f"🚀 Enviando segredos para {url}...")
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        if response.status_code in [200, 204]:
            print("✨ Segredos promovidos com sucesso para o OpenBao!")
        else:
            print(f"❌ Erro ao promover segredos: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Falha na conexão com OpenBao: {str(e)}")

if __name__ == "__main__":
    # Tenta carregar .env local se existir
    load_dotenv()
    promote_secrets()
