# POA Transparente - Diretrizes de Desenvolvimento

## 🛠 Arquitetura de Dados e APIs

### 1. Integrações Governamentais (Cuidado!)
Existem duas fontes distintas de dados federais integradas neste projeto que NÃO devem ser confundidas:

- **Portal da Transparência (CGU):**
  - **Uso:** Benefícios sociais (Bolsa Família, BPC), convênios e despesas federais.
  - **Auth:** Header `chave-api-dados`.
  - **Service:** `api/src/services/portal-transparencia.ts`.
  
- **Portal de Dados Abertos (Conecta GOV.BR):**
  - **Uso:** Catálogo geral de datasets, Censo Escolar, Frota de Veículos, etc.
  - **Auth:** Header `Authorization: Bearer <JWT_TOKEN>`.
  - **Service:** `api/src/services/conecta-dados-abertos.ts`.

### 2. Integridade e Idempotência (ETL)
Todo script de ingestão de dados deve seguir o padrão de **idempotência**:
- **Constraint Física:** A tabela `public_expenses` possui uma `UNIQUE CONSTRAINT` em `(process_number, company_name, description_detailed)`.
- **Lógica de Carga:** Sempre utilizar `ON CONFLICT (colunas) DO UPDATE` no SQL ou filtrar IDs únicos em memória antes da inserção em batch para evitar erros de duplicidade.

## 🎨 Padrões de UI (Mapa)
- **Popups:** Devem utilizar o container customizado definido em `MapPanel.tsx` (estilo dark, bordas 20px, gradients de setor).
- **CSS Overrides:** Estilos padrão do MapLibre são anulados em `styles.css` para garantir que a UI customizada não seja "envelopada" por boxes brancos.
