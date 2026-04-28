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

- Python (`etl/`): Sincronização inteligente via **API LicitaCon (TCE-RS)** com enriquecimento de dados.
- PostgreSQL (`db/init/`): Schema analítico com camadas Bronze/Prata e caches de geocodificação.
- Node.js + TypeScript (`api/`): API REST integrada ao TCE-RS e ao Portal da Transparência Federal (Bolsa Família).
- Geolocalização: Coordenadas oficiais do TCE-RS + Fallback via **Nominatim (OSM)**.
- React + Vite + Leaflet (`web/`): Dashboard interativo com visualização geográfica de obras e gastos.
- Prometheus (`monitoring/prometheus/`): Scraping de métricas de performance e negócio.
- Grafana (`monitoring/grafana/`): Dashboards provisionados para observabilidade total.

## Estrutura de pastas

- `api/`: Serviço HTTP e integração com APIs de transparência.
- `web/`: Front-end React com mapas e dashboards.
- `etl/`: Scripts de carga, limpeza e enriquecimento (TCE-RS).
- `mcp/`: Servidor Model Context Protocol (IA-ready).
- `db/init/`: Scripts SQL, índices e definições de schema.
- `monitoring/`: Configurações de Prometheus e Grafana.
- `terraform/`: Infraestrutura como código para Oracle Cloud.
- `.github/workflows/`: Automação de provisionamento (OCI) e CI/CD.
- `docker-compose.yml`: Orquestração completa do ambiente local.

## Novidade: Servidor MCP (Mentor)

Implementamos um servidor baseado no **Model Context Protocol (MCP)** que permite que assistentes de IA (como Claude ou Gemini) consultem diretamente o banco de dados de transparência.

- Localização: `mcp/`
- Ferramentas: `buscar_gastos_por_bairro`, `buscar_obras_tce`, `explicar_conceito_tecnico`.

## Infraestrutura e Cloud (OCI)

O projeto conta com provisionamento automatizado na **Oracle Cloud (OCI)** usando o plano *Always Free*. Devido às restrições de capacidade da OCI, implementamos um workflow de "pesca" (retry loop) via GitHub Actions que tenta alocar instâncias ARM automaticamente.

- Consulte `DEPLOY_OCI.md` para detalhes do setup manual.
- Veja `.github/workflows/oci-provision.yml` para a automação.

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

- Expandir filtros por período/órgão/categoria via query params na interface.
- Implementar alertas automáticos no Grafana para desvios de latência e erros 5xx.
- Adicionar camada de autenticação (JWT) para endpoints administrativos.
- Integrar dados históricos de anos anteriores (pré-2022) para análise de tendências.

## Nota

Este projeto utiliza exclusivamente dados oficiais extraídos via API do Portal de Dados Abertos de Porto Alegre (SDO 2023-2026) e do Portal da Transparência do Governo Federal (Novo Bolsa Família), garantindo uma análise fiel e auditável da gestão pública.
