/**
 * Simula o fluxo completo de compra de créditos (avulso e pacote)
 * chamando diretamente o handler do webhook Stripe com um evento fake.
 * 
 * Isso testa o cenário 5 (avulso R$51 → 5100 créditos) e
 * cenário 6 (pacote R$800 → 8400 créditos / R$840 em créditos).
 */
import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

const BASE = 'http://localhost:3000';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ─── Login helper ─────────────────────────────────────────────────────────────
async function login(email, password) {
  const res = await fetch(`${BASE}/api/trpc/auth.login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email, password } }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/auth_token=([^;]+)/);
  return match ? `auth_token=${match[1]}` : null;
}

// ─── tRPC call helper ─────────────────────────────────────────────────────────
async function trpcPost(procedure, input, cookie) {
  const res = await fetch(`${BASE}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ─── Stripe webhook simulator ─────────────────────────────────────────────────
async function simulateStripeWebhook(metadata, paymentIntentId) {
  const event = {
    id: `evt_test_${Date.now()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        payment_intent: paymentIntentId,
        metadata,
      }
    }
  };

  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Gerar assinatura Stripe
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');
  const stripeSignature = `t=${timestamp},v1=${signature}`;

  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': stripeSignature,
    },
    body: payload,
  });
  return { status: res.status, text: await res.text() };
}

function ok(label, condition, detail = '') {
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ' — ' + detail : ''}`);
  return condition;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   VALIDAÇÃO PR#4 — Crédito Avulso e Pacotes');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!STRIPE_WEBHOOK_SECRET) {
    console.log('❌ STRIPE_WEBHOOK_SECRET não configurado — não é possível simular webhook');
    pool.end();
    return;
  }

  // Login como profissional de teste
  console.log('🔐 Fazendo login como profissional de teste...');
  const cookie = await login('empresa@example.com', 'admin@123');
  if (!cookie) {
    console.log('❌ Login falhou');
    pool.end();
    return;
  }
  console.log('   Login OK\n');

  // Obter ID do profissional
  const meRes = await fetch(`${BASE}/api/trpc/auth.me?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
    headers: { 'Cookie': cookie }
  });
  const meData = await meRes.json();
  const profId = meData?.result?.data?.json?.id;
  if (!profId) {
    console.log('❌ Não foi possível obter ID do profissional:', JSON.stringify(meData).substring(0, 100));
    pool.end();
    return;
  }
  console.log(`   Profissional ID: ${profId}\n`);

  // Saldo inicial
  const balBefore = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as bal FROM credits WHERE "professionalId" = $1`,
    [profId]
  );
  const initialBalance = parseInt(balBefore.rows[0].bal);
  console.log(`   Saldo inicial: ${initialBalance} cents (R$ ${(initialBalance/100).toFixed(2)})\n`);

  // ─── CENÁRIO 5: Compra avulsa de R$51 ────────────────────────────────────
  console.log('── CENÁRIO 5: Compra avulsa de R$51 (5100 cents) ──');
  
  // Criar registro de pagamento no banco diretamente (simula o que o backend faz antes do Stripe)
  const paymentAvulso = await pool.query(`
    INSERT INTO payments ("professionalId", "tenantId", amount, method, status, metadata, "createdAt", "updatedAt")
    VALUES ($1, 1, 5100, 'credit_card', 'pending', '{"packageId":"custom","credits":5100}', NOW(), NOW())
    RETURNING id
  `, [profId]);
  const paymentAvulsoId = paymentAvulso.rows[0].id;
  console.log(`   Registro de pagamento criado: id=${paymentAvulsoId}`);

  const webhookAvulso = await simulateStripeWebhook({
    professionalId: profId.toString(),
    tenantId: '1',
    packageId: 'custom',
    credits: '5100',
    paymentRecordId: paymentAvulsoId.toString(),
    type: 'credit_purchase',
  }, `pi_test_avulso_${Date.now()}`);
  
  console.log(`   Webhook response: HTTP ${webhookAvulso.status} — ${webhookAvulso.text.substring(0, 50)}`);

  const balAfterAvulso = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as bal FROM credits WHERE "professionalId" = $1`,
    [profId]
  );
  const balanceAfterAvulso = parseInt(balAfterAvulso.rows[0].bal);
  const creditsAdded = balanceAfterAvulso - initialBalance;
  
  ok('Compra avulsa R$51 → exatamente 5100 créditos adicionados (sem bônus)', 
    creditsAdded === 5100,
    `Saldo: ${initialBalance} → ${balanceAfterAvulso} | Adicionado: ${creditsAdded} cents (R$ ${(creditsAdded/100).toFixed(2)})`);

  // Verificar que o pagamento foi marcado como paid
  const paymentAvulsoStatus = await pool.query(
    `SELECT status FROM payments WHERE id = $1`, [paymentAvulsoId]
  );
  ok('Registro de pagamento avulso marcado como "paid"',
    paymentAvulsoStatus.rows[0]?.status === 'paid',
    `status=${paymentAvulsoStatus.rows[0]?.status}`);

  // ─── CENÁRIO 6: Compra do pacote R$800 → 8400 créditos ───────────────────
  console.log('\n── CENÁRIO 6: Pacote R$800 → 8400 créditos (5% bônus) ──');
  
  const balBefore800 = balanceAfterAvulso;
  
  const payment800 = await pool.query(`
    INSERT INTO payments ("professionalId", "tenantId", amount, method, status, metadata, "createdAt", "updatedAt")
    VALUES ($1, 1, 80000, 'credit_card', 'pending', '{"packageId":"credits_800","credits":84000}', NOW(), NOW())
    RETURNING id
  `, [profId]);
  const payment800Id = payment800.rows[0].id;
  console.log(`   Registro de pagamento criado: id=${payment800Id}`);

  const webhook800 = await simulateStripeWebhook({
    professionalId: profId.toString(),
    tenantId: '1',
    packageId: 'credits_800',
    credits: '84000',
    paymentRecordId: payment800Id.toString(),
    type: 'credit_purchase',
  }, `pi_test_800_${Date.now()}`);

  console.log(`   Webhook response: HTTP ${webhook800.status} — ${webhook800.text.substring(0, 50)}`);

  const balAfter800 = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as bal FROM credits WHERE "professionalId" = $1`,
    [profId]
  );
  const balanceAfter800 = parseInt(balAfter800.rows[0].bal);
  const credits800Added = balanceAfter800 - balBefore800;

  ok('Pacote R$800 → exatamente 84000 créditos adicionados (R$840, bônus 5%)',
    credits800Added === 84000,
    `Saldo: ${balBefore800} → ${balanceAfter800} | Adicionado: ${credits800Added} cents (R$ ${(credits800Added/100).toFixed(2)})`);

  const payment800Status = await pool.query(
    `SELECT status FROM payments WHERE id = $1`, [payment800Id]
  );
  ok('Registro de pagamento R$800 marcado como "paid"',
    payment800Status.rows[0]?.status === 'paid',
    `status=${payment800Status.rows[0]?.status}`);

  // ─── Limpeza: reverter os créditos adicionados ────────────────────────────
  console.log('\n⚙️  Revertendo créditos de teste...');
  await pool.query(
    `DELETE FROM credits WHERE "professionalId" = $1 AND description LIKE '%Compra de pacote via Stripe%' AND "createdAt" > NOW() - INTERVAL '5 minutes'`,
    [profId]
  );
  await pool.query(
    `DELETE FROM payments WHERE id IN ($1, $2)`,
    [paymentAvulsoId, payment800Id]
  );
  console.log('   Cleanup OK\n');

  pool.end();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   FIM DA VALIDAÇÃO');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('ERRO FATAL:', e.message, e.stack);
  pool.end();
  process.exit(1);
});
