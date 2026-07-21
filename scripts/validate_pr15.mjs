import pg from 'pg';

const BASE = 'http://localhost:3000';
const pool = new pg.Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });

async function trpcGet(path, input, cookie) {
  const q = encodeURIComponent(JSON.stringify({ json: input }));
  const r = await fetch(BASE + '/api/trpc/' + path + '?input=' + q, { headers: { ...(cookie ? { Cookie: cookie } : {}) } });
  const d = await r.json();
  return { status: r.status, data: d?.result?.data?.json, error: d?.error?.data?.message };
}
async function trpcPost(path, input, cookie) {
  const r = await fetch(BASE + '/api/trpc/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ json: input }),
  });
  const d = await r.json();
  return { status: r.status, data: d?.result?.data?.json, error: d?.error?.data?.message };
}

async function login(email, password) {
  const r = await fetch(BASE + '/api/trpc/auth.login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email, password } }),
  });
  return r.headers.get('set-cookie')?.match(/auth_token=([^;]+)/)?.[0];
}

async function main() {
  const adminCookie = await login('empresa@example.com', 'admin@123');
  console.log('Login admin:', adminCookie ? 'OK' : 'FALHOU');

  // Cenário 1: Saldo da Erika consistente entre visão admin e banco
  console.log('\n=== Cenario 1: Saldo da Erika consistente ===');
  // Saldo via admin.listUsers
  const users = await trpcGet('admin.listUsers', {}, adminCookie);
  const erika = users.data?.find(u => u.email === 'erika@example.com');
  const erikaAdminBalance = erika ? Number(erika.creditBalance) : null;
  console.log('Saldo via admin.listUsers:', erikaAdminBalance !== null ? 'R$' + (erikaAdminBalance/100).toFixed(2) : 'NAO ENCONTRADO');

  // Saldo via banco (SUM direto)
  const erikaDb = await pool.query(`
    SELECT COALESCE(SUM(c.amount), 0) as saldo
    FROM credits c JOIN users u ON u.id = c."professionalId"
    WHERE u.email = 'erika@example.com' AND c."tenantId" = 1
  `);
  const erikaDbBalance = Number(erikaDb.rows[0].saldo);
  console.log('Saldo via banco (SUM):', 'R$' + (erikaDbBalance/100).toFixed(2));
  console.log(erikaAdminBalance === erikaDbBalance ? '✅' : '❌', 'Saldo admin bate com banco:', erikaAdminBalance, '===', erikaDbBalance);

  // Cenário 2: Checagem de saldo por tenant em bookings.create
  console.log('\n=== Cenario 2: Checagem de credito por tenant ===');
  // Criar profissional de teste vinculado ao tenant 1
  const createRes = await trpcPost('admin.createProfessional', {
    name: 'Prof Teste PR15',
    email: 'teste_pr15@example.com',
    password: 'teste123',
    phone: '11999999999',
    specialty: 'Teste',
    registryType: 'Outro',
  }, adminCookie);
  console.log('Criar profissional:', createRes.data?.success ? 'OK' : 'FALHOU');

  const usersAfter = await trpcGet('admin.listUsers', {}, adminCookie);
  const testProf = usersAfter.data?.find(u => u.email === 'teste_pr15@example.com');

  if (testProf) {
    // Saldo inicial = 0 — tentar reservar deve falhar por saldo insuficiente
    const profCookie = await login('teste_pr15@example.com', 'teste123');
    console.log('Login profissional teste:', profCookie ? 'OK' : 'FALHOU');

    if (profCookie) {
      // Pegar uma sala disponível
      const rooms = await trpcGet('rooms.list', {}, profCookie);
      const room = rooms.data?.[0];
      if (room) {
        // Tentar reservar com saldo 0 (deve falhar)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const endTime = new Date(tomorrow);
        endTime.setHours(11, 0, 0, 0);

        const bookRes = await trpcPost('bookings.create', {
          roomId: room.id,
          startTime: tomorrow,
          endTime: endTime,
          patientName: 'Paciente Teste',
          paymentMethod: 'credits',
        }, profCookie);
        console.log('Reserva com saldo 0:', bookRes.status === 400 ? '✅ Bloqueado (HTTP 400)' : '❌ Deveria ter bloqueado');
        console.log('Mensagem:', bookRes.error || bookRes.data);

        // Adicionar crédito suficiente e tentar de novo
        const addCredit = await trpcPost('credits.addManual', {
          professionalId: testProf.id,
          amount: room.pricePerHour || 10000,
          description: 'Teste PR15',
        }, adminCookie);
        console.log('Adicionar credito:', addCredit.data?.success ? 'OK' : 'FALHOU');

        const bookRes2 = await trpcPost('bookings.create', {
          roomId: room.id,
          startTime: tomorrow,
          endTime: endTime,
          patientName: 'Paciente Teste',
          paymentMethod: 'credits',
        }, profCookie);
        console.log('Reserva com saldo suficiente:', bookRes2.status === 200 ? '✅ OK' : '❌ FALHOU (HTTP ' + bookRes2.status + ')');

        // Cenário 3: Reembolso de cancelamento
        if (bookRes2.data?.id) {
          console.log('\n=== Cenario 3: Reembolso de cancelamento ===');
          const balanceBefore = await trpcGet('credits.getBalance', {}, profCookie);
          console.log('Saldo antes do cancelamento:', 'R$' + ((Number(balanceBefore.data) || 0)/100).toFixed(2));

          const cancelRes = await trpcPost('bookings.cancel', { bookingId: bookRes2.data.id }, profCookie);
          console.log('Cancelar reserva: HTTP', cancelRes.status, cancelRes.data?.success ? 'success=true' : cancelRes.error);

          const balanceAfter = await trpcGet('credits.getBalance', {}, profCookie);
          console.log('Saldo após cancelamento:', 'R$' + ((Number(balanceAfter.data) || 0)/100).toFixed(2));
          console.log('Reembolso recebido:', cancelRes.data?.refundAmount !== undefined ? 'R$' + (cancelRes.data.refundAmount/100).toFixed(2) : 'N/A');

          // Verificar saldo via admin também
          const usersAfterCancel = await trpcGet('admin.listUsers', {}, adminCookie);
          const profAfterCancel = usersAfterCancel.data?.find(u => u.email === 'teste_pr15@example.com');
          console.log('Saldo via admin após cancelamento:', profAfterCancel ? 'R$' + (Number(profAfterCancel.creditBalance)/100).toFixed(2) : 'NAO ENCONTRADO');
          const profBalance = Number(balanceAfter.data) || 0;
          const adminBalance = Number(profAfterCancel?.creditBalance) || 0;
          console.log(profBalance === adminBalance ? '✅' : '❌', 'Saldo profissional bate com admin:', profBalance, '===', adminBalance);
        }
      }
    }

    // Limpar profissional de teste
    const deleteRes = await trpcPost('admin.deleteProfessional', { id: testProf.id }, adminCookie);
    console.log('\nLimpar profissional de teste:', deleteRes.data?.success ? 'OK' : 'FALHOU');
  }

  // Cenário 4: Histórico de créditos
  console.log('\n=== Cenario 4: Historico de creditos ===');
  const erikaCookie = await login('erika@example.com', 'recepcao123');
  // Erika usa OAuth, não senha local — testar via admin
  const erikaHistory = await trpcGet('credits.history', { limit: 5 }, adminCookie);
  console.log('Histórico via admin (primeiros 5):', erikaHistory.status === 200 ? '✅ OK (' + (erikaHistory.data?.length || 0) + ' registros)' : '❌ HTTP ' + erikaHistory.status + ' ' + erikaHistory.error);

  // Cenário 6: tsc --noEmit
  console.log('\n=== Cenario 6: npx tsc --noEmit ===');
  const { execSync } = await import('child_process');
  try {
    execSync('cd /home/ubuntu/sisa_saas && npx tsc --noEmit 2>&1', { encoding: 'utf8', timeout: 30000 });
    console.log('✅ Zero erros TypeScript');
  } catch (e) {
    const output = e.stdout || e.message;
    const errors = output.split('\n').filter(l => l.includes('error TS')).length;
    console.log(errors === 0 ? '✅' : '❌', errors, 'erros TypeScript encontrados');
    if (errors > 0) console.log(output.slice(0, 500));
  }
}

main().catch(e => console.error('ERRO:', e.message)).finally(() => pool.end());
