import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Pool } = pg;
const DIARIO_PATH = path.join(process.cwd(), '..', 'DIARIO.md');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/poatransparente',
});

const server = new McpServer({
  name: "poa-transparente-mentor",
  version: "1.3.0",
});

// Recurso: Manifesto do Projeto e Diretriz de Mentoria
server.resource(
  "projeto-contexto",
  "resource://projeto/manifesto",
  { mimeType: "text/plain" },
  async () => ({
    contents: [{
      uri: "resource://projeto/manifesto",
      text: `POA Transparente - Contexto de Desenvolvimento:
1. MISSÃO: Centralizar dados públicos de Porto Alegre em um mapa interativo.
2. DINÂMICA DE TRABALHO: O usuário é um ESTAGIÁRIO. O Gemini é um PROGRAMADOR SENIOR/MENTOR.
3. REGRAS DE OURO:
   - Nunca apenas jogue o código; explique o raciocínio.
   - Discuta padrões de projeto (Clean Code, SOLID, etc).
   - Faça Code Reviews pedagógicos: aponte o erro, explique o porquê e mostre a solução.
   - Trate o estagiário com paciência e clareza, assumindo que conceitos básicos precisam de explicação.`
    }]
  })
);

// Ferramenta: Registrar Progresso Diário (O Diário do Estagiário)
server.tool(
  "registrar_progresso_diario",
  "Salva o resumo do dia, decisões tomadas e conceitos aprendidos no arquivo DIARIO.md",
  { 
    resumo: z.string().describe("Resumo das tarefas realizadas"),
    decisões: z.string().describe("Principais decisões técnicas tomadas"),
    aprendizado: z.string().describe("Conceitos que o estagiário aprendeu hoje")
  },
  async ({ resumo, decisões, aprendizado }) => {
    const data = new Date().toLocaleDateString('pt-BR');
    const entrada = `
## 📅 ${data}
### 📝 O que fizemos:
${resumo}

### 💡 Decisões de Software (Papo de Senior):
${decisões}

### 🎓 O que aprendi hoje:
${aprendizado}

---
`;
    try {
      await fs.appendFile(DIARIO_PATH, entrada);
      return {
        content: [{ type: "text", text: "Progresso registrado com sucesso no DIARIO.md! Bom descanso, estagiário." }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Erro ao salvar diário: ${error}` }]
      };
    }
  }
);

// Ferramenta: Explicar Conceito Técnico
server.tool(
  "explicar_conceito_tecnico",
  "Explica um termo ou padrão de software de forma simples para o estagiário",
  { termo: z.string() },
  async ({ termo }) => {
    return {
      content: [{ type: "text", text: `Vou preparar uma explicação de 'Senior para Estagiário' sobre: ${termo}.` }]
    };
  }
);

// Ferramenta: Buscar Gastos por Bairro
server.tool(
  "buscar_gastos_por_bairro",
  "Consulta no banco de dados os gastos públicos em um bairro específico",
  { bairro: z.string() },
  async ({ bairro }) => {
    try {
      const result = await pool.query(
        'SELECT agency, company_name, category, contract_value, reference_date FROM public_expenses WHERE district ILIKE $1 LIMIT 10',
        [`%${bairro}%`]
      );
      if (result.rows.length === 0) return { content: [{ type: "text", text: "Nada encontrado." }] };
      const formatted = result.rows.map(r => `- ${r.agency}: R$ ${r.contract_value}`).join('\n');
      return { content: [{ type: "text", text: `Dados brutos para análise:\n${formatted}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: "Erro na query." }] };
    }
  }
);

// Ferramenta: Buscar Obras TCE (Direto da API)
server.tool(
  "buscar_obras_tce",
  "Consulta a API oficial do TCE-RS para buscar obras públicas reais em Porto Alegre",
  { ano: z.number().describe("Ano de exercício (ex: 2024)") },
  async ({ ano }) => {
    const CNPJ_POA = "92963560000160";
    const MUNICIPIO_CODE = "88301";
    const url = `https://portal.tce.rs.gov.br/api/obras/v1/orgaos/${CNPJ_POA}/obras?municipio=${MUNICIPIO_CODE}&exercicio=${ano}&page=0&size=5`;

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Gemini Mentor)" }
      });
      
      if (!response.ok) {
        return { content: [{ type: "text", text: `Erro na API do TCE: ${response.statusText}` }] };
      }

      const data: any = await response.json();
      const works = data.content || [];
      
      if (works.length === 0) {
        return { content: [{ type: "text", text: `Nenhuma obra encontrada para o ano ${ano}.` }] };
      }

      const formatted = works.map((w: any) => 
        `- ID: ${w.idObra} | Objeto: ${w.descricaoObjeto?.substring(0, 100)}... | Valor Garantia: R$ ${w.valorGarantiaObra || 'N/A'}`
      ).join('\n');

      return { 
        content: [{ 
          type: "text", 
          text: `Resultados em tempo real do TCE-RS (${ano}):\n${formatted}\n\nNota de Mentor: Estes dados vêm direto do Tribunal de Contas. No banco local, nós multiplicamos o valor da garantia por 20 para estimar o valor total.` 
        }] 
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Erro na requisição: ${error}` }] };
    }
  }
);

// Ferramenta: Sincronizar Obras TCE
server.tool(
  "sincronizar_obras_tce",
  "Dispara a sincronização de obras do TCE-RS para o banco de dados local",
  { ano: z.number().default(2024) },
  async ({ ano }) => {
    try {
      const response = await fetch('http://localhost:4000/api/sync/tce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: ano })
      });
      const data: any = await response.json();
      if (data.success) {
        return { content: [{ type: "text", text: `Sucesso! Sincronizadas ${data.count} obras para o ano ${ano}.` }] };
      }
      return { content: [{ type: "text", text: `Falha na sincronização: ${data.error}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Erro ao conectar com a API: ${error}. Certifique-se que o backend está rodando na porta 4000.` }] };
    }
  }
);

// Ferramenta: Verificar Duplicatas
server.tool(
  "verificar_duplicatas",
  "Verifica se existem obras duplicadas no banco de dados com base no número do processo, empresa e descrição.",
  {},
  async () => {
    try {
      const result = await pool.query(`
        SELECT process_number, company_name, COUNT(*) 
        FROM public_expenses 
        GROUP BY process_number, company_name, description_detailed 
        HAVING COUNT(*) > 1
      `);
      
      if (result.rows.length === 0) {
        return { content: [{ type: "text", text: "✅ Nenhuma duplicata encontrada. A integridade dos dados está garantida!" }] };
      }

      const formatted = result.rows.map(r => `- Processo: ${r.process_number} | Empresa: ${r.company_name} | Qtd: ${r.count}`).join('\n');
      return { content: [{ type: "text", text: `⚠️ Alerta de Integridade! Encontradas duplicatas:\n${formatted}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: "Erro ao consultar duplicatas no banco." }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
