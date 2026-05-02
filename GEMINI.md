# POA Transparente - Diretrizes de Desenvolvimento

## 🤖 Orquestração de Agentes (Tech Lead Mode)

Este projeto possui um time de agentes especializados em `.gemini/agents/`. Ao iniciar o trabalho, o Gemini CLI deve atuar como o **Tech Lead / Orquestrador**:

- **Comando:** `gemini start-team`
- **Padrão de Execução:** O comando `start-team` sinaliza o início da sessão. O Tech Lead **não deve disparar processos automáticos** ou agentes em background ao receber este comando. Toda delegação de tarefas aos agentes (@developer, @qa e @data_scientist) deve ser feita apenas sob demanda explícita do usuário.
- **Missão:** Atuar como Mentor Senior, auxiliando o usuário no desenvolvimento e aguardando instruções para coordenação do time.
- **Regra:** Autonomia Total concedida pelo PO. O Gemini Mentor (Tech Lead) deve executar todas as tarefas e modificações de código/banco de forma autônoma, reportando apenas os resultados e o progresso.
- **Instruções Detalhadas:** Consulte `.gemini/agents/INSTRUCTIONS.md`.

## 🛠 Arquitetura de Dados (Medallion)

O projeto segue a arquitetura de medalhão para garantir rastreabilidade e performance analítica:

### 1. Camada Bronze (Raw)
- **Origem:** Dados brutos das APIs (TCE-RS, Dados Abertos POA, Portal da Transparência Federal).
- **Armazenamento:** Tabelas `portal_transparencia_raw_records` e registros iniciais.

### 2. Camada Silver (Cleansed/Typed)
- **Tabelas:** `silver_obras`, `silver_despesas`, `silver_fornecedores`.
- **Regra:** Dados limpos, normalizados e tipados. Deduplicação baseada em IDs externos ou chaves naturais.
- **LEGACY:** A tabela `public_expenses` é considerada legada e não deve ser utilizada para novas funcionalidades. Ela foi substituída pelo pipeline Silver -> Matching -> Gold.

### 3. Camada Gold (Analytical)
- **Tabelas:** `gold_obras`, `gold_despesas_por_bairro`, `gold_top_empresas`, `gold_series_temporais`.
- **Regra:** Esta camada consolida os dados de Obras (TCE-RS) e Despesas (Dados Abertos POA) de forma independente. Não há tentativa de vinculação direta entre empenhos e obras, garantindo a pureza dos dados originais.
- **Origem Obras:** Valor Licitado e Situação direto do TCE-RS.
- **Origem Despesas:** Valores pagos e fornecedores direto do Portal da Transparência de Porto Alegre.


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
