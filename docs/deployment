# Guia de Deploy POA Transparente na OCI 🚀

Este guia detalha como colocar nossa aplicação no ar usando o plano **Always Free** da Oracle Cloud.

## 1. Configuração da VM
Ao criar a instância no console da OCI, escolha:
- **Imagem:** Ubuntu 22.04 ou Oracle Linux 8/9.
- **Shape:** `VM.Standard.A1.Flex` (ARM Ampere).
- **Rede:** Certifique-se de que a VCN tenha uma "Ingress Rule" (Regra de Entrada) permitindo:
  - Porta `80` e `443` (Para o Nginx futuro).
  - Porta `4000` (Nossa API).
  - Porta `5173` (Nosso Frontend).

## 2. Script de Instalação (User Data)
Cole este script no campo "Cloud-init script" da OCI para automatizar a instalação:

```bash
#!/bin/bash
# Atualiza o sistema
apt-get update && apt-get upgrade -y

# Instala Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instala Docker Compose
apt-get install -y docker-compose-plugin

# Clona o repositório (Substitua pela sua URL)
# git clone https://github.com/SEU_USUARIO/poa-transparente.git /home/ubuntu/poa-transparente
```

## 3. Rodando a Aplicação
Dentro da VM, após clonar o código:

```bash
cd poa-transparente
docker compose up -d
```

## 4. Dica de Sênior: Nginx e SSL
No futuro, para não acessar via `:5173`, usaremos um container do **Nginx Proxy Manager** ou **Traefik** para servir o domínio `poatransparente.com` direto na porta 80 com HTTPS do Let's Encrypt.
