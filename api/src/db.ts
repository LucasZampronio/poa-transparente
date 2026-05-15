import pg from 'pg';

const { Pool } = pg;

// Configuração otimizada para ambiente Always Free da OCI (Ampere/ARM)
// Evita que conexões fiquem presas e consumam toda a RAM da instância.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Máximo de conexões simultâneas
  idleTimeoutMillis: 30000, // Fecha conexões ociosas após 30s
  connectionTimeoutMillis: 2000, // Timeout para novas conexões (2s)
  maxUses: 7500,        // Rotaciona a conexão após X usos para evitar vazamentos pequenos
});

// Listener para erros inesperados em conexões ociosas
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err);
});
