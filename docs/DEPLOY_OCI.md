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

## 🤖 Automação e Resiliência (GitHub Actions)
Devido à alta demanda pelas instâncias gratuitas da OCI, implementamos um sistema de **"Pesca de Instâncias"**:

1. **Workflow de Provisionamento:** Localizado em `.github/workflows/oci-provision.yml`.
2. **Lógica:** O GitHub Actions tenta criar a instância via CLI da OCI a cada hora.
3. **Resiliência:** Quando a OCI retorna erro de `Out of Capacity`, o script registra a tentativa e aguarda o próximo ciclo, garantindo que "pescaremos" a primeira vaga disponível.

---

## 🛠️ Manutenção Pós-Deploy

Para atualizar a aplicação em produção:
1. Faça o `git push` para a branch `main`.
2. Acesse a VM via SSH.
3. Execute os comandos:
   ```bash
   cd poa-transparente
   git pull
   docker compose up -d --build
   ```

---

## 📈 Monitoramento
A stack inclui **Prometheus** e **Grafana** para monitorar a saúde do banco de dados e da API, garantindo que o pipeline de ETL não sature os recursos da VM.
