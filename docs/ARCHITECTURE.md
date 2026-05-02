# Arquitetura de Dados - POA Transparente

O projeto POA Transparente utiliza uma arquitetura de dados moderna inspirada no padrão **Medallion**, focada em transparência, rastreabilidade e performance analítica.

## 🏗️ Camadas de Dados (Medallion)

### 1. Camada Bronze (Raw)
- **Objetivo:** Armazenar os dados brutos exatamente como vêm das fontes externas.
- **Fontes:** API TCE-RS, Portal da Transparência (Federal), Dados Abertos POA.
- **Tabelas:** `portal_transparencia_raw_records`.

### 2. Camada Silver (Cleansed/Typed)
- **Objetivo:** Dados limpos, normalizados e tipados.
- **Processos:** Deduplicação, correção de encoding, normalização de nomes de bairros e categorização inicial.
- **Tabelas Principais:**
  - `silver_obras`: Cadastro oficial de obras públicas.
  - `silver_despesas`: Gastos individuais empenhados e pagos.
  - `silver_fornecedores`: Dados consolidados de empresas contratadas.

### 3. Camada Gold (Analytical)
- **Objetivo:** Tabelas prontas para consumo pela API e Frontend. Contém agregações pré-calculadas.
- **Tabelas Principais:**
  - `gold_obras_com_gastos`: Obras enriquecidas com somatório de despesas relacionadas.
  - `gold_top_empresas`: Ranking de empresas por volume de recebimento.
  - `gold_gastos_por_bairro`: Agregação geográfica de investimentos.
  - `gold_series_temporais`: Evolução dos gastos ao longo do tempo.

---

## 🔄 Desacoplamento: Obras vs Despesas

Recentemente, a arquitetura evoluiu de um modelo de "Matching Forçado" para um modelo de **Desacoplamento Inteligente**.

### O Problema do Matching (Antigo)
Tentávamos vincular cada centavo de despesa a uma obra específica usando Fuzzy Matching (similaridade de texto). Isso gerava:
- Falsos positivos (vínculos incorretos).
- Complexidade excessiva no ETL.
- Dificuldade em mostrar gastos que não pertencem a "obras" (ex: serviços de manutenção contínua).

### A Solução Atual (Desacoplamento)
1. **Fontes Independentes:** Obras (TCE) e Despesas (Portal da Transparência) são tratadas como fluxos paralelos na Camada Silver.
2. **Visualização Unificada:** No mapa, ambos os datasets são exibidos. Obras aparecem como projetos estruturantes, enquanto Despesas aparecem como pontos de investimento direto.
3. **Agregação por Bairro/Órgão:** A camada Gold agora agrega gastos por Bairro e Órgão de forma direta, garantindo 100% de precisão nos números financeiros, sem depender de um match perfeito com uma obra.

---

## 🛠️ Fluxo de Dados (ETL)

1. **Extraction:** Scripts Python buscam dados via REST API e CKAN.
2. **Transformation:** 
   - Limpeza via `etl/silver/cleaners.py`.
   - Geolocalização via Cache Geográfico e Nominatim.
   - Categorização via `category-suite`.
3. **Loading:** Carga incremental nas tabelas Silver.
4. **Aggregation:** O script `etl/gold/aggregators.py` reconstrói a camada Gold após cada sincronização.
