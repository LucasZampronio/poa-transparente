import pg from 'pg';

// Em ambientes NodeNext/ESM, o import do pg deve ser tratado com cuidado para manter os tipos.
const { Pool } = pg;

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
