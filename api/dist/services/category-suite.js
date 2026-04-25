import { pool } from '../db.js';
import { getBolsaFamiliaFromDb } from './portal-transparencia.js';
const PORTO_ALEGRE_BASELINE = {
    ibgeCode: '4314902',
    name: 'Porto Alegre',
    uf: 'RS',
    populationCensus2022: 1332845,
    populationEstimate2025: 1388794,
    areaKm2: 495.977,
    density2022: 2690.5,
    schooling6To14: 96.69,
    idhm2010: 0.805,
    infantMortality2023: 8.49,
    grossRevenue2024: 10386669318.45,
    grossExpenditure2024: 11520368235.01,
    gdpPerCapita2023: 78586.94,
};
const SOURCES = {
    localDataset: {
        id: 'local-dataset',
        name: 'Base Local de Contratos',
        owner: 'POA Transparente',
        access: 'live',
        summary: 'Base local do projeto com contratos, valores, orgaos, empresas, bairros e datas usadas no painel operacional.',
    },
    ibgeCities: {
        id: 'ibge-cities',
        name: 'IBGE Cidades e Estados',
        owner: 'IBGE',
        access: 'live',
        summary: 'Base consolidada com populacao, escolarizacao, IDHM, mortalidade infantil, receitas, despesas e PIB per capita.',
        url: 'https://www.ibge.gov.br/cidades-e-estados/rs/porto-alegre.html',
    },
    ibgeLocalidades: {
        id: 'ibge-localidades',
        name: 'IBGE API de Localidades',
        owner: 'IBGE',
        access: 'open-source',
        summary: 'API oficial para identificacao territorial, codigos IBGE e hierarquias geograficas.',
        url: 'https://servicodados.ibge.gov.br/api/docs/localidades',
    },
    sidra: {
        id: 'sidra',
        name: 'SIDRA API',
        owner: 'IBGE',
        access: 'open-source',
        summary: 'API oficial do banco agregado do IBGE para indicadores municipais e tabelas estatisticas.',
        url: 'https://apisidra.ibge.gov.br/',
    },
    datasus: {
        id: 'datasus',
        name: 'DATASUS / TABNET',
        owner: 'Ministerio da Saude',
        access: 'open-source',
        summary: 'Conjunto oficial de informacoes de saude com estatisticas vitais, morbidade, internacoes, imunizacao e indicadores municipais.',
        url: 'https://datasus.saude.gov.br/informacoes-de-saude-tabnet/',
    },
    openDataSus: {
        id: 'open-data-sus',
        name: 'Dados Abertos do SUS',
        owner: 'Ministerio da Saude',
        access: 'open-source',
        summary: 'Portal aberto com datasets e APIs para CNES, UBS, hospitais, leitos e outros temas de saude.',
        url: 'https://dadosabertos.saude.gov.br',
    },
    inep: {
        id: 'inep',
        name: 'Indicadores Educacionais / Ideb',
        owner: 'INEP',
        access: 'open-source',
        summary: 'Base oficial para censo escolar, indicadores educacionais, fluxo, infraestrutura e desempenho por municipio.',
        url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb',
    },
    siconfi: {
        id: 'siconfi',
        name: 'Siconfi API',
        owner: 'Tesouro Nacional',
        access: 'open-source',
        summary: 'API aberta em JSON com receitas, despesas, resultados fiscais e matriz contabil para estados e municipios.',
        url: 'https://www.tesourotransparente.gov.br/consultas/consultas-siconfi/siconfi-api-de-dados-abertos',
    },
    transparencyApi: {
        id: 'transparency-api',
        name: 'Portal da Transparencia API',
        owner: 'CGU',
        access: 'api-key',
        summary: 'API oficial com beneficios ao cidadao, despesas, convenios, contratos, emendas, licitacoes e outras consultas federais.',
        url: 'https://portaldatransparencia.gov.br/api-de-dados',
    },
    obrasGov: {
        id: 'obras-gov',
        name: 'Obrasgov.br',
        owner: 'MGI',
        access: 'open-source',
        summary: 'API livre para projetos de investimento, georreferenciamento e execucao fisica de obras.',
        url: 'https://www.gov.br/conecta/catalogo/apis/consulta-cadastro-integrado-de-projetos-de-investimentos-2013-obrasgov.br',
    },
    snis: {
        id: 'snis',
        name: 'SNIS / SINISA',
        owner: 'Ministerio das Cidades',
        access: 'open-source',
        summary: 'Base nacional de saneamento com indicadores de agua, esgoto, residuos e drenagem para analise municipal.',
        url: 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/pmss/snis',
    },
    prf: {
        id: 'prf',
        name: 'Dados Abertos da PRF',
        owner: 'Policia Rodoviaria Federal',
        access: 'open-source',
        summary: 'Arquivos abertos mensais de acidentes e multas em rodovias federais.',
        url: 'https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos/dados-abertos-da-prf',
    },
    wsDenatran: {
        id: 'ws-denatran',
        name: 'WSDenatran',
        owner: 'Senatran / Serpro',
        access: 'conecta',
        summary: 'Servico oficial para veiculos, condutores e infracoes mediante autorizacao e contratacao.',
        url: 'https://www.gov.br/conecta/catalogo/apis/wsdenatran',
    },
    cadUnico: {
        id: 'cadunico',
        name: 'CadUnico - Indicadores Familiares',
        owner: 'MDS',
        access: 'conecta',
        summary: 'API do CadUnico com faixa de renda, local de domicilio, idade e Bolsa Familia, com restricao de acesso para municipios.',
        url: 'https://www.gov.br/conecta/catalogo/apis/cadunico-servicos-indicadores-familiares',
    },
    cns: {
        id: 'cns',
        name: 'CNS - Cartao Nacional de Saude',
        owner: 'Ministerio da Saude',
        access: 'conecta',
        summary: 'Integracao cadastral do CadSUS para sistemas estaduais e municipais de saude.',
        url: 'https://www.gov.br/conecta/catalogo/apis/cadsus-cadastro-de-usuarios-do-sus',
    },
};
const CATEGORY_META = {
    saude: {
        key: 'saude',
        label: 'Saude',
        summary: 'Painel municipal de contexto social, mortalidade, capacidade instalada e financiamento do setor saude.',
        rationale: 'A leitura do setor combina panorama demografico do municipio, pressao assistencial e estrutura da rede para orientar financiamento e acesso.',
    },
    educacao: {
        key: 'educacao',
        label: 'Educacao',
        summary: 'Painel municipal de acesso, fluxo, aprendizagem, infraestrutura escolar e financiamento educacional.',
        rationale: 'A leitura do setor cruza tamanho da rede, permanencia, desempenho e capacidade de oferta para sustentar metas do sistema municipal.',
    },
    mobilidade: {
        key: 'mobilidade',
        label: 'Mobilidade',
        summary: 'Painel municipal de deslocamento, seguranca viaria, obras e pressao territorial sobre a rede urbana.',
        rationale: 'O setor exige ver o territorio, os tempos de deslocamento e o risco viario junto com a execucao fisica dos contratos.',
    },
    infraestrutura: {
        key: 'infraestrutura',
        label: 'Infraestrutura',
        summary: 'Painel municipal de obras, saneamento, cobertura territorial e capacidade de investimento urbano.',
        rationale: 'Infraestrutura precisa ser lida como combinacao de investimento, expansao de cobertura e manutencao da cidade.',
    },
    'assistencia-social': {
        key: 'assistencia-social',
        label: 'Assistencia Social',
        summary: 'Painel municipal de vulnerabilidade, protecao de renda, rede socioassistencial e resposta territorial.',
        rationale: 'A leitura do setor prioriza renda, cobertura de programas e capilaridade territorial da rede de protecao.',
    },
};
const CATEGORY_PATTERNS = {
    saude: ['saude', 'saaode', 'saode'],
    educacao: ['educacao', 'educaaao', 'educaao'],
    mobilidade: ['mobilidade'],
    infraestrutura: ['infraestrutura'],
    'assistencia-social': [
        'assistencia-social',
        'assistancia-social',
        'assistaencia-social',
        'assistaancia-social',
    ],
};
function normalizeCategoryKey(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z]+/g, '-')
        .replace(/^-|-$/g, '');
}
function canonicalCategoryKey(value) {
    const normalized = normalizeCategoryKey(value);
    for (const [key, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        if (patterns.some((pattern) => normalized === pattern || normalized.includes(pattern))) {
            return key;
        }
    }
    return normalized;
}
function resolveCategoryMeta(category) {
    const normalized = canonicalCategoryKey(category);
    if (normalized === 'saude')
        return CATEGORY_META.saude;
    if (normalized === 'educacao')
        return CATEGORY_META.educacao;
    if (normalized === 'mobilidade')
        return CATEGORY_META.mobilidade;
    if (normalized === 'infraestrutura')
        return CATEGORY_META.infraestrutura;
    if (normalized === 'assistencia-social')
        return CATEGORY_META['assistencia-social'];
    return {
        key: normalized,
        label: category,
        summary: 'Suite municipal estruturada para leitura de indicadores, contexto e execucao do setor.',
        rationale: 'O setor selecionado ainda nao possui um modelo dedicado e usa o pacote analitico padrao.',
    };
}
function toNumber(value) {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string')
        return Number(value);
    return 0;
}
async function getCategoryOverview(category) {
    const overviewResult = await pool.query(`
      SELECT
        COALESCE(SUM(contract_value), 0) AS total_spent,
        COUNT(*)::int AS contracts_count,
        COUNT(DISTINCT agency)::int AS agencies_count,
        COUNT(DISTINCT company_name)::int AS companies_count,
        COUNT(DISTINCT district)::int AS districts_count,
        COALESCE(AVG(contract_value), 0) AS avg_contract_value,
        COALESCE(SUM(bidding_count), 0)::int AS bidding_volume
      FROM public_expenses
      WHERE category = $1
    `, [category]);
    const topAgencyResult = await pool.query(`
      SELECT agency, ROUND(SUM(contract_value)::numeric, 2) AS total_spent
      FROM public_expenses
      WHERE category = $1
      GROUP BY agency
      ORDER BY total_spent DESC
      LIMIT 1
    `, [category]);
    const overviewRow = overviewResult.rows[0] ?? {};
    const topAgencyRow = topAgencyResult.rows[0];
    return {
        totalSpent: toNumber(overviewRow.total_spent),
        contractsCount: toNumber(overviewRow.contracts_count),
        agenciesCount: toNumber(overviewRow.agencies_count),
        companiesCount: toNumber(overviewRow.companies_count),
        districtsCount: toNumber(overviewRow.districts_count),
        avgContractValue: toNumber(overviewRow.avg_contract_value),
        biddingVolume: toNumber(overviewRow.bidding_volume),
        topAgency: topAgencyRow?.agency ?? null,
        topAgencySpent: toNumber(topAgencyRow?.total_spent),
    };
}
async function getTerritorialBreakdown(category) {
    const result = await pool.query(`
      SELECT
        district,
        COUNT(*)::int AS contracts_count,
        ROUND(SUM(contract_value)::numeric, 2) AS total_spent
      FROM public_expenses
      WHERE category = $1
      GROUP BY district
      ORDER BY total_spent DESC
      LIMIT 6
    `, [category]);
    return result.rows.map((row) => ({
        district: row.district,
        contractsCount: toNumber(row.contracts_count),
        totalSpent: toNumber(row.total_spent),
    }));
}
async function getTopCompanies(category) {
    const result = await pool.query(`
      SELECT company_name, ROUND(SUM(contract_value)::numeric, 2) AS total_received
      FROM public_expenses
      WHERE category = $1
      GROUP BY company_name
      ORDER BY total_received DESC
      LIMIT 5
    `, [category]);
    return result.rows.map((row) => ({
        companyName: row.company_name,
        totalReceived: toNumber(row.total_received),
    }));
}
async function getMonthlySeries(category) {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', reference_date), 'YYYY-MM') AS month,
        ROUND(SUM(contract_value)::numeric, 2) AS total_spent
      FROM public_expenses
      WHERE category = $1
      GROUP BY DATE_TRUNC('month', reference_date)
      ORDER BY DATE_TRUNC('month', reference_date)
    `, [category]);
    return result.rows.map((row) => ({
        month: row.month,
        totalSpent: toNumber(row.total_spent),
    }));
}
function buildLiveSectorIndicators(category, overview) {
    const perCapita = overview.totalSpent / PORTO_ALEGRE_BASELINE.populationEstimate2025;
    const perSquareKm = overview.totalSpent / PORTO_ALEGRE_BASELINE.areaKm2;
    return [
        {
            id: 'sector-investment',
            title: `Investimento monitorado em ${category}`,
            dimension: 'Execucao do painel',
            description: 'Valor total de contratos do setor monitorados pelo painel local.',
            unit: 'BRL',
            availability: 'live',
            sourceIds: ['localDataset'],
            value: overview.totalSpent,
            reference: 'Base local de contratos do projeto',
        },
        {
            id: 'sector-contracts',
            title: 'Contratos monitorados',
            dimension: 'Execucao do painel',
            description: 'Quantidade de contratos associados ao setor na base local.',
            unit: 'count',
            availability: 'live',
            sourceIds: ['localDataset'],
            value: overview.contractsCount,
            reference: 'Base local de contratos do projeto',
        },
        {
            id: 'sector-ticket',
            title: 'Ticket medio do contrato',
            dimension: 'Execucao do painel',
            description: 'Valor medio por contrato monitorado no setor.',
            unit: 'BRL',
            availability: 'live',
            sourceIds: ['localDataset'],
            value: overview.avgContractValue,
            reference: 'Base local de contratos do projeto',
        },
        {
            id: 'sector-investment-per-capita',
            title: 'Investimento monitorado por habitante',
            dimension: 'Leitura municipal',
            description: 'Proxy do valor monitorado no setor em relacao a populacao estimada do municipio.',
            unit: 'BRL',
            availability: 'live',
            sourceIds: ['localDataset', 'ibgeCities'],
            value: Number(perCapita.toFixed(2)),
            reference: 'Base local + populacao estimada IBGE 2025',
            formula: 'Investimento monitorado do setor / populacao estimada do municipio',
        },
        {
            id: 'sector-investment-per-km2',
            title: 'Investimento monitorado por km²',
            dimension: 'Leitura territorial',
            description: 'Proxy da intensidade territorial do investimento monitorado no setor.',
            unit: 'BRL',
            availability: 'live',
            sourceIds: ['localDataset', 'ibgeCities'],
            value: Number(perSquareKm.toFixed(2)),
            reference: 'Base local + area territorial IBGE 2024',
            formula: 'Investimento monitorado do setor / area territorial do municipio',
        },
    ];
}
function buildCommonMunicipalIndicators() {
    return [
        {
            id: 'population-census',
            title: 'Populacao no ultimo censo',
            dimension: 'Demografia',
            description: 'Populacao residente contabilizada pelo Censo 2022.',
            unit: 'people',
            availability: 'live',
            sourceIds: ['ibgeCities'],
            value: PORTO_ALEGRE_BASELINE.populationCensus2022,
            reference: 'IBGE Censo 2022',
        },
        {
            id: 'population-estimate',
            title: 'Populacao estimada',
            dimension: 'Demografia',
            description: 'Estimativa oficial recente da populacao residente.',
            unit: 'people',
            availability: 'live',
            sourceIds: ['ibgeCities'],
            value: PORTO_ALEGRE_BASELINE.populationEstimate2025,
            reference: 'IBGE 2025',
        },
        {
            id: 'density',
            title: 'Densidade demografica',
            dimension: 'Demografia',
            description: 'Relacao entre populacao residente e area territorial.',
            unit: 'density',
            availability: 'live',
            sourceIds: ['ibgeCities'],
            value: PORTO_ALEGRE_BASELINE.density2022,
            reference: 'IBGE Censo 2022',
        },
        {
            id: 'idhm',
            title: 'IDHM',
            dimension: 'Contexto social',
            description: 'Indice de desenvolvimento humano municipal.',
            unit: 'index',
            availability: 'live',
            sourceIds: ['ibgeCities'],
            value: PORTO_ALEGRE_BASELINE.idhm2010,
            reference: 'PNUD / IBGE',
        },
        {
            id: 'gdp-per-capita',
            title: 'PIB per capita',
            dimension: 'Contexto economico',
            description: 'Produto interno bruto per capita do municipio.',
            unit: 'BRL',
            availability: 'live',
            sourceIds: ['ibgeCities'],
            value: PORTO_ALEGRE_BASELINE.gdpPerCapita2023,
            reference: 'IBGE 2023',
        },
        {
            id: 'gross-revenue',
            title: 'Receita bruta realizada',
            dimension: 'Financas municipais',
            description: 'Receita bruta realizada do municipio.',
            unit: 'BRL',
            availability: 'live',
            sourceIds: ['ibgeCities', 'siconfi'],
            value: PORTO_ALEGRE_BASELINE.grossRevenue2024,
            reference: 'Siconfi / IBGE 2024',
        },
        {
            id: 'gross-expenditure',
            title: 'Despesa bruta empenhada',
            dimension: 'Financas municipais',
            description: 'Despesa bruta empenhada do municipio.',
            unit: 'BRL',
            availability: 'live',
            sourceIds: ['ibgeCities', 'siconfi'],
            value: PORTO_ALEGRE_BASELINE.grossExpenditure2024,
            reference: 'Siconfi / IBGE 2024',
        },
    ];
}
function buildHealthGroups(category, overview) {
    return [
        {
            id: 'health-context',
            title: 'Contexto demografico e social',
            description: 'Leitura de tamanho populacional, densidade urbana e condicoes socioeconomicas que pressionam a rede municipal.',
            indicators: [
                ...buildCommonMunicipalIndicators().filter((indicator) => ['population-census', 'population-estimate', 'density', 'idhm', 'gdp-per-capita'].includes(indicator.id)),
            ],
        },
        {
            id: 'health-outcomes',
            title: 'Desfechos e pressao assistencial',
            description: 'Indicadores clinicos e de acesso essenciais para acompanhar o estado de saude e a capacidade de resposta do sistema.',
            indicators: [
                {
                    id: 'infant-mortality',
                    title: 'Mortalidade infantil',
                    dimension: 'Mortalidade',
                    description: 'Obitos de menores de 1 ano por mil nascidos vivos.',
                    unit: 'per-1000',
                    availability: 'live',
                    sourceIds: ['ibgeCities', 'datasus'],
                    value: PORTO_ALEGRE_BASELINE.infantMortality2023,
                    reference: 'DATASUS / IBGE 2023',
                },
                {
                    id: 'live-births-rate',
                    title: 'Taxa de natalidade / nascidos vivos',
                    dimension: 'Natalidade',
                    description: 'Numero de nascidos vivos em relacao a populacao residente.',
                    unit: 'per-1000',
                    availability: 'open-source',
                    sourceIds: ['datasus'],
                    value: null,
                    reference: 'DATASUS - Nascidos Vivos',
                    formula: 'Nascidos vivos no periodo / populacao residente x 1.000',
                    note: 'A fonte oficial esta aberta; a integracao automatica entra na proxima etapa.',
                },
                {
                    id: 'hospitalizations-sensitive-aps',
                    title: 'Internacoes sensiveis a APS',
                    dimension: 'Morbidade',
                    description: 'Internacoes potencialmente evitaveis pela atencao primaria, usadas para qualificar a rede basica.',
                    unit: 'rate',
                    availability: 'open-source',
                    sourceIds: ['datasus'],
                    value: null,
                    reference: 'DATASUS - SIH/SUS',
                    formula: 'Internacoes selecionadas / populacao de referencia',
                },
                {
                    id: 'regulated-waiting-time',
                    title: 'Tempo medio de espera regulado',
                    dimension: 'Regulacao assistencial',
                    description: 'Tempo medio entre solicitacao e execucao de atendimento regulado.',
                    unit: 'days',
                    availability: 'municipal-system',
                    sourceIds: ['datasus'],
                    value: null,
                    reference: 'SISREG / sistema municipal',
                    formula: 'Σ(data da execucao - data da solicitacao) / n',
                    note: 'Depende de base local de regulacao do municipio.',
                },
            ],
        },
        {
            id: 'health-capacity',
            title: 'Rede assistencial e financiamento',
            description: 'Capacidade instalada e esforco de financiamento combinados com a carteira atual de contratos do projeto.',
            indicators: [
                ...buildLiveSectorIndicators(category, overview).filter((indicator) => [
                    'sector-investment',
                    'sector-contracts',
                    'sector-ticket',
                    'sector-investment-per-capita',
                ].includes(indicator.id)),
                {
                    id: 'ubs-count',
                    title: 'Unidades Basicas de Saude',
                    dimension: 'Rede assistencial',
                    description: 'Quantidade de UBS cadastradas no municipio.',
                    unit: 'count',
                    availability: 'open-source',
                    sourceIds: ['openDataSus'],
                    value: null,
                    reference: 'Dados Abertos do SUS - UBS',
                    note: 'A base oficial e aberta e sera ligada na integracao seguinte.',
                },
                {
                    id: 'hospital-beds',
                    title: 'Leitos hospitalares',
                    dimension: 'Rede assistencial',
                    description: 'Leitos gerais e complementares disponiveis no municipio.',
                    unit: 'count',
                    availability: 'open-source',
                    sourceIds: ['openDataSus'],
                    value: null,
                    reference: 'Dados Abertos do SUS - Hospitais e Leitos',
                },
            ],
        },
    ];
}
function buildEducationGroups(category, overview) {
    return [
        {
            id: 'education-access',
            title: 'Acesso e contexto educacional',
            description: 'Indicadores basicos para acompanhar o tamanho do municipio, escolarizacao e contexto economico da rede.',
            indicators: [
                {
                    id: 'schooling-6-14',
                    title: 'Escolarizacao de 6 a 14 anos',
                    dimension: 'Acesso',
                    description: 'Percentual da populacao de 6 a 14 anos matriculada no ensino regular.',
                    unit: 'percent',
                    availability: 'live',
                    sourceIds: ['ibgeCities', 'inep'],
                    value: PORTO_ALEGRE_BASELINE.schooling6To14,
                    reference: 'IBGE / INEP',
                },
                ...buildCommonMunicipalIndicators().filter((indicator) => ['population-census', 'population-estimate', 'idhm', 'gdp-per-capita'].includes(indicator.id)),
            ],
        },
        {
            id: 'education-performance',
            title: 'Fluxo e aprendizagem',
            description: 'Pacote de indicadores que orienta metas de permanencia, fluxo escolar e aprendizagem da rede municipal.',
            indicators: [
                {
                    id: 'ideb',
                    title: 'Ideb municipal',
                    dimension: 'Aprendizagem',
                    description: 'Indice que combina fluxo escolar e desempenho em avaliacoes.',
                    unit: 'index',
                    availability: 'open-source',
                    sourceIds: ['inep'],
                    value: null,
                    reference: 'INEP / Ideb',
                    note: 'A fonte oficial e aberta; o endpoint municipal sera conectado na proxima etapa.',
                },
                {
                    id: 'dropout-rate',
                    title: 'Taxa de abandono',
                    dimension: 'Fluxo',
                    description: 'Percentual de estudantes que abandonam a etapa de ensino no periodo.',
                    unit: 'percent',
                    availability: 'open-source',
                    sourceIds: ['inep'],
                    value: null,
                    reference: 'INEP - Censo Escolar',
                },
                {
                    id: 'distortion-age-grade',
                    title: 'Distorcao idade-serie',
                    dimension: 'Fluxo',
                    description: 'Percentual de estudantes em atraso escolar na etapa observada.',
                    unit: 'percent',
                    availability: 'open-source',
                    sourceIds: ['inep'],
                    value: null,
                    reference: 'INEP - Indicadores Educacionais',
                },
            ],
        },
        {
            id: 'education-financing',
            title: 'Infraestrutura e financiamento',
            description: 'Leitura do esforco financeiro do municipio e da carteira atual de contratos do setor no painel.',
            indicators: [
                ...buildLiveSectorIndicators(category, overview),
                {
                    id: 'school-infrastructure',
                    title: 'Infraestrutura escolar',
                    dimension: 'Oferta',
                    description: 'Indicador de infraestrutura basica e condicoes de oferta da rede.',
                    unit: 'index',
                    availability: 'open-source',
                    sourceIds: ['inep'],
                    value: null,
                    reference: 'INEP - Indicadores Educacionais',
                },
            ],
        },
    ];
}
function buildMobilityGroups(category, overview) {
    return [
        {
            id: 'mobility-territory',
            title: 'Territorio e deslocamento',
            description: 'Leitura do espaco urbano, da densidade e das bases para medir deslocamento e pressao sobre a rede.',
            indicators: [
                ...buildCommonMunicipalIndicators().filter((indicator) => ['population-estimate', 'density', 'gdp-per-capita'].includes(indicator.id)),
                {
                    id: 'commute-time',
                    title: 'Tempo medio de deslocamento',
                    dimension: 'Deslocamento',
                    description: 'Tempo medio de deslocamento para trabalho e estudo.',
                    unit: 'minutes',
                    availability: 'open-source',
                    sourceIds: ['sidra'],
                    value: null,
                    reference: 'IBGE Censo 2022 - deslocamentos',
                    note: 'A leitura vem do Censo 2022 e entra em integracao via SIDRA/IBGE.',
                },
                {
                    id: 'transport-mode',
                    title: 'Distribuicao por meio de transporte',
                    dimension: 'Deslocamento',
                    description: 'Participacao relativa dos principais meios de transporte usados no municipio.',
                    unit: 'percent',
                    availability: 'open-source',
                    sourceIds: ['sidra'],
                    value: null,
                    reference: 'IBGE Censo 2022 - deslocamentos',
                },
            ],
        },
        {
            id: 'mobility-safety',
            title: 'Seguranca viaria e operacao',
            description: 'Indicadores operacionais para acompanhar acidentes, infracoes e condicoes de circulacao.',
            indicators: [
                {
                    id: 'prf-accidents',
                    title: 'Acidentes em rodovias federais',
                    dimension: 'Seguranca viaria',
                    description: 'Ocorrencias registradas pela PRF com atualizacao mensal.',
                    unit: 'count',
                    availability: 'open-source',
                    sourceIds: ['prf'],
                    value: null,
                    reference: 'PRF - dados abertos',
                },
                {
                    id: 'vehicle-fleet',
                    title: 'Frota, condutores e infracoes',
                    dimension: 'Operacao',
                    description: 'Consultas oficiais de frota, condutores e infracoes de transito.',
                    unit: 'count',
                    availability: 'conecta',
                    sourceIds: ['wsDenatran'],
                    value: null,
                    reference: 'WSDenatran / Senatran',
                    note: 'Exige autorizacao e contratacao junto ao Serpro.',
                },
            ],
        },
        {
            id: 'mobility-investment',
            title: 'Contratos e obras de mobilidade',
            description: 'Leitura da carteira local do painel com prioridade para intensidade territorial do investimento.',
            indicators: buildLiveSectorIndicators(category, overview),
        },
    ];
}
function buildInfrastructureGroups(category, overview) {
    return [
        {
            id: 'infra-territory',
            title: 'Cobertura urbana e escala territorial',
            description: 'Indicadores de base para leitura de extensao territorial, densidade e capacidade fiscal do municipio.',
            indicators: [
                ...buildCommonMunicipalIndicators().filter((indicator) => ['population-estimate', 'density', 'gross-revenue', 'gross-expenditure'].includes(indicator.id)),
            ],
        },
        {
            id: 'infra-saneamento',
            title: 'Saneamento e servicos urbanos',
            description: 'Indicadores de agua, esgoto, residuos e drenagem que sustentam a leitura estrutural do municipio.',
            indicators: [
                {
                    id: 'water-coverage',
                    title: 'Cobertura de abastecimento de agua',
                    dimension: 'Saneamento',
                    description: 'Percentual da populacao atendida por rede de agua.',
                    unit: 'percent',
                    availability: 'open-source',
                    sourceIds: ['snis'],
                    value: null,
                    reference: 'SNIS / SINISA',
                },
                {
                    id: 'sewage-coverage',
                    title: 'Cobertura de esgotamento sanitario',
                    dimension: 'Saneamento',
                    description: 'Percentual da populacao atendida por coleta e tratamento de esgoto.',
                    unit: 'percent',
                    availability: 'open-source',
                    sourceIds: ['snis'],
                    value: null,
                    reference: 'SNIS / SINISA',
                },
                {
                    id: 'solid-waste',
                    title: 'Manejo de residuos solidos',
                    dimension: 'Residuos',
                    description: 'Indicadores de coleta, destinacao e operacao do sistema de residuos.',
                    unit: 'index',
                    availability: 'open-source',
                    sourceIds: ['snis'],
                    value: null,
                    reference: 'SNIS / SINISA',
                },
            ],
        },
        {
            id: 'infra-investment',
            title: 'Obras e investimento monitorado',
            description: 'Execucao local do painel e fontes abertas para acompanhamento da carteira de obras municipais.',
            indicators: [
                ...buildLiveSectorIndicators(category, overview),
                {
                    id: 'works-execution',
                    title: 'Execucao fisica de obras',
                    dimension: 'Obras',
                    description: 'Projetos de investimento, georreferenciamento e andamento fisico.',
                    unit: 'count',
                    availability: 'open-source',
                    sourceIds: ['obrasGov'],
                    value: null,
                    reference: 'Obrasgov.br',
                },
            ],
        },
    ];
}
function buildSocialAssistanceGroups(category, overview) {
    return [
        {
            id: 'social-vulnerability',
            title: 'Contexto social e vulnerabilidade',
            description: 'Indicadores de base para leitura de renda, desenvolvimento humano e tamanho da demanda potencial.',
            indicators: [
                ...buildCommonMunicipalIndicators().filter((indicator) => ['population-estimate', 'idhm', 'gdp-per-capita', 'gross-expenditure'].includes(indicator.id)),
            ],
        },
        {
            id: 'social-income',
            title: 'Protecao de renda e beneficios',
            description: 'Fontes federais para monitorar beneficios ao cidadao e cobertura de programas de renda.',
            indicators: [
                {
                    id: 'bpc-beneficiaries',
                    title: 'Beneficiarios do BPC',
                    dimension: 'Beneficios',
                    description: 'Quantidade de beneficiarios e valores do BPC por municipio.',
                    unit: 'count',
                    availability: 'api-key',
                    sourceIds: ['transparencyApi'],
                    value: null,
                    reference: 'Portal da Transparencia API',
                    note: 'A consulta exige chave da API, obtida por cadastro de e-mail.',
                },
                {
                    id: 'bolsa-familia',
                    title: 'Familias do Bolsa Familia',
                    dimension: 'Beneficios',
                    description: 'Quantidade e valores de transferencias do programa por municipio.',
                    unit: 'count',
                    availability: 'api-key',
                    sourceIds: ['transparencyApi'],
                    value: null,
                    reference: 'Portal da Transparencia API',
                },
                {
                    id: 'cadunico-family-indicators',
                    title: 'Faixa de renda e perfil familiar do CadUnico',
                    dimension: 'Cadastro social',
                    description: 'Faixa de renda, local de domicilio, idade e relacao com o Bolsa Familia a partir do CadUnico.',
                    unit: 'profile',
                    availability: 'conecta',
                    sourceIds: ['cadUnico'],
                    value: null,
                    reference: 'CadUnico - Indicadores Familiares',
                    note: 'A propria pagina oficial informa que esta API nao esta disponivel para municipios.',
                },
            ],
        },
        {
            id: 'social-investment',
            title: 'Rede e investimento monitorado',
            description: 'Carteira local de contratos do projeto articulada com a leitura de despesa e protecao social.',
            indicators: buildLiveSectorIndicators(category, overview),
        },
    ];
}
function buildIndicatorGroups(category, overview) {
    const meta = resolveCategoryMeta(category);
    if (meta.key === 'saude')
        return buildHealthGroups(category, overview);
    if (meta.key === 'educacao')
        return buildEducationGroups(category, overview);
    if (meta.key === 'mobilidade')
        return buildMobilityGroups(category, overview);
    if (meta.key === 'infraestrutura')
        return buildInfrastructureGroups(category, overview);
    if (meta.key === 'assistencia-social') {
        return buildSocialAssistanceGroups(category, overview);
    }
    return [
        {
            id: 'sector-overview',
            title: 'Visao executiva',
            description: 'Resumo atual do setor monitorado no painel.',
            indicators: [...buildCommonMunicipalIndicators(), ...buildLiveSectorIndicators(category, overview)],
        },
    ];
}
function getAvailabilitySummary(groups) {
    const counters = {
        live: 0,
        'open-source': 0,
        'api-key': 0,
        conecta: 0,
        'municipal-system': 0,
    };
    groups.forEach((group) => {
        group.indicators.forEach((indicator) => {
            counters[indicator.availability] += 1;
        });
    });
    return counters;
}
function getSourceList(groups) {
    const ids = new Set();
    groups.forEach((group) => {
        group.indicators.forEach((indicator) => {
            indicator.sourceIds.forEach((sourceId) => ids.add(sourceId));
        });
    });
    return Array.from(ids)
        .map((id) => ({ key: id, ...SOURCES[id] }))
        .filter(Boolean);
}
export async function buildCategorySuite(category) {
    const [overview, territorialBreakdown, topCompanies, monthlySeries] = await Promise.all([
        getCategoryOverview(category),
        getTerritorialBreakdown(category),
        getTopCompanies(category),
        getMonthlySeries(category),
    ]);
    const meta = resolveCategoryMeta(category);
    const groups = buildIndicatorGroups(category, overview);
    if (meta.key === 'assistencia-social') {
        try {
            const records = await getBolsaFamiliaFromDb(202401, PORTO_ALEGRE_BASELINE.ibgeCode);
            if (records.length > 0) {
                const totalAmount = records.reduce((acc, curr) => acc + Number(curr.valor), 0);
                for (const group of groups) {
                    const indicator = group.indicators.find(ind => ind.id === 'bolsa-familia');
                    if (indicator) {
                        indicator.value = totalAmount;
                        indicator.unit = 'BRL';
                    }
                }
            }
        }
        catch (e) {
            console.error('Error fetching Bolsa Familia data from DB', e);
        }
    }
    return {
        municipality: {
            name: PORTO_ALEGRE_BASELINE.name,
            ibgeCode: PORTO_ALEGRE_BASELINE.ibgeCode,
            uf: PORTO_ALEGRE_BASELINE.uf,
            scope: 'A suite atual esta calibrada para Porto Alegre, coerente com a base local do projeto.',
        },
        category: {
            key: meta.key,
            label: meta.label,
            selectedValue: category,
            summary: meta.summary,
            rationale: meta.rationale,
        },
        overview: {
            totalSpent: overview.totalSpent,
            contractsCount: overview.contractsCount,
            agenciesCount: overview.agenciesCount,
            companiesCount: overview.companiesCount,
            districtsCount: overview.districtsCount,
            avgContractValue: overview.avgContractValue,
            biddingVolume: overview.biddingVolume,
            topAgency: overview.topAgency,
            topAgencySpent: overview.topAgencySpent,
        },
        municipalityBaseline: {
            populationCensus2022: PORTO_ALEGRE_BASELINE.populationCensus2022,
            populationEstimate2025: PORTO_ALEGRE_BASELINE.populationEstimate2025,
            areaKm2: PORTO_ALEGRE_BASELINE.areaKm2,
            density2022: PORTO_ALEGRE_BASELINE.density2022,
            schooling6To14: PORTO_ALEGRE_BASELINE.schooling6To14,
            idhm2010: PORTO_ALEGRE_BASELINE.idhm2010,
            infantMortality2023: PORTO_ALEGRE_BASELINE.infantMortality2023,
            grossRevenue2024: PORTO_ALEGRE_BASELINE.grossRevenue2024,
            grossExpenditure2024: PORTO_ALEGRE_BASELINE.grossExpenditure2024,
            gdpPerCapita2023: PORTO_ALEGRE_BASELINE.gdpPerCapita2023,
        },
        territorialBreakdown,
        topCompanies,
        monthlySeries,
        indicatorGroups: groups,
        availabilitySummary: getAvailabilitySummary(groups),
        sources: getSourceList(groups),
    };
}
