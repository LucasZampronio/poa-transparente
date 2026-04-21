# POA Transparente

Plataforma de estudo para coletar, processar e visualizar dados de transparência pública com foco em clareza, análise geográfica e observabilidade com Grafana.

## Objetivo

Este projeto foi montado para simular um cenário real de produto:

- ingestão e preparação de dados públicos (ETL)
- armazenamento central em PostgreSQL
- API para consumo analítico
- interface web com mapa interativo
- monitoramento da aplicação e dataset com Prometheus + Grafana

## Arquitetura

- Python (`etl/`): geração/carga de dados sintéticos no banco
- PostgreSQL (`db/init/`): schema e persistência principal
- Node.js + TypeScript (`api/`): endpoints e métricas
- React + Vite + Leaflet (`web/`): dashboard web e mapa
- Prometheus (`monitoring/prometheus/`): scraping de métricas
- Grafana (`monitoring/grafana/`): dashboards provisionados

## Estrutura de pastas

- `api/`: serviço HTTP e métricas Prometheus
- `web/`: front-end React
- `etl/`: carga inicial de dados
- `db/init/`: script SQL de criação de tabela/índices
- `monitoring/`: Prometheus + provisão do Grafana
- `docker-compose.yml`: orquestração completa

## Pré-requisitos

- macOS, Linux ou Windows
- Docker Desktop instalado
- Docker Desktop **iniciado**
- Docker Compose v2 (já vem no Docker Desktop atual)

## Como executar (fluxo recomendado)

1. Na raiz do projeto (`poc`), subir tudo:

   `docker compose up --build`

2. Aguardar os serviços ficarem saudáveis/inicializados.

3. Acessar:

   - Web: http://localhost:5173
   - API: http://localhost:4000
   - Grafana: http://localhost:3000
   - Prometheus: http://localhost:9090

4. Login do Grafana:

   - usuário: `admin`
   - senha: `admin`

## Erro comum: Docker daemon indisponível (seu caso)

Se aparecer:

`Cannot connect to the Docker daemon at unix:///Users/<usuario>/.docker/run/docker.sock. Is the docker daemon running?`

significa que o cliente Docker existe, mas o engine não está ativo.

### Correção no macOS

1. Abrir o Docker Desktop manualmente (Applications > Docker).
2. Aguardar o status ficar "Docker Desktop is running".
3. Confirmar no terminal:

   `docker version`

   Você deve ver seções **Client** e **Server**.

4. Conferir contexto ativo:

   `docker context ls`

   O contexto `desktop-linux` normalmente deve estar ativo (`*`).

5. Testar engine:

   `docker ps`

6. Voltar para a raiz do projeto e subir novamente:

   `docker compose up --build`

### Se ainda não subir

- Reiniciar Docker Desktop
- Rodar:

  `docker context use desktop-linux`

- Validar novamente:

  `docker version && docker ps`

## Serviços do Compose

- `postgres`: banco `poa_transparente`
- `etl`: carga inicial de dados
- `api`: endpoints e métricas (`/metrics`)
- `web`: interface React
- `prometheus`: coleta da API
- `grafana`: visualização dos dashboards

## Endpoints principais da API

- `GET /health`
- `GET /metrics`
- `GET /api/summary`
- `GET /api/expenses/map`
- `GET /api/rankings/companies`
- `GET /api/rankings/agencies`
- `GET /api/timeseries`

Exemplo rápido:

`curl http://localhost:4000/api/summary`

## O que observar no Grafana

Dashboard provisionado:

- `POA Transparente - Observabilidade`

Métricas úteis para estudo:

- throughput de requests da API
- latência p95
- distribuição por rota/status
- valor total de gastos carregados
- quantidade total de registros

## Prometheus (consultas úteis)

- `sum(rate(poa_api_requests_total[1m]))`
- `histogram_quantile(0.95, sum(rate(poa_api_request_duration_seconds_bucket[5m])) by (le))`
- `poa_total_expense_value`
- `poa_total_expense_rows`

## Parar e limpar ambiente

Parar containers:

`docker compose down`

Parar e remover volumes:

`docker compose down -v`

## Troubleshooting adicional

- Porta em uso: ajustar portas no `docker-compose.yml`
- Front não carrega dados: verificar `VITE_API_URL` e status do serviço `api`
- API sem dados: validar logs do `etl` e tabela `public_expenses`
- Grafana sem dados: checar se Prometheus está coletando `api:4000/metrics`

## Próximos passos

- conectar ingestão real do portal da transparência
- adicionar filtros por período/órgão/categoria via query params
- incluir autenticação e controle de acesso
- criar alertas no Grafana para erro e latência

## Nota

Os dados atuais são sintéticos para estudo e validação técnica da arquitetura.
