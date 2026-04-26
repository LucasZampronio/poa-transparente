
## 📅 25/04/2026
### 📝 O que fizemos:
Configuração do servidor MCP Mentor, ajuste da rota Bolsa Família no Backend para usar código IBGE padrão de Porto Alegre e integração dos dados do Bolsa Família no Frontend (Cards do App.tsx).

### 💡 Decisões de Software (Papo de Senior):
Convention over Configuration (código IBGE default), Paralelismo com Promise.all no Frontend, e Separação de Dados Geoespaciais de Dados Agregados (KPIs).

### 🎓 O que aprendi hoje:
O estagiário aprendeu sobre Query Parameters, operadores de valor padrão (||), tipos no TypeScript e a importância de um Diário de Bordo.

---

## 📅 26/04/2026
### 📝 O que fizemos:
Criação de uma stack de automação para provisionamento de VM ARM Always Free na Oracle Cloud (OCI). Implementamos um workflow de GitHub Actions que tenta "pescar" a instância a cada 1 hora para contornar a falta de capacidade (Out of Capacity).

### 💡 Decisões de Software (Papo de Senior):
**Resiliência em Cloud:** Optamos por usar a CLI da OCI diretamente no GitHub Actions em vez de apenas Terraform, pois a CLI permite retentativas leves e tratamento de erro de capacidade de forma mais simples para este caso de uso específico.

### 🎓 O que aprendi hoje:
Como gerenciar credenciais de nuvem de forma segura usando GitHub Secrets e como automatizar a infraestrutura (IaC) para lidar com limitações de recursos gratuitos em provedores de cloud.
