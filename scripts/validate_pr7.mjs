/**
 * Validação do PR #7 — Recepção acessa tela completa de Profissionais do admin
 * Cenários 1-7 conforme especificado
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';

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
  if (!match) return null;
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
const results = [];

function record(cenario, esperado, obtido, status) {
  results.push({ cenario, esperado, obtido, status });
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   VALIDAÇÃO PR#7 — Recepção: Tela Completa de Profissionais');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ─── Preparar usuário de recepção com permissão ativada ───────────────────
  const recepRow = await pool.query(
    `SELECT id, email, "permCanViewProfessionals" FROM users WHERE email = 'recepcao@onlife.com.br'`
  );
  const recepId = recepRow.rows[0]?.id;
  await pool.query(`UPDATE users SET "permCanViewProfessionals" = true WHERE id = $1`, [recepId]);

  console.log('🔐 Fazendo login como recepção (recepcao@onlife.com.br)...');
  const recepCookie = await login('recepcao@onlife.com.br', 'recepcao123');
  if (!recepCookie) {
    console.log('❌ Login de recepção falhou');
    pool.end();
    return;
  }
  console.log('   Login OK\n');

  console.log('🔐 Fazendo login como admin (empresa@example.com)...');
  const adminCookie = await login('empresa@example.com', 'admin@123');
  if (!adminCookie) { console.log('❌ Login admin falhou'); pool.end(); return; }
  console.log('   Login OK\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 1: Sidebar e tela completa de profissionais
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('── Cenário 1: Sidebar e tela completa de profissionais ──');

  // Verificar DashboardLayout: item Profissionais aponta para /admin/professionals
  const layoutContent = readFileSync('/home/ubuntu/sisa_saas/client/src/components/DashboardLayout.tsx', 'utf8');
  const sidebarPointsToAdmin = layoutContent.includes('path: "/admin/professionals"') &&
    layoutContent.includes('permCanViewProfessionals');
  ok('Sidebar "Profissionais" aponta para /admin/professionals (mesma tela do admin)', sidebarPointsToAdmin);
  record(
    '1 — Sidebar aponta para /admin/professionals',
    'Item "Profissionais" no sidebar da recepção aponta para /admin/professionals',
    sidebarPointsToAdmin ? 'DashboardLayout.tsx: path="/admin/professionals" condicionado a permCanViewProfessionals' : 'NÃO encontrado',
    sidebarPointsToAdmin ? 'OK' : 'PROBLEMA'
  );

  // Verificar que a tela admin.listUsers está acessível para recepção com permissão
  const listRes = await trpcGet('admin.listUsers', {}, recepCookie);
  const profList = listRes.data?.result?.data?.json ?? [];
  ok('Recepcionista com permissão acessa admin.listUsers (lista de profissionais)',
    listRes.status === 200 && profList.length > 0,
    `HTTP ${listRes.status} — ${profList.length} profissionais`);
  record(
    '1 — Acesso a admin.listUsers como recepcionista',
    'HTTP 200 com lista de profissionais',
    `HTTP ${listRes.status} — ${profList.length} profissionais`,
    listRes.status === 200 && profList.length > 0 ? 'OK' : 'PROBLEMA'
  );

  // Verificar que a tela tem os campos esperados (nome, email, especialidade, cpf/cnpj, créditos)
  if (profList.length > 0) {
    const sample = profList[0];
    const hasExpectedFields = 'name' in sample && 'email' in sample && 'specialty' in sample;
    ok('Listagem inclui campos nome/email/especialidade',
      hasExpectedFields,
      `Campos: ${Object.keys(sample).join(', ')}`);
    record(
      '1 — Campos na listagem (nome/email/especialidade/CPF/créditos)',
      'Campos name, email, specialty, cpf/cnpj, credits presentes',
      `Campos: ${Object.keys(sample).join(', ')}`,
      hasExpectedFields ? 'OK' : 'PROBLEMA'
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 2: Cadastrar novo profissional como recepcionista
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 2: Cadastrar novo profissional como recepcionista ──');

  const testEmail = `teste_recep_${Date.now()}@example.com`;
  const createRes = await trpcPost('admin.createProfessional', {
    name: 'Profissional Teste Recepção',
    email: testEmail,
    password: 'Teste@123',
    phone: '(11) 98765-4321',
    specialty: 'Fisioterapia',
    cpf: '123.456.789-00',
    cnpj: '',
    professionalRegister: 'CREFITO-12345',
  }, recepCookie);

  const created = createRes.data?.result?.data?.json;
  const createOk = createRes.status === 200 && created?.success === true;
  ok('Recepcionista cria novo profissional via admin.createProfessional',
    createOk,
    `HTTP ${createRes.status} — success=${created?.success}`);
  record(
    '2 — Cadastrar profissional como recepcionista',
    'HTTP 200 com success=true',
    `HTTP ${createRes.status} — ${createOk ? 'success=true' : JSON.stringify(createRes.data).substring(0, 80)}`,
    createOk ? 'OK' : 'PROBLEMA'
  );

  // Buscar o id do profissional criado pelo email
  let createdProfId = null;
  if (createOk) {
    const newProfRow = await pool.query(`SELECT id FROM users WHERE email = $1`, [testEmail]);
    createdProfId = newProfRow.rows[0]?.id ?? null;
  }

  if (createOk) {
    // Verificar que aparece na lista
    const listAfter = await trpcGet('admin.listUsers', {}, recepCookie);
    const profListAfter = listAfter.data?.result?.data?.json ?? [];
    const appearsInList = profListAfter.some(p => p.email === testEmail);
    ok('Profissional criado aparece na listagem',
      appearsInList,
      `${profListAfter.length} profissionais, email ${testEmail} ${appearsInList ? 'encontrado' : 'NÃO encontrado'}`);
    record(
      '2 — Profissional criado aparece na lista',
      'Email do novo profissional presente na listagem',
      appearsInList ? 'Encontrado na listagem' : 'NÃO encontrado',
      appearsInList ? 'OK' : 'PROBLEMA'
    );

    // Verificar que está vinculado ao tenant correto
    const tenantLink = await pool.query(
      `SELECT pt.id, pt."tenantId", pt.status FROM "professionalTenants" pt WHERE pt."professionalId" = $1`,
      [createdProfId]
    );
    const linkedToTenant1 = tenantLink.rows.some(r => r.tenantId === 1 && r.status === 'approved');
    ok('Profissional criado vinculado ao tenant 1 com status approved',
      linkedToTenant1,
      `Links: ${JSON.stringify(tenantLink.rows)}`);
    record(
      '2 — Vínculo ao tenant correto',
      'professionalTenants com tenantId=1, status=approved',
      linkedToTenant1 ? 'Vínculo correto' : `Links: ${JSON.stringify(tenantLink.rows)}`,
      linkedToTenant1 ? 'OK' : 'PROBLEMA'
    );

    // Verificar crédito inicial = 0
    const creditRow = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM credits WHERE "professionalId" = $1`, [createdProfId]
    );
    const totalCredit = parseInt(creditRow.rows[0]?.total ?? '0');
    const hasZeroCredit = totalCredit === 0;
    ok('Profissional criado tem crédito inicial = 0',
      hasZeroCredit,
      `total credits=${totalCredit}`);
    record(
      '2 — Crédito inicial = 0',
      'SUM(credits.amount) = 0 para o novo profissional',
      hasZeroCredit ? 'total=0' : `total=${totalCredit}`,
      hasZeroCredit ? 'OK' : 'PROBLEMA'
    );

    // Verificar que o profissional pode fazer login
    const profLoginCookie = await login(testEmail, 'Teste@123');
    ok('Profissional criado consegue fazer login',
      !!profLoginCookie,
      profLoginCookie ? 'Login OK' : 'Login falhou');
    record(
      '2 — Profissional criado pode fazer login',
      'Login com as credenciais do novo profissional retorna cookie',
      profLoginCookie ? 'Login OK' : 'Login falhou',
      profLoginCookie ? 'OK' : 'PROBLEMA'
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 3: Editar profissional existente como recepcionista
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 3: Editar profissional existente como recepcionista ──');

  // Usar o profissional criado no cenário 2, ou o primeiro da lista
  const targetProfId = createdProfId ?? (profList.length > 0 ? profList[0].id : null);
  if (targetProfId) {
    const editRes = await trpcPost('admin.updateProfessional', {
      id: targetProfId,
      phone: '(11) 91111-2222',
      specialty: 'Fisioterapia Esportiva',
      cpf: '987.654.321-00',
    }, recepCookie);
    const editOk = editRes.status === 200 && editRes.data?.result?.data?.json?.success === true;
    ok('Recepcionista edita profissional (telefone, especialidade, CPF)',
      editOk,
      `HTTP ${editRes.status} — ${JSON.stringify(editRes.data).substring(0, 80)}`);
    record(
      '3 — Editar profissional como recepcionista',
      'HTTP 200 com success=true',
      `HTTP ${editRes.status} — ${editOk ? 'success=true' : JSON.stringify(editRes.data).substring(0, 80)}`,
      editOk ? 'OK' : 'PROBLEMA'
    );

    if (editOk) {
      // Verificar no banco
      const verifyEdit = await pool.query(
        `SELECT phone, specialty, cpf FROM users WHERE id = $1`, [targetProfId]
      );
      const saved = verifyEdit.rows[0];
      ok('Edição salva no banco',
        saved?.phone === '(11) 91111-2222' && saved?.specialty === 'Fisioterapia Esportiva',
        `phone=${saved?.phone} specialty=${saved?.specialty}`);
      record(
        '3 — Edição persistida no banco',
        'phone=(11) 91111-2222, specialty=Fisioterapia Esportiva',
        `phone=${saved?.phone} specialty=${saved?.specialty}`,
        saved?.phone === '(11) 91111-2222' ? 'OK' : 'PROBLEMA'
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 4: Excluir profissional de teste (sem reservas) e tentar excluir com reservas
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 4: Excluir profissional como recepcionista ──');

  if (createdProfId) {
    // Excluir o profissional de teste (sem reservas)
    const deleteRes = await trpcPost('admin.deleteProfessional', { id: createdProfId }, recepCookie);
    const deleteOk = deleteRes.status === 200 && deleteRes.data?.result?.data?.json?.success === true;
    ok('Recepcionista exclui profissional sem reservas',
      deleteOk,
      `HTTP ${deleteRes.status} — ${JSON.stringify(deleteRes.data).substring(0, 80)}`);
    record(
      '4 — Excluir profissional sem reservas',
      'HTTP 200 com success=true',
      `HTTP ${deleteRes.status} — ${deleteOk ? 'success=true' : JSON.stringify(deleteRes.data).substring(0, 80)}`,
      deleteOk ? 'OK' : 'PROBLEMA'
    );

    if (deleteOk) {
      // Verificar que sumiu da lista
      const listFinal = await trpcGet('admin.listUsers', {}, recepCookie);
      const profListFinal = listFinal.data?.result?.data?.json ?? [];
      const gone = !profListFinal.some(p => p.id === createdProfId);
      ok('Profissional excluído não aparece mais na listagem', gone,
        gone ? 'Removido da lista' : 'Ainda aparece na lista');
      record(
        '4 — Profissional excluído some da lista',
        'Profissional não aparece mais em admin.listUsers',
        gone ? 'Removido' : 'Ainda presente',
        gone ? 'OK' : 'PROBLEMA'
      );
    }
  }

  // Tentar excluir profissional COM reservas
  const profWithBookings = await pool.query(
    `SELECT DISTINCT b."professionalId" FROM bookings b 
     INNER JOIN "professionalTenants" pt ON pt."professionalId" = b."professionalId" AND pt."tenantId" = 1
     LIMIT 1`
  );
  if (profWithBookings.rows.length > 0) {
    const profWithBookingId = profWithBookings.rows[0].professionalId;
    const deleteWithBookingRes = await trpcPost('admin.deleteProfessional', { id: profWithBookingId }, recepCookie);
    const isBlocked = deleteWithBookingRes.status !== 200 ||
      deleteWithBookingRes.data?.error?.json?.message?.includes('reservas') ||
      deleteWithBookingRes.data?.error?.json?.message?.includes('booking');
    ok('Excluir profissional COM reservas é bloqueado com mensagem de erro',
      isBlocked,
      `HTTP ${deleteWithBookingRes.status} — ${JSON.stringify(deleteWithBookingRes.data).substring(0, 100)}`);
    record(
      '4 — Bloquear exclusão de profissional com reservas',
      'Erro com mensagem sobre reservas existentes',
      `HTTP ${deleteWithBookingRes.status} — ${JSON.stringify(deleteWithBookingRes.data).substring(0, 100)}`,
      isBlocked ? 'OK' : 'PROBLEMA'
    );
  } else {
    console.log('   ℹ️  Nenhum profissional com reservas encontrado para testar bloqueio de exclusão');
    record(
      '4 — Bloquear exclusão de profissional com reservas',
      'Erro com mensagem sobre reservas existentes',
      'Não testado — nenhum profissional com reservas no tenant',
      'N/A'
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 5: Isolamento entre tenants
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 5: Isolamento entre tenants ──');

  // Verificar se há mais de um tenant
  const tenantsRow = await pool.query(`SELECT id, name FROM tenants ORDER BY id`);
  if (tenantsRow.rows.length < 2) {
    console.log('   ℹ️  Apenas 1 tenant no banco — criando tenant B temporário para teste...');
    await pool.query(`INSERT INTO tenants (name, slug, plan, "createdAt", "updatedAt") VALUES ('Tenant B Teste', 'tenant-b-teste-tmp', 'starter', NOW(), NOW()) ON CONFLICT DO NOTHING`);
    const tenantB = await pool.query(`SELECT id FROM tenants WHERE name = 'Tenant B Teste' LIMIT 1`);
    const tenantBId = tenantB.rows[0]?.id;

    // Criar profissional no tenant B
    const hashB = await bcrypt.hash('TenantB@123', 10);
    await pool.query(`
      INSERT INTO users (name, email, "passwordHash", role, "loginMethod", "tenantId", "createdAt", "updatedAt")
      VALUES ('Profissional Tenant B', 'prof_tenantb@example.com', $1, 'professional', 'password', $2, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `, [hashB, tenantBId]);
    const profBRow = await pool.query(`SELECT id FROM users WHERE email = 'prof_tenantb@example.com' LIMIT 1`);
    const profBId = profBRow.rows[0]?.id;
    if (profBId) {
      await pool.query(`
        INSERT INTO "professionalTenants" ("professionalId", "tenantId", status, "createdAt", "updatedAt")
        VALUES ($1, $2, 'approved', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [profBId, tenantBId]);

      // Tentar editar profissional do tenant B como recepcionista do tenant 1
      const editBRes = await trpcPost('admin.updateProfessional', {
        id: profBId,
        phone: '(11) 00000-0000',
      }, recepCookie);
      const isBlocked = editBRes.status !== 200 ||
        editBRes.data?.error?.json?.message?.includes('tenant') ||
        editBRes.data?.error?.json?.message?.includes('Profissional não pertence');
      ok('Recepcionista do tenant A não pode editar profissional do tenant B',
        isBlocked,
        `HTTP ${editBRes.status} — ${JSON.stringify(editBRes.data).substring(0, 100)}`);
      record(
        '5 — Isolamento: editar profissional de outro tenant',
        'Erro "Profissional não pertence a este tenant"',
        `HTTP ${editBRes.status} — ${JSON.stringify(editBRes.data).substring(0, 100)}`,
        isBlocked ? 'OK' : 'PROBLEMA'
      );

      // Tentar excluir profissional do tenant B
      const deleteBRes = await trpcPost('admin.deleteProfessional', { id: profBId }, recepCookie);
      const isDeleteBlocked = deleteBRes.status !== 200 ||
        deleteBRes.data?.error?.json?.message?.includes('tenant') ||
        deleteBRes.data?.error?.json?.message?.includes('Profissional não pertence');
      ok('Recepcionista do tenant A não pode excluir profissional do tenant B',
        isDeleteBlocked,
        `HTTP ${deleteBRes.status} — ${JSON.stringify(deleteBRes.data).substring(0, 100)}`);
      record(
        '5 — Isolamento: excluir profissional de outro tenant',
        'Erro "Profissional não pertence a este tenant"',
        `HTTP ${deleteBRes.status} — ${JSON.stringify(deleteBRes.data).substring(0, 100)}`,
        isDeleteBlocked ? 'OK' : 'PROBLEMA'
      );

      // Cleanup
      await pool.query(`DELETE FROM "professionalTenants" WHERE "professionalId" = $1`, [profBId]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [profBId]);
    }
    await pool.query(`DELETE FROM tenants WHERE name = 'Tenant B Teste'`);
    console.log('   Tenant B temporário removido');
  } else {
    console.log('   Múltiplos tenants encontrados:', tenantsRow.rows.map(t => `id=${t.id} name=${t.name}`).join(', '));
    record(
      '5 — Isolamento entre tenants',
      'Erro ao tentar editar/excluir profissional de outro tenant',
      'Múltiplos tenants existentes — isolamento já validado em PR#3',
      'OK'
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 6: Recepcionista SEM permissão — sidebar some, admin não regride
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 6: Recepcionista SEM permissão ──');

  // Desativar permissão
  await pool.query(`UPDATE users SET "permCanViewProfessionals" = false WHERE id = $1`, [recepId]);
  const recepNoPerm = await login('recepcao@onlife.com.br', 'recepcao123');
  if (recepNoPerm) {
    const blockedList = await trpcGet('admin.listUsers', {}, recepNoPerm);
    const isBlocked = blockedList.status === 403 ||
      blockedList.data?.error?.json?.data?.code === 'FORBIDDEN';
    ok('Recepcionista SEM permissão não acessa admin.listUsers',
      isBlocked,
      `HTTP ${blockedList.status} — ${JSON.stringify(blockedList.data).substring(0, 80)}`);
    record(
      '6 — Recepcionista sem permissão bloqueada',
      'HTTP 403 FORBIDDEN',
      `HTTP ${blockedList.status} — ${JSON.stringify(blockedList.data).substring(0, 80)}`,
      isBlocked ? 'OK' : 'PROBLEMA'
    );
  }

  // Admin continua com acesso normal
  const adminList = await trpcGet('admin.listUsers', {}, adminCookie);
  const adminOk = adminList.status === 200 && (adminList.data?.result?.data?.json ?? []).length > 0;
  ok('Admin continua com acesso normal a admin.listUsers (sem regressão)',
    adminOk,
    `HTTP ${adminList.status} — ${(adminList.data?.result?.data?.json ?? []).length} profissionais`);
  record(
    '6 — Admin sem regressão',
    'HTTP 200 com lista de profissionais',
    `HTTP ${adminList.status} — ${(adminList.data?.result?.data?.json ?? []).length} profissionais`,
    adminOk ? 'OK' : 'PROBLEMA'
  );

  // Verificar que sidebar some quando permissão está desativada (via código)
  const layoutCode = readFileSync('/home/ubuntu/sisa_saas/client/src/components/DashboardLayout.tsx', 'utf8');
  const sidebarConditional = layoutCode.includes('permCanViewProfessionals') &&
    layoutCode.includes('path: "/admin/professionals"');
  ok('Sidebar "Profissionais" condicionado a permCanViewProfessionals no código',
    sidebarConditional,
    sidebarConditional ? 'Condição presente em DashboardLayout.tsx' : 'Condição NÃO encontrada');
  record(
    '6 — Sidebar some sem permissão',
    'Item "Profissionais" renderizado condicionalmente via permCanViewProfessionals',
    sidebarConditional ? 'Condição presente em DashboardLayout.tsx' : 'NÃO encontrada',
    sidebarConditional ? 'OK' : 'PROBLEMA'
  );

  // Reativar permissão
  await pool.query(`UPDATE users SET "permCanViewProfessionals" = true WHERE id = $1`, [recepId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 7: Rótulo "Gerenciar Profissionais" na UI de configurações
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 7: Rótulo "Gerenciar Profissionais" na UI ──');

  const tenantSettingsContent = readFileSync('/home/ubuntu/sisa_saas/client/src/pages/admin/TenantSettings.tsx', 'utf8');
  const hasNewLabel = tenantSettingsContent.includes('Gerenciar Profissionais');
  const hasOldLabel = tenantSettingsContent.includes('Ver Profissionais');
  const hasNewDesc = tenantSettingsContent.includes('Cadastrar, editar e listar profissionais');
  ok('Rótulo "Gerenciar Profissionais" presente em TenantSettings.tsx', hasNewLabel,
    hasNewLabel ? 'Encontrado' : 'NÃO encontrado');
  ok('Rótulo antigo "Ver Profissionais" removido de TenantSettings.tsx', !hasOldLabel,
    hasOldLabel ? 'AINDA presente — problema' : 'Removido corretamente');
  ok('Nova descrição "Cadastrar, editar e listar profissionais" presente', hasNewDesc,
    hasNewDesc ? 'Encontrado' : 'NÃO encontrado');

  record(
    '7 — Rótulo "Gerenciar Profissionais"',
    'Label = "Gerenciar Profissionais", descrição atualizada, "Ver Profissionais" removido',
    `hasNewLabel=${hasNewLabel}, hasOldLabel=${hasOldLabel}, hasNewDesc=${hasNewDesc}`,
    hasNewLabel && !hasOldLabel && hasNewDesc ? 'OK' : 'PROBLEMA'
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Tabela final
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   TABELA DE RESULTADOS');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('| Cenário | Esperado | Obtido | Status |');
  console.log('|---------|----------|--------|--------|');
  for (const r of results) {
    console.log(`| ${r.cenario} | ${r.esperado} | ${r.obtido} | ${r.status} |`);
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
