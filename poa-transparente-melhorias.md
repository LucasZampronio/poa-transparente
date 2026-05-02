# POA Transparente — Melhorias de Estudo

## Crítico — Segurança

- **Credenciais no `docker-compose.yml`**: `PORTAL_TRANSPARENCIA_API_KEY` e JWT estão hardcoded. Mover para `.env` (já no `.gitignore`) e criar `.env.example` como template.
- **Endpoints de sync sem autenticação**: `/api/sync/*` estão expostos sem qualquer auth. Adicionar middleware JWT básico.

---

## Alta Prioridade — Qualidade

### Backend (Node.js / TypeScript)

- **Sem testes**: nenhum unitário ou de integração. Adicionar Jest + Supertest para os controllers é o ponto mais impactante para aprendizado.
- **Error handling genérico**: todos os controllers usam `catch (error: any) { res.status(500)... }`. Implementar um middleware centralizado de erro com logging estruturado (Pino ou Winston).
- **Prometheus não instrumentado**: `prom-client` está no `package.json` mas nunca usado. O endpoint `/metrics` existe mas não retorna nada útil. Vale instrumentar com contadores e histogramas de latência.

### ETL (Python)

- **`except: break` silencioso** em `ingestion/tce.py`: engole todos os erros sem logar nada — impossível debugar em produção.
- **Sem pooling de conexões**: `get_connection()` abre uma nova conexão por operação. Usar `psycopg2.pool.SimpleConnectionPool`.
- **Agregações do Gold sem transação explícita**: se uma falhar, dados parciais ficam no banco.

### Frontend (React)

- **Sem `<ErrorBoundary>`**: se a API falhar, o dashboard inteiro quebra.
- **Cálculos de ranking no cliente**: cálculos pesados no `useMemo` que já existem prontos na camada Gold do banco. Mover para o backend.

---

## Média Prioridade — Arquitetura

- **Tabela `public_expenses` deprecated**: ainda recebe writes e tem queries no código — duas fontes de verdade para os mesmos dados.
- **`company_cache` table não definida**: referenciada no código mas ausente nos arquivos `.sql`. Causa erro em runtime se o banco for recriado do zero.
- **Typo no MCP**: connection string padrão usa `poatransparente` em vez de `poa_transparente`.
- **Função `syncTceObras()` deprecated**: marcada com `@deprecated` no código da API mas ainda exposta como endpoint POST ativo.

---

## Melhorias Evolutivas — Para Aprendizado

| O que adicionar | Por que é valioso para estudar |
|---|---|
| Testes com Jest / Vitest | TDD, mocking, cobertura de código |
| OpenAPI / Swagger | Documentação de APIs REST |
| Docker multi-stage build | Reduz imagem final, boas práticas de build |
| ESLint + Prettier + Black | Qualidade automatizada, pre-commit hooks |
| Redis para cache | Camada de cache, estratégias de invalidação |
| Alertas no Grafana | Observabilidade completa com alertas |
| Paginação real na API | Query performance, cursor-based vs offset |
| Zod no API (já existe no MCP) | Validação de input, type safety em runtime |

---

## Resumo

O projeto já tem uma base sólida: Medallion Architecture, separação em camadas e dados públicos reais. As melhorias mais impactantes para aprendizado são:

1. **Adicionar testes** (Jest + Supertest / Vitest)
2. **Corrigir o error handling silencioso do ETL**
3. **Remover credenciais do `docker-compose.yml`**
