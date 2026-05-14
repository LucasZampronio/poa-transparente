#!/bin/sh
set -e

# Se BAO_TOKEN estiver presente, tenta buscar segredos
if [ -n "$BAO_TOKEN" ] && [ -n "$BAO_ADDR" ]; then
    echo "🔐 Buscando segredos no OpenBao ($BAO_ADDR)..."
    
    # Busca os segredos via API REST do OpenBao
    # Usamos o endpoint de dados do KV v2
    SECRET_JSON=$(curl -s -H "X-Bao-Token: $BAO_TOKEN" "$BAO_ADDR/v1/secret/data/poa-transparente")
    
    # Verifica se a resposta contém erro ou se o curl falhou
    if echo "$SECRET_JSON" | grep -q '"data":'; then
        echo "✅ Segredos recuperados com sucesso!"
        
        # Extrai os segredos usando grep/sed (para não depender de jq em imagens leves)
        # Transforma o JSON {"data": {"KEY": "VAL"}} em export KEY="VAL"
        eval $(echo "$SECRET_JSON" | grep -o '"data":{[^}]*}' | sed 's/"data":{//;s/}//;s/,"/\n/g;s/":"/=/g;s/"//g;s/^/export /')
    else
        echo "⚠️ Aviso: Não foi possível recuperar segredos do OpenBao. Usando ambiente padrão."
        echo "Resposta: $SECRET_JSON"
    fi
fi

# Executa o comando principal (npm start, python main.py, etc)
exec "$@"
