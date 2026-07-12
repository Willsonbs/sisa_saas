import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

const r = await pool.query("SELECT id, name, email, \"passwordHash\", \"loginMethod\" FROM users WHERE role IN ('receptionist', 'financial')");
for (const u of r.rows) {
  console.log(`id=${u.id} email=${u.email} loginMethod=${u.loginMethod} hasHash=${!!u.passwordHash}`);
  if (u.passwordHash) {
    const passwords = ['recepcao123', 'recep123', 'recepcao@123', '123456', 'admin@123', 'financeiro123', 'financial123'];
    for (const p of passwords) {
      const match = await bcrypt.compare(p, u.passwordHash);
      if (match) { console.log(`  ✅ Senha: ${p}`); break; }
    }
  }
}
pool.end();
