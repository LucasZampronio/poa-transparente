import pg from 'pg';

const { Pool } = pg;

// Usamos 'any' aqui temporariamente para contornar um problema de inferência de tipos
// no ambiente NodeNext/ESM que está bloqueando o build de produção.
// A funcionalidade em runtime não é afetada.
export const pool: any = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
} as any);

pool.on('error', (err: Error) => {
  console.error('❌ Erro inesperado no pool de conexões:', err);
});
