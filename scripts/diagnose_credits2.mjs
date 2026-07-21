// Usa a mesma conexão Supabase que o servidor usa (via SUPABASE_URL)
import pg from 'pg';

const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  console.error('SUPABASE_URL nao definida');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  // Cenário 1: Créditos da Erika por tenant
  console.log('=== Cenario 1: Creditos da Erika (erika@example.com) por tenant ===');
  const erika = await pool.query(`
    SELECT u.id, u.name, u.email, c."tenantId", 
           SUM(c.amount) as total_cents, 
           ROUND(SUM(c.amount)/100.0, 2) as total_reais,
           COUNT(*) as num_transacoes
    FROM users u
    JOIN credits c ON c."professionalId" = u.id
    WHERE u.email = 'erika@example.com'
    GROUP BY u.id, u.name, u.email, c."tenantId"
    ORDER BY 4
  `);
  if (erika.rows.length === 0) {
    console.log('Nenhum credito encontrado para erika@example.com');
  } else {
    console.table(erika.rows);
    const tenants = erika.rows.map(r => `tenantId=${r.tenantId}: R$${r.total_reais} (${r.num_transacoes} transacoes)`);
    console.log('Resumo:', tenants.join(' | '));
  }

  // Profissionais com crédito em mais de um tenant
  console.log('\n=== Profissionais com credito em MAIS DE UM tenant ===');
  const multi = await pool.query(`
    SELECT u.id, u.name, u.email, 
           COUNT(DISTINCT c."tenantId") as num_tenants, 
           ROUND(SUM(c.amount)/100.0, 2) as total_geral_reais,
           array_agg(DISTINCT c."tenantId") as tenant_ids
    FROM users u
    JOIN credits c ON c."professionalId" = u.id
    GROUP BY u.id, u.name, u.email
    HAVING COUNT(DISTINCT c."tenantId") > 1
    ORDER BY u.name
  `);
  if (multi.rows.length === 0) {
    console.log('Nenhum — apenas Erika tinha a discrepancia');
  } else {
    console.table(multi.rows);
  }

  // Saldo de todos os profissionais no tenant 1
  console.log('\n=== Saldo de todos os profissionais no tenant 1 ===');
  const byTenant = await pool.query(`
    SELECT u.id, u.name, u.email, 
           ROUND(SUM(c.amount)/100.0, 2) as saldo_reais,
           COUNT(*) as num_transacoes
    FROM users u
    JOIN credits c ON c."professionalId" = u.id
    WHERE c."tenantId" = 1
    GROUP BY u.id, u.name, u.email
    ORDER BY u.name
  `);
  console.table(byTenant.rows);

} catch (err) {
  console.error('Erro:', err.message);
} finally {
  await pool.end();
}
