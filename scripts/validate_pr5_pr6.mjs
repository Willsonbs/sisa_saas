/**
 * Validação dos PRs #5 e #6:
 * - PR#5: painel de recepção lista reservas corretamente + autocomplete
 * - PR#6: permissões de recepção/financeiro (sem Gerenciar Pacientes, com Ver Profissionais)
 */
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });
const BASE = 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ok(label, condition, detail = '') {
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? ' — ' + detail : ''}`);
  return condition;
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/trpc/auth.login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email, password } }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/auth_token=([^;]+)/);
  if (!match) {
    const data = await res.json().catch(() => ({}));
    console.log('   Login falhou:', JSON.stringify(data).substring(0, 100));
    return null;
  }
  return `auth_token=${match[1]}`;
}

async function trpcGet(procedure, input, cookie) {
  const url = `${BASE}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const res = await fetch(url, { headers: { 'Cookie': cookie } });
  const data = await res.json();
  return { status: res.status, data };
}

async function trpcPost(procedure, input, cookie) {
  const res = await fetch(`${BASE}/api/trpc/${procedure}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   VALIDAÇÃO PR#5 + PR#6');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ─── Login como recepção ──────────────────────────────────────────────────
  console.log('🔐 Fazendo login como recepção (recepcao@onlife.com.br)...');
  const recepCookie = await login('recepcao@onlife.com.br', 'recepcao123');
  if (!recepCookie) {
    console.log('❌ Login de recepção falhou — verificando senha no banco...');
    const r = await pool.query('SELECT id, name, email, "passwordHash" FROM users WHERE email = \'recepcao@onlife.com.br\'');
    console.log('   Usuário:', JSON.stringify(r.rows[0]));
    pool.end();
    return;
  }
  console.log('   Login OK\n');

  // ─── Login como admin ─────────────────────────────────────────────────────
  console.log('🔐 Fazendo login como admin (empresa@example.com)...');
  const adminCookie = await login('empresa@example.com', 'admin@123');
  if (!adminCookie) { console.log('❌ Login admin falhou'); pool.end(); return; }
  console.log('   Login OK\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // PR#5 — Painel de Recepção
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('══ PR#5 — Painel de Recepção ══\n');

  // Cenário 1: Listar reservas do dia 13/07
  console.log('── Cenário 1: Listagem de reservas do dia 13/07 ──');
  const bookingsRes = await trpcGet('reception.todayBookings', { date: '2026-07-13' }, recepCookie);
  const bookings = bookingsRes.data?.result?.data?.json ?? [];
  ok('Painel de Recepção retorna reservas (não vazio)',
    bookings.length > 0,
    `${bookings.length} reservas encontradas para 13/07`);

  // Cenário 2: Comparar com admin.listAllBookings
  console.log('\n── Cenário 2: Comparação com Gerenciar Reservas (admin) ──');
  const adminBookingsRes = await trpcGet('admin.listAllBookings', {
    startDate: new Date('2026-07-13T00:00:00-03:00').getTime(),
    endDate: new Date('2026-07-13T23:59:59-03:00').getTime(),
  }, adminCookie);
  const adminBookings = adminBookingsRes.data?.result?.data?.json ?? [];
  ok('Contagem de reservas bate entre Recepção e Admin',
    bookings.length === adminBookings.length,
    `Recepção: ${bookings.length} | Admin: ${adminBookings.length}`);

  // Verificar que as mesmas reservas aparecem (por ID)
  const recepIds = new Set(bookings.map(b => b.id));
  const adminIds = new Set(adminBookings.map(b => b.id));
  const allMatch = [...adminIds].every(id => recepIds.has(id));
  ok('Mesmos IDs de reservas em ambas as listagens', allMatch,
    allMatch ? 'IDs idênticos' : `Admin tem IDs que não estão na recepção: ${[...adminIds].filter(id => !recepIds.has(id)).join(', ')}`);

  // Cenário 3: Autocomplete de profissional
  console.log('\n── Cenário 3: Autocomplete de profissional ──');
  const profsRes = await trpcGet('reception.professionals', {}, recepCookie);
  const profs = profsRes.data?.result?.data?.json ?? [];
  ok('Lista de profissionais para autocomplete retorna dados',
    profs.length > 0,
    `${profs.length} profissionais disponíveis`);
  if (profs.length > 0) {
    console.log('   Profissionais disponíveis:', profs.map(p => p.name).join(', '));
  }

  // Cenário 4: Filtro por profissional
  console.log('\n── Cenário 4: Filtro por profissional ──');
  // Pegar o primeiro profissional que tem reservas no dia 13/07
  const profWithBooking = bookings.find(b => b.professionalName && b.professionalName !== '—');
  if (profWithBooking) {
    const searchTerm = profWithBooking.professionalName.split(' ').slice(0, 1)[0]; // Primeiro nome
    const filteredRes = await trpcGet('reception.todayBookings', {
      date: '2026-07-13',
      search: searchTerm,
    }, recepCookie);
    const filtered = filteredRes.data?.result?.data?.json ?? [];
    const allBelongToProf = filtered.every(b => b.professionalName?.toLowerCase().includes(searchTerm.toLowerCase()));
    ok(`Filtro por "${searchTerm}" retorna só reservas desse profissional`,
      filtered.length > 0 && allBelongToProf,
      `${filtered.length} reservas filtradas`);
  } else {
    console.log('   ⚠️  Nenhum profissional com nome encontrado nas reservas do dia');
  }

  // Cenário 5: Limpar filtro = todas as reservas
  console.log('\n── Cenário 5: Limpar filtro (sem search) ──');
  const allRes = await trpcGet('reception.todayBookings', { date: '2026-07-13' }, recepCookie);
  const allBookings = allRes.data?.result?.data?.json ?? [];
  ok('Sem filtro retorna todas as reservas do dia',
    allBookings.length === bookings.length,
    `${allBookings.length} reservas`);
  // Verificar ordenação por horário
  let isOrdered = true;
  for (let i = 1; i < allBookings.length; i++) {
    if (allBookings[i].startTime < allBookings[i-1].startTime) { isOrdered = false; break; }
  }
  ok('Reservas ordenadas do mais cedo para o mais tarde', isOrdered,
    allBookings.map(b => new Date(b.startTime).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })).join(', '));

  // Cenário 6: Reservas canceladas aparecem
  console.log('\n── Cenário 6: Reservas canceladas aparecem ──');
  // Verificar se há reservas canceladas no banco
  const canceledInDb = await pool.query(
    `SELECT COUNT(*) as cnt FROM bookings WHERE "tenantId" = 1 AND status = 'canceled_with_credit'`
  );
  const canceledCount = parseInt(canceledInDb.rows[0].cnt);
  if (canceledCount === 0) {
    console.log('   ℹ️  Não há reservas canceladas no banco — verificando via código-fonte');
    // Verificar no código que não há filtro de status na query
    const { readFileSync } = await import('fs');
    const dbContent = readFileSync('/home/ubuntu/sisa_saas/server/db.ts', 'utf8');
    const noStatusFilter = !dbContent.includes("eq(bookings.status, 'cancelled')") &&
                           !dbContent.includes("ne(bookings.status, 'canceled");
    ok('Query getReceptionBookings não filtra por status (inclui canceladas)',
      noStatusFilter,
      noStatusFilter ? 'Sem filtro de status — todas as reservas são listadas' : 'ATENÇÃO: filtro de status encontrado');
  } else {
    // Verificar se aparecem na listagem
    const allStatusRes = await trpcGet('reception.todayBookings', { date: '2026-07-13' }, recepCookie);
    const allStatusBookings = allStatusRes.data?.result?.data?.json ?? [];
    // Buscar em todos os dias com canceladas
    const canceledInAnyDay = await pool.query(
      `SELECT "startTime"::date as day FROM bookings WHERE "tenantId" = 1 AND status = 'canceled_with_credit' LIMIT 1`
    );
    if (canceledInAnyDay.rows.length > 0) {
      const dayStr = canceledInAnyDay.rows[0].day.toISOString().split('T')[0];
      const dayRes = await trpcGet('reception.todayBookings', { date: dayStr }, recepCookie);
      const dayBookings = dayRes.data?.result?.data?.json ?? [];
      const hasCanceled = dayBookings.some(b => b.status === 'canceled_with_credit');
      ok('Reservas com status canceled_with_credit aparecem no painel',
        hasCanceled,
        `Dia ${dayStr}: ${dayBookings.length} reservas, canceladas=${dayBookings.filter(b => b.status === 'canceled_with_credit').length}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PR#6 — Permissões de recepção/profissionais
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n══ PR#6 — Permissões de Recepção/Financeiro ══\n');

  // Cenário 7: "Gerenciar Pacientes" não aparece na UI
  console.log('── Cenário 7: "Gerenciar Pacientes" removido da UI ──');
  const { readFileSync } = await import('fs');
  const tenantSettingsContent = readFileSync('/home/ubuntu/sisa_saas/client/src/pages/admin/TenantSettings.tsx', 'utf8');
  const hasManagePatients = tenantSettingsContent.includes('Gerenciar Pacientes') || 
                            tenantSettingsContent.includes('permCanManagePatients') ||
                            tenantSettingsContent.includes('canManagePatients');
  ok('"Gerenciar Pacientes" removido da lista de permissões da UI',
    !hasManagePatients,
    hasManagePatients ? 'ATENÇÃO: ainda presente na UI' : 'Não encontrado em TenantSettings.tsx');

  // Verificar que apenas as 3 permissões corretas estão presentes
  const permLabels = tenantSettingsContent.match(/label: "[^"]+"/g) || [];
  console.log('   Permissões presentes na UI:', permLabels.join(', '));
  ok('Apenas 3 permissões na UI (Ver Reservas, Ver Profissionais, Ver Salas)',
    permLabels.length === 3 &&
    permLabels.some(l => l.includes('Ver Reservas')) &&
    permLabels.some(l => l.includes('Ver Profissionais')) &&
    permLabels.some(l => l.includes('Ver Salas')),
    permLabels.join(', '));

  // Cenário 8: Toggle "Ver Profissionais" ativado para recepcionista
  console.log('\n── Cenário 8: Toggle "Ver Profissionais" ativado ──');
  const recepUser = await pool.query(
    `SELECT id, name, "permCanViewProfessionals" FROM users WHERE email = 'recepcao@onlife.com.br'`
  );
  const recepPerm = recepUser.rows[0]?.permCanViewProfessionals;
  ok('"Ver Profissionais" ativado para recepcao@onlife.com.br',
    recepPerm === true,
    `permCanViewProfessionals=${recepPerm}`);

  // Cenário 9: /reception/professionals lista profissionais sem CPF/CNPJ
  console.log('\n── Cenário 9: /reception/professionals — dados de contato sem CPF/CNPJ ──');
  const profContactsRes = await trpcGet('reception.professionalsContacts', {}, recepCookie);
  const profContacts = profContactsRes.data?.result?.data?.json ?? [];
  ok('Listagem de profissionais retorna dados',
    profContactsRes.status === 200 && profContacts.length > 0,
    `HTTP ${profContactsRes.status} — ${profContacts.length} profissionais`);
  if (profContacts.length > 0) {
    const hasCpf = profContacts.some(p => p.cpf !== undefined || p.cnpj !== undefined);
    ok('Listagem NÃO inclui CPF/CNPJ', !hasCpf,
      hasCpf ? 'ATENÇÃO: CPF/CNPJ encontrado' : 'Campos CPF/CNPJ ausentes — correto');
    const hasPhone = profContacts.some(p => p.phone !== undefined);
    ok('Listagem inclui telefone', hasPhone,
      `Exemplo: ${JSON.stringify(profContacts[0])}`);
  }

  // Cenário 10: Editar telefone de um profissional
  console.log('\n── Cenário 10: Editar telefone de profissional ──');
  if (profContacts.length > 0) {
    const targetProf = profContacts[0];
    const originalPhone = targetProf.phone || '';
    const newPhone = '(11) 99999-0001';
    const updateRes = await trpcPost('reception.updateProfessionalContact', {
      professionalId: targetProf.id,
      phone: newPhone,
    }, recepCookie);
    ok('Recepção pode atualizar telefone de profissional',
      updateRes.status === 200 && updateRes.data?.result?.data?.json?.success === true,
      `HTTP ${updateRes.status} — ${JSON.stringify(updateRes.data).substring(0, 80)}`);
    // Verificar no banco
    const verifyPhone = await pool.query(
      `SELECT phone FROM users WHERE id = $1`, [targetProf.id]
    );
    ok('Telefone atualizado no banco',
      verifyPhone.rows[0]?.phone === newPhone,
      `phone=${verifyPhone.rows[0]?.phone}`);
    // Restaurar telefone original
    if (originalPhone) {
      await pool.query(`UPDATE users SET phone = $1 WHERE id = $2`, [originalPhone, targetProf.id]);
      console.log('   Telefone restaurado para o valor original');
    }
  }

  // Cenário 11: Desativar "Ver Profissionais" → menu some e URL retorna erro
  console.log('\n── Cenário 11: Desativar "Ver Profissionais" → acesso bloqueado ──');
  const recepId = recepUser.rows[0]?.id;
  // Desativar permissão
  await pool.query(`UPDATE users SET "permCanViewProfessionals" = false WHERE id = $1`, [recepId]);
  // Fazer novo login (cookie já está ativo, mas o contexto usa o banco)
  const recepCookie2 = await login('recepcao@onlife.com.br', 'recepcao123');
  if (recepCookie2) {
    const blockedRes = await trpcGet('reception.professionalsContacts', {}, recepCookie2);
    ok('Acesso a /reception/professionals bloqueado sem permissão',
      blockedRes.status === 403 || blockedRes.data?.error?.json?.data?.code === 'FORBIDDEN',
      `HTTP ${blockedRes.status} — ${JSON.stringify(blockedRes.data).substring(0, 80)}`);
  }
  // Reativar permissão
  await pool.query(`UPDATE users SET "permCanViewProfessionals" = true WHERE id = $1`, [recepId]);
  console.log('   Permissão restaurada');

  // Cenário 12: Papel "financial" com permissão ativada
  console.log('\n── Cenário 12: Papel "financial" com Ver Profissionais ──');
  // Verificar se há usuário financial no banco
  const financialUser = await pool.query(
    `SELECT id, name, email, "permCanViewProfessionals" FROM users WHERE role = 'financial' AND "tenantId" = 1 LIMIT 1`
  );
  if (financialUser.rows.length === 0) {
    console.log('   ⚠️  Nenhum usuário financial encontrado — criando temporário para teste...');
    // Criar usuário financial temporário
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('financial123', 10);
    await pool.query(`
      INSERT INTO users (name, email, "passwordHash", role, "loginMethod", "tenantId", "permCanViewProfessionals", "createdAt", "updatedAt")
      VALUES ('Financeiro Teste', 'financeiro_test@onlife.com.br', $1, 'financial', 'password', 1, true, NOW(), NOW())
    `, [hash]);
    console.log('   Usuário financial temporário criado');
  } else {
    // Garantir que tem permissão
    await pool.query(`UPDATE users SET "permCanViewProfessionals" = true WHERE id = $1`, [financialUser.rows[0].id]);
  }
  const finEmail = financialUser.rows.length > 0 ? financialUser.rows[0].email : 'financeiro_test@onlife.com.br';
  const finPass = financialUser.rows.length > 0 ? 'financeiro123' : 'financial123';
  const finCookie = await login(finEmail, finPass);
  if (finCookie) {
    const finProfsRes = await trpcGet('reception.professionalsContacts', {}, finCookie);
    const finProfs = finProfsRes.data?.result?.data?.json ?? [];
    ok('Papel "financial" com permissão pode acessar profissionalsContacts',
      finProfsRes.status === 200 && finProfs.length > 0,
      `HTTP ${finProfsRes.status} — ${finProfs.length} profissionais`);
  } else {
    console.log('   ⚠️  Login financial falhou — verificando senha...');
    // Tentar com a senha padrão
    const finCookie2 = await login(finEmail, 'financial123');
    if (finCookie2) {
      const finProfsRes = await trpcGet('reception.professionalsContacts', {}, finCookie2);
      const finProfs = finProfsRes.data?.result?.data?.json ?? [];
      ok('Papel "financial" com permissão pode acessar professionalsContacts',
        finProfsRes.status === 200 && finProfs.length > 0,
        `HTTP ${finProfsRes.status} — ${finProfs.length} profissionais`);
    } else {
      console.log('   ❌ Login financial falhou com ambas as senhas');
    }
  }
  // Limpeza: remover usuário financial temporário se foi criado
  if (financialUser.rows.length === 0) {
    await pool.query(`DELETE FROM users WHERE email = 'financeiro_test@onlife.com.br'`);
    console.log('   Usuário financial temporário removido');
  }

  pool.end();
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   FIM DA VALIDAÇÃO');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(e => {
  console.error('ERRO FATAL:', e.message, e.stack);
  pool.end();
  process.exit(1);
});
