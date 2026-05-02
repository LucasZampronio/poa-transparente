# Spike: Exploração Técnica da API do TCE-RS (LicitaCon Obras)

## Objetivo
Identificar todos os endpoints disponíveis na API do TCE-RS para o órgão de Porto Alegre (CNPJ: 92963560000160) e documentar oportunidades de melhoria no dataset.

## Endpoints Descobertos e Testados

### 1. Listagem de Obras (Base)
- **URL:** `GET /orgaos/{cnpj}/obras?municipio={cod}&exercicio={ano}&page={p}&size={s}`
- **Uso Atual:** Sim.
- **Observação:** Retorna o portfólio de obras vinculadas ao exercício. O campo `idObra` é a chave para os demais endpoints.

### 2. Detalhes da Obra
- **URL:** `GET /orgaos/{cnpj}/obras/{idObra}`
- **Status:** **Disponível**
- **Camados Úteis:** `valorGarantiaObra`, `dataValidadeGarantiaObra`, `caracteristicas`, `nomesFamilias`, `localizacao`.

### 3. Medições (Execução Financeira)
- **URL:** `GET /orgaos/{cnpj}/obras/{idObra}/medicoes`
- **Status:** **Disponível**
- **Oportunidade:** Este endpoint retorna o histórico de todas as medições feitas. Contém:
  - `numeroMedicao`: Ordem da medição.
  - `dataInicioPeriodo` / `dataFimPeriodo`: Intervalo da execução.
  - `comentario`: Notas do fiscal sobre a medição (ex: diferenças de centavos, justificativas).
  - `numeroNotaFiscal`: Vínculo direto com o faturamento.
- **Ação Recomendada:** Integrar as medições na Camada Silver para mostrar a "Linha do Tempo de Execução" de cada obra.

### 4. Coordenadas Georreferenciadas
- **URL:** `GET /orgaos/{cnpj}/obras/{idObra}/coordenadas`
- **Status:** **Disponível**
- **Uso Atual:** Parcial.
- **Observação:** Retorna a latitude/longitude oficial registrada no TCE. Deve ser a fonte primária antes do fallback para Nominatim.

### 5. Responsáveis Técnicos
- **URL:** `GET /orgaos/{cnpj}/obras/{idObra}/responsaveis`
- **Status:** **Disponível** (Retornou vazio nos testes, mas o endpoint existe).

### 6. Endpoints Restritos (403 Forbidden)
Os seguintes endpoints foram identificados via engenharia reversa, mas retornam acesso negado (provavelmente exigem autenticação de jurisdicionado):
- `/eventos`: Histórico de Ordens de Início, Paralisações e Conclusões.
- `/aditivos`: Termos aditivos de valor ou prazo.
- `/anexos`: Fotos e documentos PDF.

## Conclusão do Spike
A API do TCE-RS é rica em detalhes de **execução (Medições)**. Nossa principal oportunidade de evolução é parar de olhar apenas para o "valor total" e passar a exibir o "gráfico de medições" de cada obra, permitindo ao cidadão ver exatamente em que mês a obra avançou financeiramente.

---
**Data:** 01/05/2026
**Responsável:** Tech Lead (Gemini) via Spike Task
