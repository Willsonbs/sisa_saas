import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

const r = await pool.query(
  "SELECT id, email, role, password, \"passwordHash\", \"tenantId\" FROM users WHERE email = 'empresa@example.com' LIMIT 1"
);
const user = r.rows[0];
console.log('User:', { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId });

const passwords = ['admin123', 'Admin123', 'admin1234', 'empresa123', 'onlife123', '123456', 'senha123', 'empresa@example.com', 'demo123', 'demo', 'test123', 'password', 'sisa123', 'Sisa123', 'Wilson123', 'wilson123'];
for (const pwd of passwords) {
  const field = user.passwordHash || user.password;
  if (field) {
    const match = await bcrypt.compare(pwd, field);
    if (match) {
      console.log(`✅ Senha correta: "${pwd}"`);
    }
  }
}
console.log('Verificação concluída.');
pool.end();
