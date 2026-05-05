# 🚀 Guia de Deploy e Infraestrutura

Este documento serve como ponto de entrada para entender como o **POA Transparente** é implantado e mantido em produção.

## 🏗️ Infraestrutura Always Free (OCI)
Utilizamos a **Oracle Cloud Infrastructure (OCI)** para hospedar nossa stack, aproveitando o plano gratuito para instâncias ARM (Ampere).

### Detalhes Técnicos:
- **VM:** Oracle Cloud Ampere A1 (ARM64).
- **OS:** Ubuntu 22.04 LTS.
- **Orquestração:** Docker Compose.

### Documentação Detalhada:
👉 **[Guia Passo-a-Passo de Deploy na OCI](deployment/OCI.md)**

---

## 🛠️ Manutenção Pós-Deploy

Para atualizar a aplicação em produção:
1. Faça o `git push` para a branch `main`.
2. O workflow `.github/workflows/deploy.yml` cuidará da atualização automática via SSH.
3. Se precisar intervir manualmente:
   ```bash
   cd ~/poa-transparente
   git pull origin main
   docker compose up -d --build
   ```

---

## 📈 Monitoramento
A stack inclui **Prometheus** e **Grafana** para monitorar a saúde do banco de dados e da API, garantindo que o pipeline de ETL não sature os recursos da VM.
