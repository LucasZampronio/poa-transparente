# 🔐 Gestão de Secrets com OpenBao

Para garantir a segurança em produção, estamos migrando do uso de arquivos `.env` para o **OpenBao** (um fork open-source do HashiCorp Vault).

## 🚀 Fluxo de Promoção

Para promover seus segredos para a produção:

### 1. Inicializar o OpenBao (Primeira vez na VM)
Acesse a VM e execute:
```bash
docker exec -it poa-openbao bao operator init
```
**IMPORTANTE:** Salve as "Unseal Keys" e o "Initial Root Token" em um local seguro (fora do servidor).

### 2. Desbloquear (Unseal)
Sempre que o container reiniciar, você precisará desbloqueá-lo:
```bash
docker exec -it poa-openbao bao operator unseal <KEY_1>
docker exec -it poa-openbao bao operator unseal <KEY_2>
docker exec -it poa-openbao bao operator unseal <KEY_3>
```

### 3. Habilitar o KV Engine (Key-Value)
```bash
docker exec -it poa-openbao bao login <ROOT_TOKEN>
docker exec -it poa-openbao bao secrets enable -path=secret kv-v2
```

### 4. Promover Segredos via Script
No seu ambiente local (ou onde os segredos atuais estão), execute o script de promoção:

```bash
# Configure as variáveis de ambiente necessárias
export BAO_ADDR="http://<IP_DA_VM>:8200"
export BAO_TOKEN="<SEU_ROOT_TOKEN>"

# Rode o script
python scripts/maintenance/promote_secrets_to_bao.py
```

## 🧠 Por que OpenBao? (Nota do Mentor)
Como Tech Lead, escolhi o OpenBao por três motivos principais:
1. **Segurança em Repouso:** Os dados no disco estão criptografados. Mesmo que alguém acesse os arquivos da VM, não verá as senhas.
2. **Auditoria:** Podemos saber exatamente quem e quando acessou cada segredo.
3. **Escalabilidade:** Facilita a rotação de senhas sem precisar reiniciar manualmente todos os serviços com novos arquivos `.env`.

---
*Dica: Em um cenário ideal de CI/CD, o GitHub Actions usaria um AppRole para autenticar no OpenBao e injetar os segredos dinamicamente.*
