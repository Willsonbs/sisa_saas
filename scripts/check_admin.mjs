import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });
const r = await pool.query(
  "SELECT id, email, role, password, \"passwordHash\", \"tenantId\" FROM users WHERE email IN ('empresa@example.com', 'admin@sisa.com', 'admin@onlife.com.br', 'willsonbs@gmail.com') LIMIT 10"
);
console.log(JSON.stringify(r.rows.map(u => ({
  id: u.id,
  email: u.email,
  role: u.role,
  tenantId: u.tenantId,
  hasPassword: !!u.password,
  passwordPrefix: u.password ? u.password.substring(0, 10) : null,
  hasHash: !!u.passwordHash,
  hashPrefix: u.passwordHash ? u.passwordHash.substring(0, 10) : null,
})), null, 2));
pool.end();
