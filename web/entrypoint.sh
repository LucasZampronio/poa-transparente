#!/bin/sh
set -e

# Se BAO_TOKEN estiver presente, tenta buscar segredos
if [ -n "$BAO_TOKEN" ] && [ -n "$BAO_ADDR" ]; then
    echo "🔐 Buscando segredos no OpenBao ($BAO_ADDR)..."
    SECRET_JSON=$(curl -s -H "X-Bao-Token: $BAO_TOKEN" "$BAO_ADDR/v1/secret/data/poa-transparente")
    
    if echo "$SECRET_JSON" | grep -q '"data":'; then
        echo "✅ Segredos recuperados!"
        # Extrai VITE_API_URL (ou outras) para uso no build/runtime
        VITE_API_URL_VAL=$(echo "$SECRET_JSON" | grep -o '"VITE_API_URL":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$VITE_API_URL_VAL" ]; then
            export VITE_API_URL="$VITE_API_URL_VAL"
            echo "🌐 VITE_API_URL configurada para $VITE_API_URL"
        fi
    fi
fi

# O frontend Vite em produção já está compilado no estágio de build do Docker.
# Para mudar a URL em RUNTIME sem recompilar, usamos o truque do window._env_
# ou simplesmente deixamos o Nginx fazer o proxy.
# Como o Dockerfile atual usa proxy_pass http://api:4000 para /api/, 
# o frontend pode simplesmente usar '/api' como base se estiver no mesmo domínio.

exec "$@"
