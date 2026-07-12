import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });
const r = await pool.query(
  "SELECT id, email, role, \"loginMethod\", \"tenantId\", password IS NOT NULL as has_password, \"passwordHash\" IS NOT NULL as has_hash FROM users WHERE role IN ('admin', 'super_admin') ORDER BY id LIMIT 10"
);
console.log('Admin users:');
r.rows.forEach(u => console.log(JSON.stringify(u)));
pool.end();
