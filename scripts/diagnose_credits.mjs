import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

// Cenário 1: Créditos da Erika por tenant
const erika = await pool.query(`
  SELECT u.id, u.name, u.email, c.tenant_id, SUM(c.amount) as total_cents, ROUND(SUM(c.amount)/100.0, 2) as total_reais
  FROM users u
  JOIN credits c ON c.professional_id = u.id
  WHERE u.email = 'erika@example.com'
  GROUP BY u.id, u.name, u.email, c.tenant_id
  ORDER BY c.tenant_id
`);
console.log('=== Cenário 1: Créditos da Erika por tenant ===');
if (erika.rows.length === 0) console.log('Nenhum crédito encontrado para erika@example.com');
else console.table(erika.rows);

// Profissionais com crédito em mais de um tenant
const multi = await pool.query(`
  SELECT u.id, u.name, u.email, COUNT(DISTINCT c.tenant_id) as num_tenants, ROUND(SUM(c.amount)/100.0, 2) as total_geral_reais
  FROM users u
  JOIN credits c ON c.professional_id = u.id
  GROUP BY u.id, u.name, u.email
  HAVING COUNT(DISTINCT c.tenant_id) > 1
  ORDER BY u.name
`);
console.log('\n=== Profissionais com crédito em MAIS DE UM tenant ===');
if (multi.rows.length === 0) console.log('Nenhum — apenas Erika tinha a discrepância');
else console.table(multi.rows);

// Saldo de todos os profissionais no tenant 1
const byTenant = await pool.query(`
  SELECT u.id, u.name, u.email, c.tenant_id, ROUND(SUM(c.amount)/100.0, 2) as saldo_reais
  FROM users u
  JOIN credits c ON c.professional_id = u.id
  WHERE c.tenant_id = 1
  GROUP BY u.id, u.name, u.email, c.tenant_id
  ORDER BY u.name
`);
console.log('\n=== Saldo de todos os profissionais no tenant 1 ===');
console.table(byTenant.rows);

await pool.end();
