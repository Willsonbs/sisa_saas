import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

const r = await pool.query(
  "SELECT id, email, role, password, \"passwordHash\", \"tenantId\" FROM users WHERE email = 'empresa@example.com' LIMIT 1"
);
const user = r.rows[0];
console.log('User:', { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
console.log('password field length:', user.password?.length);
console.log('password field prefix:', user.password?.substring(0, 20));

// Testar senhas comuns
const passwords = [
  'admin@123', 'Admin@123', 'admin123', 'Admin123', 'admin1234', 'empresa123', 'onlife123', 
  '123456', 'senha123', 'demo123', 'demo', 'test123', 'password',
  'sisa123', 'Sisa123', 'Wilson123', 'wilson123', 'empresa',
  'Empresa123', '12345678', 'abcdef', 'abc123', 'qwerty',
  'onlife', 'OnLife123', 'clinica123', 'saude123'
];

const field = user.passwordHash || user.password;
console.log('\nTestando senhas...');
let found = false;
for (const pwd of passwords) {
  if (field) {
    const match = await bcrypt.compare(pwd, field);
    if (match) {
      console.log(`✅ Senha correta: "${pwd}"`);
      found = true;
    }
  }
}
if (!found) {
  console.log('❌ Nenhuma das senhas testadas bateu com o hash.');
  console.log('Hash completo (para debug):', field);
}
pool.end();
