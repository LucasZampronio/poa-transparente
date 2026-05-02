# ADR 001: Remoção da Camada de Matching Fuzzy

## Status
Aceito

## Contexto
Originalmente, o projeto visava vincular todas as despesas do Portal da Transparência de Porto Alegre às obras cadastradas no TCE-RS. Para isso, utilizamos uma camada de "Matching" baseada na biblioteca `rapidfuzz`, comparando descrições de empenhos com objetos de obras.

## Problemas Identificados
1. **Inconsistência de Dados:** As descrições dos empenhos no Portal da Transparência costumam ser genéricas ("Pagamento referente a contrato..."), dificultando o vínculo automático com o objeto detalhado da obra no TCE.
2. **Falsos Positivos:** O sistema de pontuação (score) muitas vezes vinculava despesas de manutenção de rotina a obras de construção civil por semelhança de palavras-chave, distorcendo a análise de custo das obras.
3. **Escalabilidade:** O processo de fuzzy matching em N-para-N era custoso computacionalmente e atrasava o pipeline de ETL.
4. **Visibilidade Limitada:** Despesas que não eram vinculadas a obras acabavam "escondidas" das visualizações analíticas principais.

## Decisão
Decidimos descontinuar a dependência obrigatória da tabela `obra_despesa_match` para as visualizações de mapa e KPIs financeiros. Em vez disso, adotamos uma abordagem de **Desacoplamento de Entidades**:

1. **Obras** e **Despesas** agora coexistem como entidades independentes no mapa.
2. Agregações financeiras (Top Empresas, Gastos por Bairro) agora consultam diretamente a tabela `silver_despesas`, garantindo que 100% dos gastos capturados sejam contabilizados, independentemente de estarem vinculados a uma obra.
3. O vínculo obra-despesa permanece apenas como uma funcionalidade opcional e informativa, quando houver alta confiança (ID de contrato explícito).

## Consequências
- **Positivas:** 
    - Maior precisão nos KPIs financeiros totais.
    - Simplificação do código de ETL.
    - Visualização mais rica no mapa (usuários podem ver tanto as obras quanto os gastos pulverizados).
- **Negativas:** 
    - Perda da visão "Custo Real vs Custo Licitado" para algumas obras onde o match automático falha. Isso será mitigado no futuro com o uso de chaves naturais (número do contrato/processo) em vez de fuzzy matching de texto.
