# Guia de Estrutura e Organização (Template IA-Ready)

Este documento define um padrão organizacional para projetos de software (focado em CRUDs) projetado para ser facilmente interpretado e executado por IAs de desenvolvimento.

## 🎯 Objetivo
Facilitar a manutenção autônoma, garantindo que qualquer IA consiga localizar responsabilidades, entender o fluxo de dados e implementar novas funcionalidades sem alucinações de arquitetura.

---

## 📂 Estrutura de Pastas Sugerida

### 1. 🏗️ Backend (`/backend` ou `/api`)
Utiliza o padrão de **Arquitetura em Camadas** para isolar responsabilidades:
- **`src/routes/`**: Define apenas os caminhos (endpoints) e vincula aos controllers.
- **`src/controllers/`**: Valida a entrada de dados (request) e formata a saída (response). Não contém lógica de negócio.
- **`src/services/`**: Onde reside a **Regra de Negócio**. Orquestra chamadas a múltiplos repositórios ou APIs externas.
- **`src/repositories/`**: Abstração do banco de dados. Contém apenas queries (SQL, ORM, etc).
- **`src/models/` ou `src/types/`**: Definição das entidades e contratos de dados.

### 2. 🎨 Frontend (`/frontend` ou `/web`)
Organizado por componentes e lógica reutilizável:
- **`src/components/`**: UI modular e puramente visual.
- **`src/pages/`**: Agrupadores de componentes que formam uma tela.
- **`src/hooks/`**: Encapsula lógica de estado e chamadas de API (ex: `useUserCRUD`).
- **`src/services/`**: Configuração de clientes HTTP (Axios/Fetch) e definição de endpoints consumidos.

### 3. ⚙️ Infraestrutura e DevOps (`/infra`)
- **`docker/`**: Arquivos de configuração de containers.
- **`scripts/`**: Automações para setup, migrações de banco ou tarefas de manutenção.
- **`.env.example`**: Documentação clara de todas as variáveis de ambiente necessárias.

---

## 🤖 Princípios para Orquestração por IA

Para que uma IA implemente este projeto com sucesso, a estrutura deve seguir estes pilares:

### 1. Naming Convention Rigoroso
- Use nomes que descrevam a função: `CreateUserRegistration.ts` em vez de `Create.ts`.
- Pastas no plural (`controllers`, `services`) para indicar coleções de módulos.

### 2. O Arquivo de Instruções (`GEMINI.md` ou `INSTRUCTIONS.md`)
Este é o "cérebro" da operação. Ele deve conter:
- **Tech Stack:** Versões exatas de linguagens e frameworks.
- **Patterns:** Declaração explícita de padrões (ex: "Sempre use Composition em vez de Inheritance").
- **Workflow:** Como a IA deve validar o código (ex: "Sempre rode os testes unitários após editar um service").

### 3. Contratos de Tipo (TypeScript/Schema)
IAs trabalham melhor com **tipagem forte**. Ter uma pasta de tipos centralizada ou schemas (Prisma, Zod, OpenAPI) permite que a IA "leia" o banco de dados e a API antes de escrever o código, reduzindo erros de integração.

---

## 🚀 Fluxo de Implementação de um Novo CRUD
Ao pedir para uma IA criar um novo recurso (ex: "Produtos"), o fluxo seguido será:
1.  **Repository:** Criar as queries de banco.
2.  **Service:** Criar a lógica de validação/negócio.
3.  **Controller:** Expor o recurso via HTTP.
4.  **Routes:** Registrar o endpoint.
5.  **Frontend Hook/Service:** Criar a ponte de comunicação.
6.  **UI:** Implementar a tela.

---
*Este guia serve como base para projetos escaláveis e preparados para a era da programação assistida por IA.*
