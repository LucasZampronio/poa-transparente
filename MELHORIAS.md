# Melhorias para Implementação — POA Transparente

> Documento de estudo com todas as melhorias identificadas por área.  
> Cada item inclui o arquivo afetado, o problema e a solução recomendada.

---

## Índice

1. [Backend — Node.js/TypeScript](#1-backend--nodejs--typescript)
   - [1.1 Segurança](#11-segurança)
   - [1.2 Performance](#12-performance)
   - [1.3 Arquitetura](#13-arquitetura)
   - [1.4 Qualidade de Código](#14-qualidade-de-código)
   - [1.5 Funcionalidades Ausentes](#15-funcionalidades-ausentes)
2. [Frontend — React/TypeScript](#2-frontend--reacttypescript)
   - [2.1 Performance](#21-performance)
   - [2.2 Acessibilidade (a11y)](#22-acessibilidade-a11y)
   - [2.3 Tipagem TypeScript](#23-tipagem-typescript)
   - [2.4 Estrutura de Componentes](#24-estrutura-de-componentes)
   - [2.5 Tratamento de Erros e Estados de Carregamento](#25-tratamento-de-erros-e-estados-de-carregamento)
   - [2.6 Bundle Size e Code Splitting](#26-bundle-size-e-code-splitting)
3. [ETL Pipeline — Python](#3-etl-pipeline--python)
   - [3.1 Resiliência](#31-resiliência)
   - [3.2 Qualidade de Dados](#32-qualidade-de-dados)
   - [3.3 Performance](#33-performance)
   - [3.4 Organização e Manutenibilidade](#34-organização-e-manutenibilidade)
4. [Banco de Dados — PostgreSQL](#4-banco-de-dados--postgresql)
   - [4.1 Schema e Constraints](#41-schema-e-constraints)
   - [4.2 Índices](#42-índices)
   - [4.3 Queries Gold Layer](#43-queries-gold-layer)
5. [Infraestrutura e DevOps](#5-infraestrutura-e-devops)
   - [5.1 Docker e Containers](#51-docker-e-containers)
   - [5.2 Docker Compose](#52-docker-compose)
   - [5.3 OpenBao (Secrets)](#53-openbao-secrets)
   - [5.4 Nginx](#54-nginx)
   - [5.5 Monitoramento (Prometheus/Grafana)](#55-monitoramento-prometheusgrafana)
6. [Testes](#6-testes)
7. [CI/CD](#7-cicd)
8. [Observabilidade — ETL](#8-observabilidade--etl)
9. [Tabela de Prioridades](#9-tabela-de-prioridades)

---

## 1. Backend — Node.js/TypeScript

### 1.1 Segurança

---

#### AUTH-01 — Autenticação por token simples sem expiração

**Arquivo:** `api/src/middlewares/auth.ts`  
**Problema:** O token é comparado como string plana, sem expiração, sem rotação. Qualquer token vazado é válido para sempre.

**Solução:** Substituir por JWT com expiração.

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token obrigatório' });
  }
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}
```

---

#### AUTH-02 — Sem rate limiting nos endpoints protegidos

**Arquivo:** `api/src/routes/expenses-routes.ts:18-19`  
**Problema:** `/sync/tce` e `/sync/cleanup` têm apenas autenticação por token, sem limite de requisições. Operações custosas podem ser disparadas em loop.

**Solução:** Adicionar `express-rate-limit`.

```typescript
import rateLimit from 'express-rate-limit';

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: { error: 'Muitas requisições de sync. Tente novamente em 15 minutos.' },
});

router.post('/sync/tce', syncLimiter, requireAuth, ExpensesController.syncTceObras);
router.post('/sync/cleanup', syncLimiter, requireAuth, ExpensesController.cleanup);
```

---

#### AUTH-03 — CORS sem whitelist de origens

**Arquivo:** `api/src/index.ts`  
**Problema:** `cors()` sem opções permite requisições de qualquer origem, habilitando CSRF.

**Solução:**

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
  credentials: true,
}));
```

---

#### AUTH-04 — Erros de APIs externas expostos ao cliente

**Arquivo:** `api/src/services/portal-transparencia.ts:25-28`  
**Problema:** O corpo completo do erro da API externa é retornado ao cliente, podendo conter informações sensíveis (chaves, endpoints internos).

**Solução:**

```typescript
if (!response.ok) {
  const text = await response.text();
  logger.error({ status: response.status, body: text }, 'Erro na API externa');
  throw new Error('Erro ao consultar fonte de dados externa');
}
```

---

#### AUTH-05 — Operação TRUNCATE sem auditoria

**Arquivo:** `api/src/repositories/expenses-repository.ts:150-152`  
**Problema:** `TRUNCATE TABLE ... CASCADE` deleta dados permanentemente sem log de auditoria.

**Solução:** Registrar a operação antes de executar.

```typescript
async cleanup() {
  await pool.query(`
    INSERT INTO audit_logs (operation, executed_at)
    VALUES ('TRUNCATE_SILVER', NOW())
  `);
  return pool.query('TRUNCATE TABLE silver_obras, silver_despesas CASCADE');
}
```

---

### 1.2 Performance

---

#### PERF-01 — Queries N+1 no category overview

**Arquivo:** `api/src/services/category-suite.ts:321-343`  
**Problema:** Duas queries separadas (overview + top agency) quando uma única com window function resolveria.

**Solução:** Combinar em uma query usando `ROW_NUMBER()`.

```sql
SELECT
  SUM(valor_licitado) AS total_licitado,
  COUNT(*) AS quantidade_obras,
  orgao,
  ROW_NUMBER() OVER (ORDER BY SUM(valor_licitado) DESC) AS rank
FROM silver_obras
GROUP BY orgao
ORDER BY rank
LIMIT 1;
```

---

#### PERF-02 — `getMapData()` sem paginação

**Arquivo:** `api/src/repositories/expenses-repository.ts:35-76`  
**Problema:** A query não tem `LIMIT`, podendo retornar milhares de registros e causar estouro de memória.

**Solução:**

```typescript
async getMapData(limit = 1000, offset = 0) {
  const result = await pool.query(`
    SELECT ...
    FROM ...
    ORDER BY type DESC, reference_date DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return result.rows;
}
```

---

#### PERF-03 — Sem timeout nas queries do pool

**Arquivo:** `api/src/db.ts`  
**Problema:** Queries longas travam indefinidamente, bloqueando conexões do pool.

**Solução:**

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  statement_timeout: 30_000,          // 30s por query
  idle_in_transaction_session_timeout: 10_000,
  max: 10,
});
```

---

#### PERF-04 — Sem cache nos endpoints de leitura

**Arquivo:** `api/src/repositories/expenses-repository.ts`  
**Problema:** `getSummary()`, `getTopCompanies()`, `getTopAgencies()` executam queries pesadas a cada request. Dados raramente mudam.

**Solução (mínima, sem Redis):** Adicionar headers `Cache-Control`.

```typescript
res.set('Cache-Control', 'public, max-age=300'); // 5 minutos
res.json(summary);
```

**Solução (completa):** Implementar cache em memória ou Redis com TTL de 5 minutos para cada endpoint do gold layer.

---

### 1.3 Arquitetura

---

#### ARCH-01 — Service layer com queries SQL diretas

**Arquivo:** `api/src/services/category-suite.ts`  
**Problema:** O service faz queries SQL diretamente em vez de delegar ao repository. Viola o padrão Repository e dificulta testes.

**Solução:** Extrair todas as queries para `repositories/category-repository.ts` e manter no service apenas a orquestração.

```typescript
// repositories/category-repository.ts
export const CategoryRepository = {
  getOverview: (category: string) => pool.query(`SELECT ...`, [category]),
  getTerritorialBreakdown: (category: string) => pool.query(`SELECT ...`, [category]),
};

// services/category-suite.ts
export async function buildCategorySuite(category: string) {
  const [overview, breakdown] = await Promise.all([
    CategoryRepository.getOverview(category),
    CategoryRepository.getTerritorialBreakdown(category),
  ]);
  // transformação dos dados
}
```

---

#### ARCH-02 — Controllers sem validação de entrada

**Arquivo:** `api/src/controllers/expenses-controller.ts`  
**Problema:** `req.params.id` é passado diretamente para o repository sem validar se é um inteiro positivo.

**Solução:**

```typescript
getWorkExpenses: asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido. Deve ser um inteiro positivo.' });
  }
  const expenses = await ExpensesRepository.getWorkExpenses(id);
  if (!expenses.length) {
    return res.status(404).json({ error: 'Obra não encontrada.' });
  }
  res.json(expenses);
}),
```

---

#### ARCH-03 — Sem sistema de migrations

**Impacto:** Mudanças de schema são manuais e não rastreadas. Impossível saber qual versão do schema está rodando em produção.

**Solução:** Adotar `node-pg-migrate` ou `Flyway`.

```bash
npm install node-pg-migrate
```

```json
// package.json
"scripts": {
  "migrate:up": "node-pg-migrate up",
  "migrate:down": "node-pg-migrate down"
}
```

---

### 1.4 Qualidade de Código

---

#### CODE-01 — Console.warn misturado com logger estruturado

**Arquivo:** `api/src/controllers/expenses-controller.ts:64`  
**Problema:** `console.warn()` em vez de `logger.warn()` — não aparece no formato JSON estruturado do pino.

**Solução:** Substituir todos os `console.*` por chamadas ao `logger` do pino em todos os arquivos do backend.

---

#### CODE-02 — Validação de variáveis de ambiente na inicialização

**Arquivo:** `api/src/index.ts`  
**Problema:** Se `DATABASE_URL` ou `JWT_SECRET` não estiverem definidas, o servidor sobe e falha silenciosamente na primeira query.

**Solução:**

```typescript
function validateEnv() {
  const required = ['DATABASE_URL', 'NODE_ENV', 'JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  }
}

validateEnv(); // Chamar antes de qualquer coisa
```

---

#### CODE-03 — Health check sem informações do pool

**Arquivo:** `api/src/index.ts:17`  
**Problema:** O `/health` só conta linhas no banco, sem indicar saúde da conexão.

**Solução:**

```typescript
app.get('/health', asyncHandler(async (req, res) => {
  const client = await pool.connect();
  const { rows } = await client.query('SELECT COUNT(*) AS total FROM gold_obras_com_gastos');
  client.release();
  res.json({
    status: 'ok',
    rows: rows[0].total,
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  });
}));
```

---

### 1.5 Funcionalidades Ausentes

---

#### FEAT-01 — Sem documentação OpenAPI/Swagger

**Impacto:** Contratos de API não documentados dificultam integração e manutenção.

**Solução:** Adicionar `swagger-ui-express` + `swagger-jsdoc`.

```typescript
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const spec = swaggerJsdoc({ definition: { openapi: '3.0.0', info: { title: 'POA Transparente API', version: '1.0.0' } }, apis: ['./src/routes/*.ts'] });
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
```

---

#### FEAT-02 — Sem request ID para rastreamento

**Impacto:** Impossível correlacionar logs de um request específico em produção.

**Solução:**

```typescript
import { randomUUID } from 'crypto';

app.use((req, res, next) => {
  (req as any).id = randomUUID();
  res.set('X-Request-Id', (req as any).id);
  next();
});
```

---

#### FEAT-03 — Respostas de erro sem formato padronizado

**Arquivo:** `api/src/middlewares/error-handler.ts`  
**Problema:** Algumas respostas retornam `{ error: string }`, outras `{ message: string }`, outras `{ error: { message } }`.

**Solução:** Padronizar todas as respostas de erro:

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    requestId?: string;
    timestamp: string;
  };
}
```

---

## 2. Frontend — React/TypeScript

### 2.1 Performance

---

#### FE-PERF-01 — Event listeners recriados a cada render no mapa

**Arquivo:** `web/src/components/MapPanel.tsx:179-273`  
**Problema:** Os handlers de `mouseenter`, `mouseleave` e `click` são funções novas a cada render. Com centenas de marcadores, isso cria milhares de closures desnecessárias.

**Solução:**

```typescript
const handleMarkerClick = useCallback((point: MapPoint) => {
  // lógica do click
}, [/* dependências mínimas */]);

const createMarker = useCallback((point: MapPoint) => {
  const el = document.createElement('div');
  el.addEventListener('click', () => handleMarkerClick(point));
  return el;
}, [handleMarkerClick]);
```

---

#### FE-PERF-02 — `MapPanel` não memoizado

**Arquivo:** `web/src/components/MapPanel.tsx`  
**Problema:** Componente re-renderiza quando o pai re-renderiza, mesmo sem mudança nas props.

**Solução:**

```typescript
export default React.memo(MapPanel);
```

---

#### FE-PERF-03 — `useDashboardData` recalcula tudo ao trocar setor

**Arquivo:** `web/src/hooks/useDashboardData.ts:38-110`  
**Problema:** O `useMemo` que filtra pontos tem `selectedSector` como dependência junto com dados brutos. Trocar o setor dispara recalcular toda a lista de setores disponíveis.

**Solução:** Separar os `useMemo` por responsabilidade.

```typescript
// Recalcula só quando dados mudam
const allSectors = useMemo(() => computeSectors(rawPoints), [rawPoints]);

// Recalcula só quando setor ou dados mudam
const filteredPoints = useMemo(
  () => filterBySector(rawPoints, selectedSector),
  [rawPoints, selectedSector]
);
```

---

#### FE-PERF-04 — `max` em `TimeseriesPanel` recalculado sem memo

**Arquivo:** `web/src/components/TimeseriesPanel.tsx:8`  
**Problema:** `Math.max(...rows.map(...))` executa em todo render.

**Solução:**

```typescript
const max = useMemo(
  () => Math.max(...rows.map(r => Number(r.total_spent)), 1),
  [rows]
);
```

---

#### FE-PERF-05 — Key instável com índice de array

**Arquivo:** `web/src/components/RankingPanel.tsx:24`  
**Problema:** `key={...-${idx}}` força remount quando a ordem dos itens muda.

**Solução:** Usar identificador estável:

```typescript
key={row.cnpj ?? row.orgao ?? row.description ?? idx}
```

---

### 2.2 Acessibilidade (a11y)

---

#### A11Y-01 — Marcadores do mapa inacessíveis por teclado

**Arquivo:** `web/src/components/MapPanel.tsx:155-273`  
**Problema:** Marcadores são `<div>` sem `role`, sem `tabindex`, sem suporte a teclado. Usuários de leitor de tela não conseguem interagir.

**Solução:**

```typescript
el.setAttribute('role', 'button');
el.setAttribute('tabindex', '0');
el.setAttribute('aria-label', `${point.sector}: ${point.description_detailed}`);
el.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') handleMarkerClick(point);
});
```

---

#### A11Y-02 — Botões de ícone sem label descritivo

**Arquivo:** `web/src/pages/Dashboard.tsx:215-228`  
**Problema:** Botões FAB com apenas ícone não comunicam sua função para leitores de tela.

**Solução:**

```tsx
<button aria-label="Abrir filtros" onClick={...}>
  <Filter size={20} />
</button>
<button aria-label="Abrir rankings" onClick={...}>
  <BarChart2 size={20} />
</button>
```

---

#### A11Y-03 — Divs clicáveis em vez de botões

**Arquivo:** `web/src/components/RankingPanel.tsx:23-29`  
**Problema:** `<div className="cursor-pointer">` não é focável por teclado e não tem semântica de botão.

**Solução:** Substituir por `<button>` com reset de estilos.

```tsx
<button
  className="w-full text-left cursor-pointer ..."
  onClick={() => onRowClick(row)}
>
```

---

#### A11Y-04 — Barras do gráfico sem descrição para leitores de tela

**Arquivo:** `web/src/components/TimeseriesPanel.tsx:26-32`  
**Problema:** Barras visuais sem atributo `aria-label` são invisíveis para tecnologias assistivas.

**Solução:**

```tsx
<div
  role="img"
  aria-label={`${row.month}: ${formatCurrency(row.total_spent)}`}
  title={`${row.month}: ${formatCurrency(row.total_spent)}`}
  style={{ height: `${pct}%` }}
/>
```

---

### 2.3 Tipagem TypeScript

---

#### TS-01 — Uso de `any` nos componentes de ranking

**Arquivo:** `web/src/components/RankingPanel.tsx:6,12`  
**Problema:** `rows: any[]` e `row: any` eliminam qualquer segurança de tipo.

**Solução:** Criar interface compartilhada em `web/src/types/ranking.ts`.

```typescript
export interface RankingRow {
  cnpj?: string;
  company_name?: string;
  agency?: string;
  description?: string;
  total_received?: number | string;
  total_spent?: number | string;
  type?: string;
}
```

---

#### TS-02 — `useState<any[]>` no hook principal

**Arquivo:** `web/src/hooks/useDashboardData.ts:6-8`  
**Problema:** Estado inicializado com `any[]` perde o contrato de tipo em toda a cadeia.

**Solução:**

```typescript
const [globalTopExpenses, setGlobalTopExpenses] = useState<RankingRow[]>([]);
const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
```

---

#### TS-03 — `formatCurrency` sem proteção contra `NaN`

**Arquivo:** `web/src/services/api.ts:117-125`  
**Problema:** Se uma string não numérica for passada, `Number(value)` retorna `NaN` e o `toLocaleString` exibe `NaN`.

**Solução:**

```typescript
export function formatCurrency(value: number | string): string {
  const num = Number(value);
  if (isNaN(num)) return 'R$ –';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
```

---

### 2.4 Estrutura de Componentes

---

#### COMP-01 — HTML de popup inline no MapPanel

**Arquivo:** `web/src/components/MapPanel.tsx:196-271`  
**Problema:** String HTML longa hardcoded no componente. Difícil de manter, sem suporte a sintaxe JSX.

**Solução:** Extrair para componente `MapPopupContent.tsx` e usar `ReactDOM.createRoot()` para renderizar dentro do popup do MapLibre.

---

#### COMP-02 — Ícones e cores de setor hardcoded no componente

**Arquivo:** `web/src/components/MapPanel.tsx:18-50`  
**Problema:** Configuração de temas misturada com lógica de renderização.

**Solução:** Extrair para `web/src/constants/mapConfig.ts`.

```typescript
export const SECTOR_ICONS: Record<string, string> = {
  saude: '<svg>...</svg>',
  educacao: '<svg>...</svg>',
};

export const SECTOR_COLORS: Record<string, string> = {
  saude: '#3b82f6',
  educacao: '#22c55e',
};
```

---

#### COMP-03 — Hook `useDashboardData` com múltiplas responsabilidades

**Arquivo:** `web/src/hooks/useDashboardData.ts`  
**Problema:** Fetching, filtragem, agregação e cálculo de summary em um único hook de 120 linhas.

**Solução:** Dividir em hooks menores.

```
hooks/
  useFetchDashboard.ts   ← apenas fetch e estado de loading/error
  useSectorFilter.ts     ← filtragem por setor
  useSummaryCalc.ts      ← cálculo de totais para o header
```

---

### 2.5 Tratamento de Erros e Estados de Carregamento

---

#### ERR-01 — Estado de loading sem diferenciação

**Arquivo:** `web/src/hooks/useDashboardData.ts:15-36`  
**Problema:** Flag booleana `loading` não distingue entre carga inicial, refresh e erro parcial.

**Solução:**

```typescript
type Status = 'idle' | 'loading' | 'success' | 'error';
const [status, setStatus] = useState<Status>('idle');
```

---

#### ERR-02 — ErrorBoundary com reload forçado

**Arquivo:** `web/src/components/ErrorBoundary.tsx:34`  
**Problema:** `window.location.reload()` descarta estado do usuário sem oferecer alternativa.

**Solução:** Oferecer opção de retry sem recarregar a página.

```tsx
<button onClick={() => this.setState({ hasError: false })}>
  Tentar novamente
</button>
```

---

#### ERR-03 — Sem timeout para loading infinito

**Arquivo:** `web/src/pages/Dashboard.tsx:39-49`  
**Problema:** Se a API travar, o usuário fica preso na tela de loading para sempre.

**Solução:**

```typescript
useEffect(() => {
  if (!loading) return;
  const timeout = setTimeout(() => setError('Tempo limite atingido. Tente novamente.'), 30_000);
  return () => clearTimeout(timeout);
}, [loading]);
```

---

### 2.6 Bundle Size e Code Splitting

---

#### BUNDLE-01 — MapLibre carregado no bundle principal

**Arquivo:** `web/src/components/MapPanel.tsx`  
**Problema:** MapLibre (~150KB gzip) é carregado mesmo antes do usuário interagir com o mapa.

**Solução:** Lazy-load o componente inteiro.

```typescript
// web/src/pages/Dashboard.tsx
const MapPanel = lazy(() => import('../components/MapPanel'));

// No JSX
<Suspense fallback={<MapSkeleton />}>
  <MapPanel ... />
</Suspense>
```

---

#### BUNDLE-02 — Painéis ocultos sempre renderizados

**Arquivo:** `web/src/pages/Dashboard.tsx`  
**Problema:** FilterPanel e RankingPanel estão sempre no DOM, mesmo fechados, consumindo memória.

**Solução:** Renderização condicional.

```tsx
{isFiltersOpen && <FilterPanel ... />}
{isRankingsOpen && <RankingPanel ... />}
```

---

## 3. ETL Pipeline — Python

### 3.1 Resiliência

---

#### ETL-RES-01 — `except` genérico silencia erros

**Arquivo:** `etl/sync_evolution.py:202`  
**Problema:** `except Exception as e: continue` faz o pipeline seguir adiante silenciosamente quando um registro falha. Não há como diagnosticar o problema.

**Solução:**

```python
except ValueError as e:
    logger.error("Erro de parsing no registro", extra={"index": idx, "error": str(e)})
    failed_records.append({"index": idx, "row": row, "error": str(e)})
except Exception as e:
    logger.error("Erro inesperado no registro", extra={"index": idx, "error": str(e)}, exc_info=True)
    raise
```

---

#### ETL-RES-02 — Sem retry para chamadas HTTP

**Arquivo:** `etl/ingestion/tce.py:20-43`  
**Problema:** Uma falha temporária de rede derruba o sync inteiro, sem tentativa de recuperação.

**Solução:** Usar a biblioteca `tenacity`.

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
def get_works(year: int) -> list[dict]:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()
```

---

#### ETL-RES-03 — Commit por registro (catastrófico para performance)

**Arquivo:** `etl/sync_evolution.py:132`  
**Problema:** `conn.commit()` após cada `INSERT` significa um flush para disco por linha. Para 5.000 registros, são 5.000 commits individuais.

**Solução:** Commit em lotes.

```python
BATCH_SIZE = 500

for i, work in enumerate(works_year):
    cur.execute("INSERT INTO silver_obras ...", (...))
    if (i + 1) % BATCH_SIZE == 0:
        conn.commit()
        logger.info(f"Commit: {i + 1} registros processados")

conn.commit()  # commit final do restante
```

---

#### ETL-RES-04 — TRUNCATE na gold layer sem proteção contra falha parcial

**Arquivo:** `etl/gold/aggregators.py:80`  
**Problema:** Se o script falhar após o TRUNCATE e antes de inserir os novos dados, a tabela fica vazia.

**Solução:** Usar transação explícita.

```python
with conn:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE gold_top_expenses")
        cur.execute("INSERT INTO gold_top_expenses ...")
        # O commit só acontece ao sair do bloco `with conn:`
        # Em caso de erro, o rollback é automático
```

---

#### ETL-RES-05 — Sem idempotência no sync

**Arquivo:** `etl/sync_evolution.py:103-129`  
**Problema:** Se o sync falhar no meio, ao reiniciar ele reprocessa tudo desde o início do ano, desperdiçando chamadas de API.

**Solução:** Criar tabela de controle de progresso.

```sql
CREATE TABLE IF NOT EXISTS sync_progress (
    id BIGSERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    last_external_id INT,
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    UNIQUE (sync_type, year)
);
```

```python
def get_last_synced_id(year: int) -> int | None:
    row = cur.fetchone("SELECT last_external_id FROM sync_progress WHERE sync_type='obras' AND year=%s", (year,))
    return row[0] if row else None
```

---

### 3.2 Qualidade de Dados

---

#### ETL-QD-01 — `smart_clean` remove acentos de nomes

**Arquivo:** `etl/silver/cleaners.py`  
**Problema:** `re.sub(r'[^\x20-\x7E]', '', text)` remove todos os caracteres não-ASCII, transformando "José da Silva" em "Jos da Silva".

**Solução:** Usar normalização NFKD sem remover caracteres, ou apenas normalizar espaços e capitalização.

```python
import unicodedata

def smart_clean(text: str) -> str:
    if not text:
        return ''
    text = text.strip()
    text = ' '.join(text.split())  # normaliza espaços múltiplos
    return text.upper()

def to_ascii_slug(text: str) -> str:
    """Usar apenas quando necessário slug ASCII (ex: chaves de comparação)."""
    return unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().upper()
```

---

#### ETL-QD-02 — `num_empenho` sintético não é determinístico

**Arquivo:** `etl/sync_evolution.py:191`  
**Problema:** `f"EMP-{year}-{mes}-{total_inserted}"` depende do contador `total_inserted`, que reinicia a cada sync. Re-sync cria IDs diferentes para os mesmos dados, gerando duplicatas.

**Solução:** Usar hash determinístico baseado nos dados.

```python
import hashlib

def make_empenho_id(year: int, mes: str, orgao: str, valor: str) -> str:
    key = f"{year}|{mes}|{orgao}|{valor}"
    return "EMP-" + hashlib.sha256(key.encode()).hexdigest()[:12].upper()
```

---

#### ETL-QD-03 — Sem validação do schema do CSV antes do parsing

**Arquivo:** `etl/sync_evolution.py:186-199`  
**Problema:** Se o CSV da fonte externa mudar colunas, o script falha silenciosamente com valores padrão incorretos.

**Solução:**

```python
REQUIRED_COLUMNS = ['mes', 'vlemp', 'vlliq', 'vlpag', 'nome_orgao']

def validate_csv_schema(df: pd.DataFrame) -> None:
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"CSV com schema inválido. Colunas ausentes: {missing}")
```

---

#### ETL-QD-04 — Sem validação de completude antes da agregação gold

**Arquivo:** `etl/gold/aggregators.py`  
**Problema:** Se a tabela silver estiver vazia (sync falhou), a camada gold é populada com zeros sem nenhum alerta.

**Solução:**

```python
def check_silver_health(cur) -> None:
    cur.execute("SELECT COUNT(*) FROM silver_obras")
    count = cur.fetchone()[0]
    if count == 0:
        raise RuntimeError("silver_obras está vazia — sync pode ter falhado. Abortando agregação gold.")

    cur.execute("SELECT MAX(created_at) FROM silver_obras")
    last_sync = cur.fetchone()[0]
    if last_sync and (datetime.now() - last_sync).days > 7:
        logger.warning("Dados silver com mais de 7 dias. Podem estar desatualizados.")
```

---

### 3.3 Performance

---

#### ETL-PERF-01 — N+1 de chamadas HTTP por obra

**Arquivo:** `etl/sync_evolution.py:68-70`  
**Problema:** Para cada obra, são feitas 2 chamadas HTTP adicionais (`get_responsaveis` + `get_coordinates`). Com 5 anos × ~1000 obras = ~10.000 chamadas HTTP. Com sleep de 0.5s, isso representa mais de 1 hora de sync.

**Solução a curto prazo:** Verificar cache antes de chamar a API.

```python
coord = geo_cache.get(str(ext_id))
if coord is None:
    coord = get_coordinates(ext_id)
    if coord:
        geo_cache[str(ext_id)] = coord
        save_to_geo_cache(conn, ext_id, coord)
```

**Solução a longo prazo:** Verificar se a API do TCE oferece endpoint batch ou GraphQL.

---

#### ETL-PERF-02 — CSV carregado inteiramente em memória

**Arquivo:** `etl/sync_evolution.py:172`  
**Problema:** `pd.read_csv(url)` carrega o arquivo completo em RAM. Para CSVs grandes, pode causar OOM.

**Solução:**

```python
for chunk in pd.read_csv(url, sep=';', encoding='latin-1', chunksize=5_000):
    validate_csv_schema(chunk)
    for _, row in chunk.iterrows():
        process_row(row)
    conn.commit()
```

---

### 3.4 Organização e Manutenibilidade

---

#### ETL-ORG-01 — Constantes hardcoded em múltiplos arquivos

**Problema:** `CNPJ_POA`, `MUNICIPIO_CODE`, lista de anos espalhados em `sync_evolution.py`, `tce.py` e outros.

**Solução:** Criar `etl/config.py`.

```python
import os

CNPJ_POA = os.getenv("CNPJ_POA", "92963560000160")
MUNICIPIO_CODE = os.getenv("MUNICIPIO_CODE", "431490")
SYNC_YEARS = list(range(int(os.getenv("SYNC_YEAR_START", "2022")), 2027))
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
RETRY_ATTEMPTS = int(os.getenv("RETRY_ATTEMPTS", "3"))
```

---

#### ETL-ORG-02 — Sem type hints nas funções

**Problema:** Sem anotações de tipo, é impossível saber o que cada função recebe e retorna sem ler o corpo completo.

**Solução:** Anotar todas as funções públicas.

```python
from typing import Optional

def get_coordinates(id_obra: int) -> Optional[tuple[float, float]]:
    ...

def get_works(year: int) -> list[dict]:
    ...
```

---

#### ETL-ORG-03 — Código legado sem remoção

**Problema:** Diretório `etl/utils/legacy/` contém arquivos antigos que confundem sobre o que está ativo.

**Solução:** Remover os arquivos e usar o histórico do git para recuperação se necessário. Se precisar manter por referência, adicionar `README.md` na pasta explicando que são arquivos arquivados.

---

## 4. Banco de Dados — PostgreSQL

### 4.1 Schema e Constraints

---

#### DB-01 — `external_id` aceita NULL em `silver_obras`

**Arquivo:** `data/db/init/02_silver.sql:7`  
**Problema:** `external_id INT UNIQUE` sem `NOT NULL` permite múltiplos registros com `external_id = NULL`, pois o PostgreSQL trata NULLs como distintos em constraints UNIQUE.

**Solução:**

```sql
external_id INT NOT NULL UNIQUE,
```

---

#### DB-02 — `silver_despesas` sem constraint de unicidade

**Arquivo:** `data/db/init/02_silver.sql:32-44`  
**Problema:** `num_empenho TEXT` sem UNIQUE permite duplicatas silenciosas. Agregações na gold layer dobram valores.

**Solução:**

```sql
num_empenho TEXT NOT NULL,
-- ...
CONSTRAINT uq_silver_despesas_empenho UNIQUE (num_empenho)
```

---

#### DB-03 — Sem CHECK constraints nos campos monetários e geográficos

**Arquivo:** `data/db/init/02_silver.sql`  
**Problema:** Não há validação de que valores monetários são positivos ou que coordenadas estão em faixas válidas.

**Solução:**

```sql
valor_licitado NUMERIC(14,2) CHECK (valor_licitado >= 0),
valor_total    NUMERIC(14,2) CHECK (valor_total >= 0),
latitude       NUMERIC(9,6)  CHECK (latitude  BETWEEN -90  AND 90),
longitude      NUMERIC(9,6)  CHECK (longitude BETWEEN -180 AND 180),
```

---

#### DB-04 — Sem colunas de auditoria

**Arquivo:** `data/db/init/02_silver.sql`  
**Problema:** Apenas `created_at` existe. Não há como saber quando um registro foi atualizado ou por qual sync run.

**Solução:**

```sql
created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
sync_run_id  BIGINT REFERENCES sync_runs(id),
data_issues  TEXT[]  -- ex: ARRAY['missing_coords', 'zero_value']
```

Adicionar trigger para atualizar `updated_at`:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_silver_obras_updated_at
BEFORE UPDATE ON silver_obras
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

#### DB-05 — Tabela de controle de sync runs ausente

**Problema:** Impossível responder "quando foi o último sync bem-sucedido?" ou "quantos registros foram inseridos?".

**Solução:**

```sql
CREATE TABLE IF NOT EXISTS sync_runs (
    id             BIGSERIAL PRIMARY KEY,
    sync_type      VARCHAR(50) NOT NULL,
    started_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
    finished_at    TIMESTAMP,
    status         VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    records_processed  INT DEFAULT 0,
    records_inserted   INT DEFAULT 0,
    records_failed     INT DEFAULT 0,
    error_message  TEXT
);
```

---

### 4.2 Índices

---

#### DB-IDX-01 — Índices faltantes nas colunas de join

**Arquivo:** `data/db/init/04_indexes.sql`  
**Problema:** `obra_despesa_match.obra_id` e `obra_despesa_match.despesa_id` são usados em JOINs na gold layer, mas não têm índice. Resultado: full table scan a cada agregação.

**Solução:**

```sql
CREATE INDEX idx_odm_obra_id    ON obra_despesa_match(obra_id);
CREATE INDEX idx_odm_despesa_id ON obra_despesa_match(despesa_id);
```

---

#### DB-IDX-02 — Índices faltantes em colunas temporais e de agrupamento

**Problema:** Queries de series temporais e rankings fazem GROUP BY em colunas sem índice.

**Solução:**

```sql
-- Series temporais
CREATE INDEX idx_silver_despesas_data_empenho
    ON silver_despesas(data_empenho);

-- Rankings por órgão
CREATE INDEX idx_silver_despesas_orgao_valor
    ON silver_despesas(orgao, valor_pago);

-- Agregação por bairro
CREATE INDEX idx_silver_obras_bairro_valor
    ON silver_obras(bairro, valor_licitado);

-- Busca por CNPJ
CREATE INDEX idx_silver_despesas_cnpj_valor
    ON silver_despesas(cnpj_fornecedor, valor_pago);
```

---

### 4.3 Queries Gold Layer

---

#### DB-GOLD-01 — Queries de top empresas sem LIMIT ou ORDER BY

**Arquivo:** `etl/gold/aggregators.py:56-65`  
**Problema:** A query que popula `gold_top_empresas` não tem `ORDER BY` nem `LIMIT`, retornando todas as empresas em ordem indefinida.

**Solução:** Usar window functions para ranking.

```sql
WITH ranked AS (
    SELECT
        cnpj_fornecedor,
        nome_fornecedor,
        SUM(valor_pago)         AS total_recebido,
        COUNT(*)                AS quantidade_contratos,
        ROW_NUMBER() OVER (ORDER BY SUM(valor_pago) DESC) AS posicao
    FROM silver_despesas
    WHERE cnpj_fornecedor IS NOT NULL
    GROUP BY cnpj_fornecedor, nome_fornecedor
)
INSERT INTO gold_top_empresas (cnpj, empresa, total_recebido, quantidade_contratos, posicao)
SELECT cnpj_fornecedor, nome_fornecedor, total_recebido, quantidade_contratos, posicao
FROM ranked
WHERE posicao <= 100
ON CONFLICT (cnpj) DO UPDATE SET
    total_recebido     = EXCLUDED.total_recebido,
    quantidade_contratos = EXCLUDED.quantidade_contratos,
    posicao            = EXCLUDED.posicao;
```

---

#### DB-GOLD-02 — Série temporal sem agrupamento por mês

**Arquivo:** `etl/gold/aggregators.py:45-53`  
**Problema:** Agrupa por dia (`data_empenho`), gerando ruído. Para visualização de tendência, agrupamento mensal é mais adequado.

**Solução:**

```sql
SELECT
    DATE_TRUNC('month', data_empenho)::DATE AS mes,
    SUM(valor_pago)                          AS total_gasto,
    COUNT(*)                                 AS quantidade_registros
FROM silver_despesas
WHERE data_empenho IS NOT NULL
GROUP BY DATE_TRUNC('month', data_empenho)
ORDER BY mes;
```

---

## 5. Infraestrutura e DevOps

### 5.1 Docker e Containers

---

#### INFRA-DOCKER-01 — Todos os containers rodando como root

**Arquivo:** `api/Dockerfile`, `web/Dockerfile`, `etl/Dockerfile`  
**Problema:** Sem diretiva `USER`, o processo dentro do container roda como root. Se houver exploração de vulnerabilidade, o atacante tem privilégio máximo.

**Solução (exemplo para API):**

```dockerfile
# Criar usuário não-privilegiado
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Mudar ownership dos arquivos
RUN chown -R appuser:appgroup /app

# Trocar para usuário não-privilegiado
USER appuser
```

---

#### INFRA-DOCKER-02 — Sem HEALTHCHECK nos Dockerfiles

**Problema:** Docker não sabe se o processo dentro do container está saudável, apenas se está em execução.

**Solução:**

```dockerfile
# api/Dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# web/Dockerfile
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:80 || exit 1
```

---

#### INFRA-DOCKER-03 — Versão do Python sem pin completo

**Arquivo:** `etl/Dockerfile:1`  
**Problema:** `python:3.12-slim` usa o patch mais recente disponível no momento do build. Builds diferentes podem usar versões diferentes.

**Solução:**

```dockerfile
FROM python:3.12.7-slim
```

---

### 5.2 Docker Compose

---

#### INFRA-DC-01 — Credenciais padrão hardcoded

**Arquivo:** `docker-compose.yml:6-8,92`  
**Problema:** Fallback `:-poa` e `:-admin` são credenciais fracas que acabam sendo usadas em ambientes sem `.env`.

**Solução:** Remover os fallbacks. Se não houver variável de ambiente, o compose deve falhar com erro claro.

```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER:?POSTGRES_USER is required}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
```

---

#### INFRA-DC-02 — Portas internas expostas ao host desnecessariamente

**Arquivo:** `docker-compose.yml`  
**Problema:** PostgreSQL (5432), OpenBao (8200) e Prometheus (9090) expostos ao host são vetores de ataque desnecessários.

**Solução:** Em produção, expor apenas as portas que o usuário final precisa acessar (80/443). Usar rede interna Docker para comunicação entre serviços.

```yaml
networks:
  internal:
    driver: bridge
    internal: true  # sem acesso externo
  public:
    driver: bridge

services:
  postgres:
    networks: [internal]
    # sem ports expostas
  api:
    networks: [internal, public]
    ports: ["4000:4000"]  # apenas em dev
```

---

#### INFRA-DC-03 — Sem limites de recursos

**Problema:** Qualquer container pode consumir toda a RAM/CPU do host.

**Solução:**

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
  etl:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
  postgres:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

#### INFRA-DC-04 — Ausência de arquivo `.env.example`

**Problema:** Desenvolvedores novos no projeto não sabem quais variáveis de ambiente são necessárias.

**Solução:** Criar `.env.example` na raiz com todos os valores documentados (sem valores reais).

```bash
# Banco de dados
POSTGRES_USER=poa
POSTGRES_PASSWORD=CHANGE_ME
DATABASE_URL=postgresql://poa:CHANGE_ME@postgres:5432/poa_transparente

# API
NODE_ENV=production
JWT_SECRET=CHANGE_ME_MIN_32_CHARS
ALLOWED_ORIGINS=http://localhost:5173

# Secrets Manager
BAO_ADDR=http://openbao:8200
BAO_TOKEN=CHANGE_ME

# Monitoramento
GF_ADMIN_PASSWORD=CHANGE_ME

# APIs externas
PORTAL_TRANSPARENCIA_API_KEY=CHANGE_ME
CONECTA_GOV_TOKEN=CHANGE_ME
```

---

### 5.3 OpenBao (Secrets)

---

#### INFRA-BAO-01 — TLS completamente desabilitado

**Arquivo:** `infra/openbao/config/bao.hcl:7`  
**Problema:** `tls_disable = 1` faz todos os secrets trafegarem em texto plano na rede.

**Solução para desenvolvimento:** Manter apenas para dev local com comentário explícito.  
**Solução para produção:** Gerar certificados TLS e habilitar.

```hcl
# Apenas para desenvolvimento local!
# NUNCA usar em produção
tls_disable = 1
```

---

#### INFRA-BAO-02 — Memory locking desabilitado

**Arquivo:** `infra/openbao/config/bao.hcl:11`  
**Problema:** `disable_mlock = true` permite que secrets sejam paginados para disco (swap), onde podem ser recuperados por atacantes.

**Solução:** Habilitar mlock em produção (requer `IPC_LOCK` capability, já presente no compose).

```hcl
disable_mlock = false
```

---

### 5.4 Nginx

---

#### INFRA-NGINX-01 — Headers de segurança ausentes

**Arquivo:** `infra/nginx/nginx.conf`  
**Problema:** Sem headers básicos de segurança, o browser não tem instruções de proteção.

**Solução:**

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
server_tokens off;
```

---

#### INFRA-NGINX-02 — Sem compressão gzip

**Problema:** Respostas JSON e assets estáticos não são comprimidos, aumentando o tempo de carregamento.

**Solução:**

```nginx
gzip on;
gzip_types text/plain application/json application/javascript text/css;
gzip_min_length 1000;
gzip_comp_level 5;
```

---

#### INFRA-NGINX-03 — Sem limite de tamanho de body

**Problema:** Sem `client_max_body_size`, uploads arbitrariamente grandes são aceitos.

**Solução:**

```nginx
client_max_body_size 1m;
```

---

### 5.5 Monitoramento (Prometheus/Grafana)

---

#### MON-01 — Intervalo de scrape muito agressivo

**Arquivo:** `infra/monitoring/prometheus/prometheus.yml`  
**Problema:** `scrape_interval: 5s` gera 720 pontos por hora por métrica. Para dados de negócio que mudam devagar, é excessivo e pode degradar o banco de séries temporais.

**Solução:**

```yaml
global:
  scrape_interval: 30s     # padrão razoável
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'poa-api'
    scrape_interval: 15s   # mais frequente para métricas de latência
    static_configs:
      - targets: ['api:4000']
```

---

#### MON-02 — Sem alertas configurados

**Problema:** Prometheus coleta métricas mas não dispara alertas para falhas críticas.

**Solução:** Criar `infra/monitoring/prometheus/alerts.yml`.

```yaml
groups:
  - name: poa-transparente
    rules:
      - alert: ApiDown
        expr: up{job="poa-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API POA Transparente está fora do ar"

      - alert: HighErrorRate
        expr: rate(poa_api_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Taxa de erros 5xx acima de 10%"
```

---

## 6. Testes

---

#### TEST-01 — `category-suite.ts` excluída da cobertura

**Arquivo:** `jest.config.js:28`  
**Problema:** O maior arquivo do backend (1122 linhas de lógica de negócio) está explicitamente excluído da cobertura de testes, criando falsa confiança nos 100% reportados.

**Solução:** Remover a exclusão e criar testes para os cenários principais de `buildCategorySuite`.

---

#### TEST-02 — Testes de integração cobrem apenas 3 de ~10 endpoints

**Arquivo:** `test/integration/api.test.ts`  
**Problema:** `/health`, `/api/summary` e `/api/sync/cleanup` são os únicos endpoints com testes de integração. Rankings, mapa, séries temporais e categorias não têm cobertura.

**Solução:** Adicionar ao `api.test.ts`:

```typescript
describe('GET /api/rankings/companies', () => {
  it('retorna array de empresas com campos obrigatórios', async () => {
    const res = await request(app).get('/api/rankings/companies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('empresa');
    expect(res.body[0]).toHaveProperty('total_recebido');
  });
});
```

---

#### TEST-03 — ETL Python sem nenhum teste automatizado

**Problema:** Todo o pipeline de dados (cleaners, parsers, geocoding, aggregators) é executado sem qualquer cobertura de teste automatizado.

**Solução:** Criar testes com `pytest`.

```python
# etl/tests/test_cleaners.py
import pytest
from silver.cleaners import smart_clean

def test_smart_clean_preserva_acentos():
    assert smart_clean("José da Silva") == "JOSÉ DA SILVA"

def test_smart_clean_normaliza_espacos():
    assert smart_clean("  rua   dos  andradas  ") == "RUA DOS ANDRADAS"

def test_smart_clean_string_vazia():
    assert smart_clean("") == ""
```

---

#### TEST-04 — Mocks de fetch não validam os parâmetros da requisição

**Arquivo:** `test/unit/services.test.ts:30`  
**Problema:** `jest.spyOn(global, 'fetch')` verifica que fetch foi chamado, mas não valida os headers de autenticação ou o formato da URL.

**Solução:**

```typescript
expect(fetchSpy).toHaveBeenCalledWith(
  expect.stringContaining('/api/despesas'),
  expect.objectContaining({
    headers: expect.objectContaining({
      'Authorization': expect.stringMatching(/^Bearer /),
    }),
  })
);
```

---

#### TEST-05 — Sem testes de cenários de erro nos controllers

**Problema:** Os testes de controller cobrem o happy path mas não testam respostas para IDs inválidos, banco indisponível ou dados malformados.

**Solução:** Adicionar cenários negativos.

```typescript
it('retorna 400 para ID não numérico', async () => {
  const res = await request(app).get('/api/works/abc/expenses');
  expect(res.status).toBe(400);
  expect(res.body.error).toBeDefined();
});

it('retorna 404 para obra inexistente', async () => {
  const res = await request(app).get('/api/works/999999/expenses');
  expect(res.status).toBe(404);
});
```

---

## 7. CI/CD

---

#### CICD-01 — GitHub Token exposto no ambiente SSH

**Arquivo:** `.github/workflows/deploy.yml:69`  
**Problema:** O `GITHUB_TOKEN` é passado como variável de ambiente para a sessão SSH remota, podendo aparecer em logs ou em `/proc/PID/environ`.

**Solução:** Usar deploy key (SSH key) específica para o repositório, sem passar tokens de acesso na sessão.

---

#### CICD-02 — SonarCloud não bloqueia o deploy em falha de quality gate

**Arquivo:** `.github/workflows/deploy.yml:49-59`  
**Problema:** O scan do SonarCloud roda mas o deploy continua mesmo se o quality gate falhar.

**Solução:** Adicionar wait no quality gate.

```yaml
- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@master
  with:
    args: >
      -Dsonar.qualitygate.wait=true
```

---

#### CICD-03 — Sem scan de vulnerabilidades nas imagens Docker

**Problema:** Imagens são construídas e deployadas sem verificação de CVEs nas dependências.

**Solução:** Adicionar step com Trivy.

```yaml
- name: Scan de vulnerabilidades
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'poa-api:latest'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
```

---

#### CICD-04 — Sem cache de dependências entre builds

**Arquivo:** `.github/workflows/deploy.yml:40`  
**Problema:** `npm install` baixa todas as dependências a cada build, tornando o pipeline mais lento.

**Solução:**

```yaml
- name: Cache dependências
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: ${{ runner.os }}-node-
```

---

## 8. Observabilidade — ETL

---

#### OBS-01 — Print statements em vez de logging estruturado

**Arquivo:** `etl/sync_evolution.py`  
**Problema:** `print()` vai para stdout sem estrutura, sem nível de log, sem timestamp confiável, não é persistido.

**Solução:** Substituir todos os prints por logging JSON.

```python
import logging
import json

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "ts": self.formatTime(record),
            "level": record.levelname,
            "msg": record.getMessage(),
            "component": record.name,
            **getattr(record, 'extra', {}),
        })

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger("poa-etl")
logger.addHandler(handler)
logger.setLevel(logging.INFO)
```

---

#### OBS-02 — Sem métricas de throughput do ETL

**Problema:** Impossível saber quantos registros por segundo estão sendo processados ou onde o tempo está sendo gasto.

**Solução:**

```python
import time

class SyncMetrics:
    def __init__(self):
        self.start = time.monotonic()
        self.processed = 0
        self.failed = 0
        self.api_calls = 0

    def report(self, label: str):
        elapsed = time.monotonic() - self.start
        rps = self.processed / elapsed if elapsed > 0 else 0
        logger.info("Métricas de sync", extra={
            "checkpoint": label,
            "elapsed_s": round(elapsed, 1),
            "records_processed": self.processed,
            "records_failed": self.failed,
            "api_calls": self.api_calls,
            "records_per_sec": round(rps, 2),
        })
```

---

#### OBS-03 — Sem alertas para dados obsoletos

**Problema:** Se o sync parar de funcionar, o dashboard exibe dados antigos sem nenhum aviso ao usuário.

**Solução (backend):** Incluir `last_sync_at` no endpoint `/health` e `/api/summary`.

```typescript
// api/src/repositories/expenses-repository.ts
async getLastSyncDate(): Promise<Date | null> {
  const { rows } = await pool.query(`
    SELECT MAX(finished_at) AS last_sync
    FROM sync_runs
    WHERE status = 'success'
  `);
  return rows[0]?.last_sync ?? null;
}
```

**Solução (frontend):** Exibir aviso se `last_sync_at` for maior que 24 horas.

---

## 9. Tabela de Prioridades

| Prioridade | ID | Área | Título | Complexidade |
|---|---|---|---|---|
| 🔴 Crítico | ETL-RES-03 | ETL | Batch commits (1 commit por registro) | Baixa |
| 🔴 Crítico | INFRA-BAO-01 | Infra | TLS desabilitado no OpenBao | Média |
| 🔴 Crítico | INFRA-DOCKER-01 | Infra | Containers rodando como root | Baixa |
| 🔴 Crítico | AUTH-01 | Backend | JWT com expiração | Média |
| 🔴 Crítico | AUTH-03 | Backend | CORS sem whitelist | Baixa |
| 🟠 Alto | ETL-RES-02 | ETL | Retry com backoff exponencial | Baixa |
| 🟠 Alto | ETL-RES-01 | ETL | Tratamento de exceções específicas | Baixa |
| 🟠 Alto | ETL-QD-01 | ETL | `smart_clean` remove acentos | Baixa |
| 🟠 Alto | DB-IDX-01 | Banco | Índices nas colunas de JOIN | Baixa |
| 🟠 Alto | DB-IDX-02 | Banco | Índices temporais e de agrupamento | Baixa |
| 🟠 Alto | DB-01 | Banco | `external_id NOT NULL` | Baixa |
| 🟠 Alto | DB-02 | Banco | UNIQUE em `num_empenho` | Baixa |
| 🟠 Alto | INFRA-DC-01 | Infra | Remover credenciais padrão | Baixa |
| 🟠 Alto | INFRA-DC-04 | Infra | Criar `.env.example` | Baixa |
| 🟠 Alto | INFRA-NGINX-01 | Infra | Headers de segurança no Nginx | Baixa |
| 🟠 Alto | A11Y-01 | Frontend | Marcadores do mapa acessíveis | Média |
| 🟠 Alto | A11Y-02 | Frontend | aria-label em botões de ícone | Baixa |
| 🟠 Alto | A11Y-03 | Frontend | Divs clicáveis → `<button>` | Baixa |
| 🟡 Médio | AUTH-02 | Backend | Rate limiting nos endpoints sync | Baixa |
| 🟡 Médio | PERF-02 | Backend | Paginação em `getMapData` | Baixa |
| 🟡 Médio | PERF-03 | Backend | Timeout no pool de conexões | Baixa |
| 🟡 Médio | ETL-RES-04 | ETL | TRUNCATE dentro de transação | Baixa |
| 🟡 Médio | ETL-RES-05 | ETL | Idempotência com tabela de progresso | Alta |
| 🟡 Médio | ETL-QD-02 | ETL | Hash determinístico para `num_empenho` | Baixa |
| 🟡 Médio | ETL-QD-03 | ETL | Validação de schema do CSV | Baixa |
| 🟡 Médio | DB-04 | Banco | Colunas de auditoria + trigger | Média |
| 🟡 Médio | DB-05 | Banco | Tabela `sync_runs` | Baixa |
| 🟡 Médio | TEST-01 | Testes | Remover exclusão de `category-suite` | Alta |
| 🟡 Médio | TEST-02 | Testes | Cobrir mais endpoints na integração | Média |
| 🟡 Médio | TEST-03 | Testes | Testes Python com pytest | Média |
| 🟡 Médio | FE-PERF-01 | Frontend | `useCallback` nos handlers do mapa | Baixa |
| 🟡 Médio | TS-01 | Frontend | Remover `any` nos componentes | Média |
| 🟡 Médio | INFRA-DC-02 | Infra | Rede interna Docker | Média |
| 🟡 Médio | INFRA-DC-03 | Infra | Limites de recursos | Baixa |
| 🟡 Médio | CICD-02 | CI/CD | Bloquear deploy em quality gate | Baixa |
| 🟢 Baixo | ARCH-01 | Backend | Extrair queries do service | Alta |
| 🟢 Baixo | ARCH-03 | Backend | Migrations com node-pg-migrate | Alta |
| 🟢 Baixo | FEAT-01 | Backend | Documentação OpenAPI | Média |
| 🟢 Baixo | ETL-ORG-01 | ETL | Centralizar constantes em `config.py` | Baixa |
| 🟢 Baixo | ETL-ORG-02 | ETL | Type hints em todas as funções | Média |
| 🟢 Baixo | BUNDLE-01 | Frontend | Lazy-load do MapLibre | Baixa |
| 🟢 Baixo | DB-GOLD-01 | Banco | Rankings com window functions | Média |
| 🟢 Baixo | MON-01 | Infra | Ajustar intervalo do Prometheus | Baixa |
| 🟢 Baixo | MON-02 | Infra | Criar regras de alerta | Média |
| 🟢 Baixo | CICD-03 | CI/CD | Scan de vulnerabilidades com Trivy | Baixa |
| 🟢 Baixo | OBS-01 | ETL | Logging JSON estruturado | Média |
| 🟢 Baixo | OBS-02 | ETL | Métricas de throughput | Média |

---

> **Total: 48 melhorias identificadas**  
> 🔴 Crítico: 5 | 🟠 Alto: 13 | 🟡 Médio: 18 | 🟢 Baixo: 12
