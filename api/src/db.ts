import pg from 'pg';

const { Pool } = pg;

// Configuração otimizada para ambiente Always Free da OCI (Ampere/ARM)
// Agora usando os tipos oficiais do @types/pg
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
});

pool.on('error', (err: Error) => {
  console.error('❌ Erro inesperado no pool de conexões:', err);
});
