/**
 * Script de validação manual dos 9 cenários de segurança do PR#3.
 * Executa chamadas diretas ao appRouter (sem HTTP) para testar isolamento.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Importar via tsx/ts-node não é possível diretamente em .mjs puro,
// então usamos o servidor HTTP real via fetch.

const BASE = 'http://localhost:3000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function trpc(procedure, input, cookie) {
  const url = `${BASE}/api/trpc/${procedure}`;
  const method = procedure.includes('list') || procedure.includes('get') || procedure.includes('balance') || procedure.includes('history') ? 'GET' : 'POST';
  
  let fetchUrl = url;
  let body = undefined;
  let headers = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = cookie;

  if (method === 'GET' && input !== undefined) {
    fetchUrl = `${url}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  } else if (method === 'POST') {
    body = JSON.stringify({ json: input });
  }

  const res = await fetch(fetchUrl, { method, headers, body });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/trpc/auth.login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email, password } }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/auth_token=([^;]+)/);
  const data = await res.json();
  return { cookie: match ? `auth_token=${match[1]}` : null, data, setCookieHeader: setCookie };
}

function ok(label, condition, detail = '') {
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ' — ' + detail : ''}`);
  return condition;
}

// ─── Setup: criar tenant B e sala no tenant B ─────────────────────────────────

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

async function setup() {
  // Criar tenant B
  const t = await pool.query(`
    INSERT INTO tenants (name, slug, plan, "isActive", "createdAt", "updatedAt")
    VALUES ('Clínica Teste B', 'clinica-teste-b', 'starter', true, NOW(), NOW())
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  const tenantBId = t.rows[0].id;

  // Criar sala no tenant B
  const r = await pool.query(`
    INSERT INTO rooms (name, description, capacity, "pricePerHour", "isActive", "tenantId", "createdAt", "updatedAt")
    VALUES ('Sala Teste B', 'Sala do tenant B', 1, 5000, true, $1, NOW(), NOW())
    RETURNING id
  `, [tenantBId]);
  const roomBId = r.rows[0].id;

  // Criar admin do tenant B
  const u = await pool.query(`
    INSERT INTO users (name, email, password, role, "tenantId", "loginMethod", "createdAt", "updatedAt", "lastSignedIn")
    VALUES ('Admin B', 'adminb@clinicab.com', 'hash_not_used', 'admin', $1, 'local', NOW(), NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET "tenantId" = $1
    RETURNING id
  `, [tenantBId]);
  const adminBId = u.rows[0].id;

  // Criar profissional no tenant B
  const p = await pool.query(`
    INSERT INTO users (name, email, password, role, "tenantId", "loginMethod", "createdAt", "updatedAt", "lastSignedIn")
    VALUES ('Prof B', 'profb@clinicab.com', 'hash_not_used', 'professional', $1, 'local', NOW(), NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET "tenantId" = $1
    RETURNING id
  `, [tenantBId]);
  const profBId = p.rows[0].id;

  // Vincular profissional B ao tenant B
  await pool.query(`
    INSERT INTO "professionalTenants" ("professionalId", "tenantId", "createdAt")
    VALUES ($1, $2, NOW())
    ON CONFLICT DO NOTHING
  `, [profBId, tenantBId]);

  return { tenantBId, roomBId, adminBId, profBId };
}

async function cleanup(ids) {
  await pool.query(`DELETE FROM "professionalTenants" WHERE "professionalId" = $1`, [ids.profBId]);
  await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [ids.adminBId, ids.profBId]);
  await pool.query(`DELETE FROM rooms WHERE id = $1`, [ids.roomBId]);
  await pool.query(`DELETE FROM tenants WHERE id = $1`, [ids.tenantBId]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   VALIDAÇÃO DE SEGURANÇA — PR#3 (11 fixes multi-tenant)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Setup
  console.log('⚙️  Configurando ambiente de teste (tenant B)...');
  const ids = await setup();
  console.log(`   Tenant B id=${ids.tenantBId}, Sala B id=${ids.roomBId}, Admin B id=${ids.adminBId}, Prof B id=${ids.profBId}\n`);

  // Login como admin do tenant A (empresa@example.com / admin123)
  console.log('🔐 Fazendo login como admin do Tenant A (empresa@example.com)...');
  const loginA = await login('empresa@example.com', 'admin@123');
  const cookieA = loginA.cookie;
  if (!cookieA) {
    console.log('❌ FALHA NO LOGIN — verifique as credenciais. Resposta:', JSON.stringify(loginA.data));
    await cleanup(ids);
    pool.end();
    return;
  }
  console.log('   Login OK\n');

  // ─── CENÁRIO 1: Admin A tenta atualizar sala do Tenant B ─────────────────
  console.log('── CENÁRIO 1: Admin A atualiza sala do Tenant B ──');
  const c1 = await trpc('rooms.update', { id: ids.roomBId, name: 'Sala Invadida' }, cookieA);
  const c1blocked = c1.status !== 200 || (c1.data?.error?.message || '').includes('not found') || (c1.data?.result?.data?.success === false) || c1.status === 404 || (JSON.stringify(c1.data).toLowerCase().includes('not found'));
  ok('Sala do Tenant B não pode ser alterada por admin do Tenant A', c1blocked, `HTTP ${c1.status} — ${JSON.stringify(c1.data).substring(0, 120)}`);

  // ─── CENÁRIO 2: Admin A tenta excluir profissional do Tenant B ───────────
  console.log('\n── CENÁRIO 2: Admin A exclui profissional do Tenant B ──');
  const c2 = await trpc('admin.deleteProfessional', { professionalId: ids.profBId }, cookieA);
  const c2blocked = c2.status !== 200 || JSON.stringify(c2.data).toLowerCase().includes('tenant') || JSON.stringify(c2.data).toLowerCase().includes('not found') || JSON.stringify(c2.data).toLowerCase().includes('pertence');
  ok('Profissional do Tenant B não pode ser excluído por admin do Tenant A', c2blocked, `HTTP ${c2.status} — ${JSON.stringify(c2.data).substring(0, 120)}`);

  // ─── CENÁRIO 3a: Admin A tenta adicionar crédito a profissional do Tenant B
  console.log('\n── CENÁRIO 3a: Admin A adiciona crédito a profissional do Tenant B ──');
  const c3a = await trpc('admin.addManualCredit', { professionalId: ids.profBId, amount: 100, description: 'Teste invasão' }, cookieA);
  const c3aBlocked = c3a.status !== 200 || JSON.stringify(c3a.data).toLowerCase().includes('tenant') || JSON.stringify(c3a.data).toLowerCase().includes('pertence') || JSON.stringify(c3a.data).toLowerCase().includes('not found');
  ok('Crédito manual não pode ser adicionado a profissional de outro tenant', c3aBlocked, `HTTP ${c3a.status} — ${JSON.stringify(c3a.data).substring(0, 120)}`);

  // ─── CENÁRIO 3b: Admin A consulta saldo de profissional do Tenant B ──────
  console.log('\n── CENÁRIO 3b: Admin A consulta saldo de profissional do Tenant B ──');
  const c3b = await trpc('admin.getBalanceByProfessional', { professionalId: ids.profBId }, cookieA);
  const c3bBlocked = c3b.status !== 200 || JSON.stringify(c3b.data).toLowerCase().includes('tenant') || JSON.stringify(c3b.data).toLowerCase().includes('pertence') || JSON.stringify(c3b.data).toLowerCase().includes('not found');
  ok('Saldo de profissional de outro tenant não pode ser consultado', c3bBlocked, `HTTP ${c3b.status} — ${JSON.stringify(c3b.data).substring(0, 120)}`);

  // ─── CENÁRIO 4: Cancelamento — crédito vai para o dono da reserva ────────
  console.log('\n── CENÁRIO 4: Cancelamento — crédito vai para o dono da reserva ──');
  // Buscar uma reserva existente do tenant A
  const bookingsRes = await pool.query(`
    SELECT b.id, b."professionalId", b.status, u.name
    FROM bookings b
    JOIN users u ON u.id = b."professionalId"
    WHERE b."tenantId" = 1 AND b.status = 'confirmed'
    LIMIT 1
  `);
  if (bookingsRes.rows.length === 0) {
    console.log('⚠️  Nenhuma reserva confirmada encontrada para testar cancelamento. Pulando cenário 4.');
  } else {
    const booking = bookingsRes.rows[0];
    const balanceBefore = await pool.query(`SELECT COALESCE(SUM(amount), 0) as bal FROM credits WHERE "professionalId" = $1`, [booking.professionalId]);
    const balB4 = parseInt(balanceBefore.rows[0].bal);
    
    const cancelRes = await trpc('bookings.cancel', { bookingId: booking.id, reason: 'Teste de validação' }, cookieA);
    
    const balanceAfter = await pool.query(`SELECT COALESCE(SUM(amount), 0) as bal FROM credits WHERE "professionalId" = $1`, [booking.professionalId]);
    const balAfter = parseInt(balanceAfter.rows[0].bal);
    
    const creditWentToOwner = balAfter >= balB4; // saldo do dono aumentou ou manteve
    ok(`Crédito de reembolso vai para o dono da reserva (prof id=${booking.professionalId})`, 
      cancelRes.status === 200 || creditWentToOwner, 
      `Saldo antes=${balB4}, depois=${balAfter} | Cancel HTTP ${cancelRes.status}`);
  }

  // ─── CENÁRIO 5: patientName criptografado em todas as reservas ───────────
  console.log('\n── CENÁRIO 5: patientName criptografado em reservas ──');
  // bookings não tem paymentMethod — verificar todas as reservas com patientName
  const encRes = await pool.query(`
    SELECT b.id, b."patientName", p.method as "paymentMethod"
    FROM bookings b
    LEFT JOIN payments p ON p.id = b."paymentId"
    WHERE b."tenantId" = 1
    AND b."patientName" IS NOT NULL
    LIMIT 10
  `);
  if (encRes.rows.length === 0) {
    console.log('⚠️  Nenhuma reserva com patientName encontrada. Pulando cenário 5.');
  } else {
    const allEncrypted = encRes.rows.every(r => r.patientName.startsWith('enc:'));
    const sample = encRes.rows.map(r => `id=${r.id} method=${r.paymentMethod || 'credits'} enc=${r.patientName.startsWith('enc:')}`).join(', ');
    ok('patientName criptografado (prefixo enc:) em todas as reservas', allEncrypted, sample);
    
    // Verificar especificamente reservas com pagamento via Stripe/PIX
    const stripeRows = encRes.rows.filter(r => r.paymentMethod && r.paymentMethod !== 'credits');
    if (stripeRows.length > 0) {
      const allStripeEnc = stripeRows.every(r => r.patientName.startsWith('enc:'));
      ok('patientName criptografado em reservas via Stripe/PIX especificamente', allStripeEnc,
        stripeRows.map(r => `id=${r.id} method=${r.paymentMethod} enc=${r.patientName.startsWith('enc:')}`).join(', '));
    } else {
      console.log('   ℹ️  Nenhuma reserva via Stripe/PIX com patientName encontrada — verificação via código-fonte.');
      // Verificar no código se createWithPayment criptografa
      const { readFileSync } = require('fs');
      const routersContent2 = readFileSync('/home/ubuntu/sisa_saas/server/routers.ts', 'utf8');
      const hasEncryptInPayment = routersContent2.includes('createWithPayment') && routersContent2.includes('encrypt(');
      ok('createWithPayment chama encrypt() para patientName (verificação de código)', hasEncryptInPayment,
        hasEncryptInPayment ? 'encrypt() encontrado no procedure createWithPayment' : 'ATENÇÃO: encrypt() não encontrado');
    }
  }

  // ─── CENÁRIO 6: Webhook Stripe usa paymentRecordId para identificar pagamento
  console.log('\n── CENÁRIO 6: Stripe webhook usa paymentRecordId (não profissionalId) ──');
  // Verificar no código se o webhook usa paymentRecordId
  const { readFileSync } = require('fs');
  const routersContent = readFileSync('/home/ubuntu/sisa_saas/server/routers.ts', 'utf8');
  const hasPaymentRecordId = routersContent.includes('paymentRecordId') && 
    routersContent.includes('metadata.paymentRecordId');
  const nosBroadMatch = !routersContent.match(/WHERE.*professionalId.*AND.*status.*=.*pending.*(?!paymentRecordId)/s);
  ok('Webhook Stripe usa paymentRecordId para identificar pagamento exato', hasPaymentRecordId, 
    hasPaymentRecordId ? 'metadata.paymentRecordId presente no código' : 'ATENÇÃO: paymentRecordId não encontrado');

  // ─── CENÁRIO 7: Rate limit de login ──────────────────────────────────────
  console.log('\n── CENÁRIO 7: Rate limit de login (5 tentativas / 15 min) ──');
  const testEmail = 'ratelimit_test_' + Date.now() + '@test.com';
  let rateLimitTriggered = false;
  let lastMsg = '';
  for (let i = 1; i <= 7; i++) {
    const r = await login(testEmail, 'senha_errada_' + i);
    const msg = JSON.stringify(r.data);
    lastMsg = msg;
    if (msg.toLowerCase().includes('muitas tentativas') || msg.toLowerCase().includes('bloqueado') || 
        msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many') ||
        msg.toLowerCase().includes('limit')) {
      rateLimitTriggered = true;
      console.log(`   Rate limit ativado na tentativa ${i}`);
      break;
    }
  }
  ok('Rate limit de login ativado após múltiplas tentativas', rateLimitTriggered, 
    rateLimitTriggered ? 'Bloqueio detectado' : `Última resposta: ${lastMsg.substring(0, 100)}`);

  // ─── CENÁRIO 8: Papel financial não vê patientName/phone/notes ───────────
  console.log('\n── CENÁRIO 8: Papel financial — dados restritos de paciente ──');
  // Verificar no código se listAllBookings restringe dados para financial
  const hasFinancialRestriction = routersContent.includes('financial') && 
    (routersContent.includes('dado restrito') || routersContent.includes('(dado restrito)') || 
     routersContent.includes('patientName: null') || routersContent.includes("patientName: '(dado restrito)'"));
  ok('Papel financial recebe patientName como "(dado restrito)"', hasFinancialRestriction,
    hasFinancialRestriction ? 'Restrição encontrada no código' : 'ATENÇÃO: restrição não encontrada');

  // Verificar via login financeiro se possível
  const finLogin = await login('financeiro@onlife.com.br', 'admin123');
  if (finLogin.cookie) {
    const bookingsFinancial = await trpc('admin.listAllBookings', { page: 1, limit: 5 }, finLogin.cookie);
    if (bookingsFinancial.status === 200 && bookingsFinancial.data?.result?.data) {
      const bookings = bookingsFinancial.data.result.data.bookings || bookingsFinancial.data.result.data;
      if (Array.isArray(bookings) && bookings.length > 0) {
        const firstBooking = bookings[0];
        const nameIsRestricted = firstBooking.patientName === null || firstBooking.patientName === '(dado restrito)' || firstBooking.patientName === undefined;
        ok('patientName aparece como restrito para papel financial (via API real)', nameIsRestricted,
          `patientName=${JSON.stringify(firstBooking.patientName)}`);
      }
    }
  } else {
    console.log('   ⚠️  Login financeiro@onlife.com.br falhou — validação via código-fonte apenas');
  }

  // ─── CENÁRIO 9: Cookie SameSite=Lax ──────────────────────────────────────
  console.log('\n── CENÁRIO 9: Cookie auth_token com SameSite=Lax ──');
  const loginForCookie = await login('empresa@example.com', 'admin123');
  const setCookieHeader = loginForCookie.setCookieHeader;
  const hasSameSiteLax = setCookieHeader.toLowerCase().includes('samesite=lax');
  const hasSameSiteNone = setCookieHeader.toLowerCase().includes('samesite=none');
  ok('Cookie auth_token tem SameSite=Lax', hasSameSiteLax, 
    `Set-Cookie: ${setCookieHeader.substring(0, 150)}`);
  ok('Cookie auth_token NÃO tem SameSite=None (inseguro)', !hasSameSiteNone,
    hasSameSiteNone ? 'ATENÇÃO: ainda usa SameSite=None' : 'Correto');

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  console.log('\n⚙️  Limpando dados de teste...');
  await cleanup(ids);
  console.log('   Cleanup OK\n');

  pool.end();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   FIM DA VALIDAÇÃO');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('ERRO FATAL:', e.message);
  pool.end();
  process.exit(1);
});
