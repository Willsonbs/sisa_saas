/**
 * Validação do PR #9 — Disponibilidade por dia da semana e horário de funcionamento
 * Cenários: 1-5 conforme solicitado
 */
import pg from 'pg';
const { Pool } = pg;

const BASE = 'http://localhost:3000';
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

function extractCookie(res) {
  const match = res.headers.get('set-cookie')?.match(/auth_token=([^;]+)/);
  if (!match) return null;
  return `auth_token=${match[1]}`;
}

async function trpcGet(procedure, input, cookie) {
  const json = {};
  const metaValues = {};
  for (const [k, v] of Object.entries(input)) {
    if (v instanceof Date) {
      json[k] = v.toISOString();
      metaValues[k] = ['Date'];
    } else {
      json[k] = v;
    }
  }
  const payload = Object.keys(metaValues).length > 0
    ? { json, meta: { values: metaValues } }
    : { json };
  const url = `${BASE}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(payload))}`;
  const res = await fetch(url, { headers: { 'Cookie': cookie } });
  const data = await res.json();
  return { status: res.status, data };
}

async function trpcPost(procedure, input, cookie) {
  const json = {};
  const metaValues = {};
  for (const [k, v] of Object.entries(input)) {
    if (v instanceof Date) {
      json[k] = v.toISOString();
      metaValues[k] = ['Date'];
    } else {
      json[k] = v;
    }
  }
  const body = Object.keys(metaValues).length > 0
    ? { json, meta: { values: metaValues } }
    : { json };
  const res = await fetch(`${BASE}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const results = [];
function record(cenario, esperado, obtido, status) {
  results.push({ cenario, esperado, obtido, status });
}
function ok(label, condition, detail) {
  const sym = condition ? '✅' : '❌';
  process.stdout.write(`${sym} ${label} — ${detail}\n`);
}

async function main() {
  // ─── Login admin ───────────────────────────────────────────────────────────
  const adminLogin = await fetch(`${BASE}/api/trpc/auth.login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email: 'empresa@example.com', password: 'admin@123' } }),
  });
  const adminCookie = extractCookie(adminLogin);

  // ─── Login profissional ────────────────────────────────────────────────────
  // Pegar um profissional ativo do tenant 1
  const profRow = await pool.query(
    `SELECT u.id, u.email FROM users u
     INNER JOIN "professionalTenants" pt ON pt."professionalId" = u.id AND pt."tenantId" = 1
     WHERE u.role = 'professional' AND pt.status = 'approved' LIMIT 1`
  );
  const profEmail = profRow.rows[0]?.email;
  let profCookie = null;
  if (profEmail) {
    // Redefinir senha para garantir login
    const { createHash } = await import('crypto');
    // Usar a senha já redefinida em sessões anteriores (recepcao123 / prof123)
    // Tentar login direto; se falhar, usar admin
    const profLoginAttempt = await fetch(`${BASE}/api/trpc/auth.login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: { email: profEmail, password: 'prof123' } }),
    });
    if (profLoginAttempt.ok) {
      profCookie = extractCookie(profLoginAttempt);
    }
    process.stdout.write(`Profissional de teste: ${profEmail} — cookie: ${profCookie ? 'OK' : 'FALHOU (usando admin)'}\n`);
  }

  // ─── Sala de teste: usar sala 3 (availableSunday=false, openTime=08:00, closeTime=18:00) ──
  const testRoomId = 3;
  process.stdout.write(`\nSala de teste: id=${testRoomId} (Consultório 3, domingo=false, 08:00-18:00)\n`);

  // Próximo domingo
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(10, 0, 0, 0);
  const nextSundayEnd = new Date(nextSunday);
  nextSundayEnd.setHours(11, 0, 0, 0);
  process.stdout.write(`Próximo domingo: ${nextSunday.toISOString()}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 1: UI — rooms.availability retorna campos de disponibilidade por dia
  // (O frontend usa esses campos para marcar células como "Fechado")
  console.log('\n── Cenário 1: UI — rooms.availability inclui campos availableSunday etc. ──');
  const availRes = await trpcGet('rooms.availability', {
    date: nextSunday,
    tenantId: 1,
  }, profCookie || adminCookie);
  const availPayload = availRes.data?.result?.data?.json ?? {};
  const availData = availPayload.rooms ?? [];
  const testRoom = Array.isArray(availData) ? availData.find((r) => r.id === testRoomId) : null;
  const hasAvailFields = testRoom &&
    'availableSunday' in testRoom &&
    'availableMonday' in testRoom &&
    'availableSaturday' in testRoom;
  const sundayIsFalse = testRoom?.availableSunday === false;
  ok('rooms.availability retorna campos availableXxx', hasAvailFields,
    `availableSunday=${testRoom?.availableSunday}, availableMonday=${testRoom?.availableMonday}`);
  ok('availableSunday=false para sala 3', sundayIsFalse,
    `valor: ${testRoom?.availableSunday}`);
  record('1 — UI: rooms.availability inclui campos de disponibilidade por dia',
    'Campos availableMonday..availableSunday presentes na resposta',
    hasAvailFields ? `Presentes — availableSunday=${testRoom?.availableSunday}` : 'Ausentes',
    hasAvailFields && sundayIsFalse ? 'OK' : 'PROBLEMA');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 2: API — bookings.create em domingo deve retornar BAD_REQUEST
  console.log('\n── Cenário 2: API — bookings.create em domingo bloqueado ──');
  const bookSundayRes = await trpcPost('bookings.create', {
    roomId: testRoomId,
    startTime: nextSunday,
    endTime: nextSundayEnd,
    patientName: 'Teste Domingo',
  }, profCookie || adminCookie);
  const isSundayBlocked = bookSundayRes.status === 400;
  const sundayMsg = bookSundayRes.data?.error?.json?.message ?? '';
  const hasDayMsg = sundayMsg.includes('não está disponível neste dia');
  ok('bookings.create em domingo retorna HTTP 400', isSundayBlocked,
    `HTTP ${bookSundayRes.status}`);
  ok('Mensagem correta: "não está disponível neste dia da semana"', hasDayMsg,
    `msg: ${sundayMsg.substring(0, 80)}`);
  record('2 — API: bookings.create em domingo (sala com availableSunday=false)',
    'HTTP 400 — "Esta sala não está disponível neste dia da semana."',
    `HTTP ${bookSundayRes.status} — ${sundayMsg.substring(0, 80)}`,
    isSundayBlocked && hasDayMsg ? 'OK' : 'PROBLEMA');

  // Testar também bookings.createWithPayment
  const bookSundayPayRes = await trpcPost('bookings.createWithPayment', {
    roomId: testRoomId,
    startTime: nextSunday,
    endTime: nextSundayEnd,
    patientName: 'Teste Domingo Pay',
    paymentMethod: 'credit',
  }, profCookie || adminCookie);
  const isSundayPayBlocked = bookSundayPayRes.status === 400;
  const sundayPayMsg = bookSundayPayRes.data?.error?.json?.message ?? '';
  ok('bookings.createWithPayment em domingo retorna HTTP 400', isSundayPayBlocked,
    `HTTP ${bookSundayPayRes.status} — ${sundayPayMsg.substring(0, 80)}`);
  record('2b — API: bookings.createWithPayment em domingo',
    'HTTP 400 — "Esta sala não está disponível neste dia da semana."',
    `HTTP ${bookSundayPayRes.status} — ${sundayPayMsg.substring(0, 80)}`,
    isSundayPayBlocked ? 'OK' : 'PROBLEMA');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 3: Horário fora do funcionamento (antes das 08:00 ou depois das 18:00)
  console.log('\n── Cenário 3: API — horário fora do funcionamento bloqueado ──');
  // Próxima segunda-feira (availableMonday=true) às 07:00 (antes de 08:00)
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(7, 0, 0, 0);
  const nextMondayEnd = new Date(nextMonday);
  nextMondayEnd.setHours(8, 0, 0, 0);
  process.stdout.write(`Próxima segunda 07:00: ${nextMonday.toISOString()}\n`);

  const bookEarlyRes = await trpcPost('bookings.create', {
    roomId: testRoomId,
    startTime: nextMonday,
    endTime: nextMondayEnd,
    patientName: 'Teste Horário Cedo',
  }, profCookie || adminCookie);
  const isEarlyBlocked = bookEarlyRes.status === 400;
  const earlyMsg = bookEarlyRes.data?.error?.json?.message ?? '';
  const hasTimeMsg = earlyMsg.includes('fora do funcionamento');
  ok('bookings.create às 07:00 (antes de 08:00) retorna HTTP 400', isEarlyBlocked,
    `HTTP ${bookEarlyRes.status}`);
  ok('Mensagem correta: "fora do funcionamento"', hasTimeMsg,
    `msg: ${earlyMsg.substring(0, 80)}`);
  record('3a — API: bookings.create às 07:00 (antes de openTime=08:00)',
    'HTTP 400 — "Este horário está fora do funcionamento da sala."',
    `HTTP ${bookEarlyRes.status} — ${earlyMsg.substring(0, 80)}`,
    isEarlyBlocked && hasTimeMsg ? 'OK' : 'PROBLEMA');

  // Depois das 18:00 (closeTime=18:00)
  const nextMonday19 = new Date(nextMonday);
  nextMonday19.setHours(19, 0, 0, 0);
  const nextMonday20 = new Date(nextMonday);
  nextMonday20.setHours(20, 0, 0, 0);
  const bookLateRes = await trpcPost('bookings.create', {
    roomId: testRoomId,
    startTime: nextMonday19,
    endTime: nextMonday20,
    patientName: 'Teste Horário Tarde',
  }, profCookie || adminCookie);
  const isLateBlocked = bookLateRes.status === 400;
  const lateMsg = bookLateRes.data?.error?.json?.message ?? '';
  const hasLateTimeMsg = lateMsg.includes('fora do funcionamento');
  ok('bookings.create às 19:00 (depois de 18:00) retorna HTTP 400', isLateBlocked,
    `HTTP ${bookLateRes.status}`);
  ok('Mensagem correta: "fora do funcionamento"', hasLateTimeMsg,
    `msg: ${lateMsg.substring(0, 80)}`);
  record('3b — API: bookings.create às 19:00 (depois de closeTime=18:00)',
    'HTTP 400 — "Este horário está fora do funcionamento da sala."',
    `HTTP ${bookLateRes.status} — ${lateMsg.substring(0, 80)}`,
    isLateBlocked && hasLateTimeMsg ? 'OK' : 'PROBLEMA');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 4: Regressão — dia disponível normal (segunda 10:00-11:00)
  console.log('\n── Cenário 4: Regressão — dia disponível normal ──');
  const nextMonday10 = new Date(nextMonday);
  nextMonday10.setHours(10, 0, 0, 0);
  const nextMonday11 = new Date(nextMonday);
  nextMonday11.setHours(11, 0, 0, 0);

  // Verificar se já existe reserva nesse slot
  const conflictCheck = await pool.query(
    `SELECT id FROM bookings WHERE "roomId" = $1 AND "startTime" < $2 AND "endTime" > $3 AND status NOT IN ('canceled_with_credit', 'no_show')`,
    [testRoomId, nextMonday11.toISOString(), nextMonday10.toISOString()]
  );
  if (conflictCheck.rows.length > 0) {
    process.stdout.write(`   Slot segunda 10:00-11:00 já ocupado — usando 14:00-15:00\n`);
    nextMonday10.setHours(14, 0, 0, 0);
    nextMonday11.setHours(15, 0, 0, 0);
  }

  const bookNormalRes = await trpcPost('bookings.create', {
    roomId: testRoomId,
    startTime: nextMonday10,
    endTime: nextMonday11,
    patientName: 'Teste Regressão Normal',
  }, profCookie || adminCookie);
  const isNormalOk = bookNormalRes.status === 200;
  const normalData = bookNormalRes.data?.result?.data?.json;
  ok('bookings.create em dia disponível (segunda 10:00) retorna HTTP 200', isNormalOk,
    `HTTP ${bookNormalRes.status} — ${JSON.stringify(normalData).substring(0, 80)}`);
  record('4 — Regressão: bookings.create em segunda-feira 10:00-11:00 (dia disponível)',
    'HTTP 200 — reserva criada normalmente',
    `HTTP ${bookNormalRes.status} — ${isNormalOk ? 'Reserva criada (id=' + (normalData?.id ?? 'ok') + ')' : JSON.stringify(bookNormalRes.data).substring(0, 80)}`,
    isNormalOk ? 'OK' : 'PROBLEMA');

  // Limpar a reserva de teste
  if (isNormalOk && normalData?.id) {
    await pool.query(`DELETE FROM bookings WHERE id = $1`, [normalData.id]);
    process.stdout.write(`   Reserva de teste id=${normalData.id} removida\n`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 5: Regressão — reservas existentes continuam aparecendo
  console.log('\n── Cenário 5: Regressão — reservas existentes continuam visíveis ──');
  const existingBookings = await pool.query(
    `SELECT COUNT(*) as total FROM bookings WHERE "tenantId" = 1`
  );
  const totalBookings = parseInt(existingBookings.rows[0]?.total ?? '0');

  // Buscar via API
  const listRes = await trpcGet('admin.listAllBookings', {
    startDate: new Date(Date.now() - 365 * 86400000),
    endDate: new Date(Date.now() + 365 * 86400000),
  }, adminCookie);
  const apiBookings = listRes.data?.result?.data?.json ?? [];
  const apiCount = Array.isArray(apiBookings) ? apiBookings.length : 0;

  ok('Reservas existentes no banco visíveis', totalBookings > 0,
    `${totalBookings} reservas no banco`);
  ok('API retorna reservas existentes', apiCount > 0,
    `${apiCount} reservas via admin.listAllBookings`);
  record('5 — Regressão: reservas existentes continuam visíveis na API',
    'Reservas existentes retornadas normalmente (sem sumir)',
    `${totalBookings} no banco, ${apiCount} via API`,
    totalBookings > 0 && apiCount > 0 ? 'OK' : 'PROBLEMA');

  // ═══════════════════════════════════════════════════════════════════════════
  // Verificação extra: frontend — rooms.availability retorna openTime/closeTime
  console.log('\n── Extra: rooms.availability inclui openTime/closeTime ──');
  const hasOpenClose = testRoom && 'openTime' in testRoom && 'closeTime' in testRoom;
  ok('rooms.availability inclui openTime e closeTime', hasOpenClose,
    `openTime=${testRoom?.openTime}, closeTime=${testRoom?.closeTime}`);
  record('Extra — rooms.availability inclui openTime/closeTime para UI',
    'Campos openTime e closeTime presentes',
    hasOpenClose ? `openTime=${testRoom?.openTime}, closeTime=${testRoom?.closeTime}` : 'Ausentes',
    hasOpenClose ? 'OK' : 'PROBLEMA');

  // ═══════════════════════════════════════════════════════════════════════════
  process.stdout.write('\n═══════════════════════════════════════════════════════════\n');
  process.stdout.write('   TABELA DE RESULTADOS\n');
  process.stdout.write('═══════════════════════════════════════════════════════════\n');
  process.stdout.write('| Cenário | Esperado | Obtido | Status |\n');
  process.stdout.write('|---------|----------|--------|--------|\n');
  for (const r of results) {
    process.stdout.write(`| ${r.cenario} | ${r.esperado} | ${r.obtido} | ${r.status} |\n`);
  }
  process.stdout.write('═══════════════════════════════════════════════════════════\n');
  process.stdout.write('   FIM DA VALIDAÇÃO\n');
  process.stdout.write('═══════════════════════════════════════════════════════════\n');

  await pool.end();
}

main().catch(async e => {
  process.stdout.write('ERRO FATAL: ' + e.message + '\n' + e.stack + '\n');
  await pool.end();
});
