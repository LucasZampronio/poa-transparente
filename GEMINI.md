# POA Transparente - Diretrizes de Desenvolvimento

## 🛠 Arquitetura de Dados (Medallion)

O projeto segue a arquitetura de medalhão para garantir rastreabilidade e performance analítica:

### 1. Camada Bronze (Raw)
- **Origem:** Dados brutos das APIs (TCE-RS, Dados Abertos POA, Portal da Transparência Federal).
- **Armazenamento:** Tabelas `portal_transparencia_raw_records` e registros iniciais.

### 2. Camada Silver (Cleansed/Typed)
- **Tabelas:** `silver_obras`, `silver_despesas`, `silver_fornecedores`.
- **Regra:** Dados limpos, normalizados e tipados. Deduplicação baseada em IDs externos ou chaves naturais.
- **LEGACY:** A tabela `public_expenses` é considerada legada e não deve ser utilizada para novas funcionalidades. Ela foi substituída pelo pipeline Silver -> Matching -> Gold.

### 3. Camada Matching (Linking)
- **Tabela:** `obra_despesa_match`.
- **Lógica:** Fuzzy matching (via `rapidfuzz`) entre o objeto da obra (TCE) e o objeto da despesa (POA).
- **Fórmula de Score:** `(Similaridade Texto * 0.5) + (Similaridade Fornecedor * 0.3) + (Proximidade Valor * 0.2)`.
- **Confiança:** 
  - `Alta`: Score > 80
  - `Média`: Score 50-80
  - `Baixa`: Score < 50 (Geralmente ignorado em agregações Gold).

### 4. Camada Gold (Analytical)
- **Tabelas:** `gold_obras_com_gastos`, `gold_top_empresas`, `gold_gastos_por_bairro`, `gold_series_temporais`.
- **Regra:** Apenas estas tabelas devem ser lidas pela API em endpoints analíticos. Elas são reconstruídas periodicamente pelo ETL.

## 📡 Integrações Governamentais (Cuidado!)
Existem três fontes principais:

- **TCE-RS (LicitaCon Obras):**
  - **Uso:** Cadastro oficial de obras, medições e geolocalização.
  - **Service:** `etl/sync_evolution.py` (via API REST).
- **Portal da Transparência (CGU):**
  - **Uso:** Benefícios sociais (Bolsa Família, BPC).
  - **Auth:** Header `chave-api-dados`.
- **Portal de Dados Abertos (Porto Alegre):**
  - **Uso:** Despesas orçamentárias (Licitacon), fornecedores.
  - **Format:** CSV/JSON via API CKAN.

## 🎨 Padrões de UI (Mapa)
- **Popups:** Devem utilizar o container customizado definido em `MapPanel.tsx` (estilo dark, bordas 20px, gradients de setor).
- **CSS Overrides:** Estilos padrão do MapLibre são anulados em `styles.css` para garantir que a UI customizada não seja "envelopada" por boxes brancos.
