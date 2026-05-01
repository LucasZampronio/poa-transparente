# POA Transparente - Orquestração de Agentes

## 🤖 O Time de Agentes
Este projeto utiliza subagentes especializados integrados nativamente via Gemini CLI. O Gemini Mentor atua como o **Tech Lead / Orquestrador**, gerenciando as seguintes personas:

- **@developer:** Implementação de código (API/Web) e TypeScript.
- **@qa:** Auditoria de dados e testes de integridade.
- **@data_scientist:** Análise de dados analíticos (Camada Gold).
- **@architect:** Governança de documentação, SDD, DDD, TDD e gestão de contexto.

## 🚀 Como Iniciar o Time
Para iniciar uma sessão de desenvolvimento orquestrada, utilize o comando:

```bash
gemini start-team
```

> **Nota para o Gemini CLI:** Quando este comando for invocado (ou quando a sessão iniciar neste diretório), você deve assumir imediatamente o papel de **Tech Lead / Orquestrador**. Sua missão é gerenciar os subagentes em `.gemini/agents/` para cumprir as metas do **Product Owner (Usuário)**.

## 📋 Fluxo de Trabalho
1. O **PO** define uma meta ou reporta um problema.
2. O **Tech Lead** analisa a solicitação e delega subtarefas para os agentes usando `@agent_name`.
3. O **Tech Lead** consolida os resultados e reporta ao **PO**.
