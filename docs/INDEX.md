# 📚 Documentação POA Transparente

Bem-vindo à central de documentação do projeto **POA Transparente**. Aqui você encontrará detalhes sobre a arquitetura, decisões técnicas e guias de operação.

## 🗺️ Mapa da Documentação

### 🏗️ [Arquitetura](architecture/README.md)
- [Visão Geral da Arquitetura (Medallion)](ARCHITECTURE.md)
- Fluxo de Dados (ETL)
- Modelagem de Dados

### 🚀 [Deployment](deployment/OCI.md)
- [Guia de Deploy na Oracle Cloud (OCI)](deployment/OCI.md)
- [Resiliência e Provisionamento Automático](DEPLOY_OCI.md)

### 📖 [Manuais e Referências](manuals/README.md)
- [Manual de Integração LicitaCon Obras (PDF)](manuals/manual-integracao-licitacon-obras.pdf)
- [Manual do Usuário TCE-RS (PDF)](manuals/manual-tce.pdf)
- [Exploração da API (Spike)](spike-tce-api.md)

### 📄 [Decisões de Arquitetura (ADR)](adr/README.md)
- [ADR 001: Remoção da Matching Layer](adr/001-remocao-matching-layer.md)

### 🔄 [Processos](process/README.md)
- Pipeline de CI/CD
- Rotinas de Manutenção de Banco

---

## 🛠️ Tecnologias Principais
- **Backend:** Node.js + TypeScript + Express
- **Frontend:** React + Tailwind CSS + MapLibre
- **Banco de Dados:** PostgreSQL
- **ETL:** Python (Pandas, SQL)
- **Infra:** Docker + OCI + GitHub Actions
