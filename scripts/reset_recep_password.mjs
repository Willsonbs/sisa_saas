import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

const hash = await bcrypt.hash('recepcao123', 10);
const r = await pool.query(
  `UPDATE users SET "passwordHash" = $1 WHERE email = 'recepcao@onlife.com.br' RETURNING id, email`,
  [hash]
);
console.log('Senha redefinida para recepcao123:', r.rows[0]);
pool.end();
