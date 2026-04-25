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
server.resource("projeto-contexto", "resource://projeto/manifesto", { mimeType: "text/plain" }, async () => ({
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
}));
// Ferramenta: Registrar Progresso Diário (O Diário do Estagiário)
server.tool("registrar_progresso_diario", "Salva o resumo do dia, decisões tomadas e conceitos aprendidos no arquivo DIARIO.md", {
    resumo: z.string().describe("Resumo das tarefas realizadas"),
    decisões: z.string().describe("Principais decisões técnicas tomadas"),
    aprendizado: z.string().describe("Conceitos que o estagiário aprendeu hoje")
}, async ({ resumo, decisões, aprendizado }) => {
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
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Erro ao salvar diário: ${error}` }]
        };
    }
});
// Ferramenta: Explicar Conceito Técnico
server.tool("explicar_conceito_tecnico", "Explica um termo ou padrão de software de forma simples para o estagiário", { termo: z.string() }, async ({ termo }) => {
    return {
        content: [{ type: "text", text: `Vou preparar uma explicação de 'Senior para Estagiário' sobre: ${termo}.` }]
    };
});
// Ferramenta: Buscar Gastos por Bairro
server.tool("buscar_gastos_por_bairro", "Consulta no banco de dados os gastos públicos em um bairro específico", { bairro: z.string() }, async ({ bairro }) => {
    try {
        const result = await pool.query('SELECT agency, company_name, category, contract_value, reference_date FROM public_expenses WHERE district ILIKE $1 LIMIT 10', [`%${bairro}%`]);
        if (result.rows.length === 0)
            return { content: [{ type: "text", text: "Nada encontrado." }] };
        const formatted = result.rows.map(r => `- ${r.agency}: R$ ${r.contract_value}`).join('\n');
        return { content: [{ type: "text", text: `Dados brutos para análise:\n${formatted}` }] };
    }
    catch (e) {
        return { content: [{ type: "text", text: "Erro na query." }] };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
