/**
 * Validação do PR #8 — Recepção acessa tela completa de Gerenciar Salas
 * Cenários 1-8 conforme especificado
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
  // superjson: datas precisam de meta.values para serem desserializadas como Date
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
  // superjson: serializar Date com meta.values
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   VALIDAÇÃO PR#8 — Recepção: Tela Completa de Gerenciar Salas');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Garantir que recepcionista tem permCanViewRooms ativado
  const recepRow = await pool.query(
    `SELECT id, email, "permCanViewRooms" FROM users WHERE email = 'recepcao@onlife.com.br'`
  );
  const recepId = recepRow.rows[0]?.id;
  await pool.query(`UPDATE users SET "permCanViewRooms" = true WHERE id = $1`, [recepId]);

  console.log('🔐 Fazendo login como recepção (recepcao@onlife.com.br)...');
  const recepCookie = await login('recepcao@onlife.com.br', 'recepcao123');
  if (!recepCookie) { console.log('❌ Login de recepção falhou'); pool.end(); return; }
  console.log('   Login OK\n');

  console.log('🔐 Fazendo login como admin (empresa@example.com)...');
  const adminCookie = await login('empresa@example.com', 'admin@123');
  if (!adminCookie) { console.log('❌ Login admin falhou'); pool.end(); return; }
  console.log('   Login OK\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 1: Sidebar renomeado para "Gerenciar Salas"
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('── Cenário 1: Sidebar renomeado para "Gerenciar Salas" ──');
  const layoutContent = readFileSync('/home/ubuntu/sisa_saas/client/src/components/DashboardLayout.tsx', 'utf8');
  const hasNewLabel = layoutContent.includes('"Gerenciar Salas"');
  const hasOldLabel = layoutContent.includes('"Salas"') && !layoutContent.includes('"Gerenciar Salas"');
  const pointsToAdminRooms = layoutContent.includes('path: "/admin/rooms"') && layoutContent.includes('permCanViewRooms');
  ok('Sidebar "Gerenciar Salas" presente em DashboardLayout.tsx', hasNewLabel);
  ok('Sidebar aponta para /admin/rooms condicionado a permCanViewRooms', pointsToAdminRooms);
  record('1 — Sidebar renomeado para "Gerenciar Salas"',
    'Label "Gerenciar Salas" apontando para /admin/rooms',
    `hasNewLabel=${hasNewLabel}, pointsToAdminRooms=${pointsToAdminRooms}`,
    hasNewLabel && pointsToAdminRooms ? 'OK' : 'PROBLEMA');

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 2: Criar sala como recepcionista
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 2: Criar sala como recepcionista ──');
  const createRoomRes = await trpcPost('rooms.create', {
    name: 'Sala Teste Recepção PR8',
    capacity: 3,
    pricePerHour: 15000, // R$150,00 em centavos
    description: 'Sala criada pelo script de validação do PR8',
    equipment: ['Ar condicionado', 'Maca', 'Cadeira'],
    isActive: true,
  }, recepCookie);
  const createdRoom = createRoomRes.data?.result?.data?.json;
  const createRoomOk = createRoomRes.status === 200 && (createdRoom?.id || createdRoom?.success);
  ok('Recepcionista cria sala via rooms.create',
    createRoomOk,
    `HTTP ${createRoomRes.status} — ${JSON.stringify(createRoomRes.data).substring(0, 80)}`);
  record('2 — Criar sala como recepcionista',
    'HTTP 200 com id ou success=true',
    `HTTP ${createRoomRes.status} — ${createRoomOk ? 'OK' : JSON.stringify(createRoomRes.data).substring(0, 80)}`,
    createRoomOk ? 'OK' : 'PROBLEMA');

  // Buscar o id da sala criada pelo nome
  let createdRoomId = createdRoom?.id ?? null;
  if (!createdRoomId) {
    const roomRow = await pool.query(
      `SELECT id FROM rooms WHERE name = 'Sala Teste Recepção PR8' AND "tenantId" = 1 LIMIT 1`
    );
    createdRoomId = roomRow.rows[0]?.id ?? null;
  }

  if (createRoomOk && createdRoomId) {
    // Verificar que aparece na listagem
    const listRes = await trpcGet('rooms.list', { includeInactive: true }, recepCookie);
    const roomList = listRes.data?.result?.data?.json ?? [];
    const appearsInList = roomList.some(r => r.id === createdRoomId || r.name === 'Sala Teste Recepção PR8');
    ok('Sala criada aparece na listagem', appearsInList,
      `${roomList.length} salas, id=${createdRoomId} ${appearsInList ? 'encontrado' : 'NÃO encontrado'}`);
    record('2 — Sala criada aparece na listagem',
      'Sala presente em rooms.list',
      appearsInList ? 'Encontrada' : 'NÃO encontrada',
      appearsInList ? 'OK' : 'PROBLEMA');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 3: Editar sala como recepcionista
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 3: Editar sala como recepcionista ──');
  const targetRoomId = createdRoomId;
  if (targetRoomId) {
    const editRoomRes = await trpcPost('rooms.update', {
      id: targetRoomId,
      pricePerHour: 18000, // R$180,00
      capacity: 4,
      equipment: ['Ar condicionado', 'Maca', 'Cadeira', 'Projetor'],
    }, recepCookie);
    const editOk = editRoomRes.status === 200 &&
      (editRoomRes.data?.result?.data?.json?.success === true || editRoomRes.data?.result?.data?.json?.id);
    ok('Recepcionista edita sala via rooms.update',
      editOk,
      `HTTP ${editRoomRes.status} — ${JSON.stringify(editRoomRes.data).substring(0, 80)}`);
    record('3 — Editar sala como recepcionista',
      'HTTP 200 com success=true',
      `HTTP ${editRoomRes.status} — ${editOk ? 'OK' : JSON.stringify(editRoomRes.data).substring(0, 80)}`,
      editOk ? 'OK' : 'PROBLEMA');

    if (editOk) {
      const verifyEdit = await pool.query(
        `SELECT "pricePerHour", capacity FROM rooms WHERE id = $1`, [targetRoomId]
      );
      const saved = verifyEdit.rows[0];
      const persistOk = parseInt(saved?.pricePerHour) === 18000 && parseInt(saved?.capacity) === 4;
      ok('Edição persistida no banco (preço e capacidade)',
        persistOk,
        `pricePerHour=${saved?.pricePerHour} capacity=${saved?.capacity}`);
      record('3 — Edição persistida no banco',
        'pricePerHour=18000, capacity=4',
        `pricePerHour=${saved?.pricePerHour} capacity=${saved?.capacity}`,
        persistOk ? 'OK' : 'PROBLEMA');
    }
  } else {
    console.log('   ⚠️  Sem sala de teste para editar (cenário 2 falhou)');
    record('3 — Editar sala', 'HTTP 200', 'Não testado (cenário 2 falhou)', 'N/A');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 4: Inativar e excluir sala; bloquear exclusão com reservas
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 4: Inativar e excluir sala como recepcionista ──');
  if (targetRoomId) {
    // Inativar
    const inactivateRes = await trpcPost('rooms.update', {
      id: targetRoomId,
      isActive: false,
    }, recepCookie);
    const inactivateOk = inactivateRes.status === 200 &&
      (inactivateRes.data?.result?.data?.json?.success === true || inactivateRes.data?.result?.data?.json?.id);
    ok('Recepcionista inativa sala via rooms.update (isActive=false)',
      inactivateOk,
      `HTTP ${inactivateRes.status}`);
    record('4 — Inativar sala como recepcionista',
      'HTTP 200 com success=true',
      `HTTP ${inactivateRes.status} — ${inactivateOk ? 'OK' : JSON.stringify(inactivateRes.data).substring(0, 80)}`,
      inactivateOk ? 'OK' : 'PROBLEMA');

    // Excluir definitivamente (deleteHard)
    const deleteRes = await trpcPost('rooms.deleteHard', { id: targetRoomId }, recepCookie);
    const deleteOk = deleteRes.status === 200 &&
      (deleteRes.data?.result?.data?.json?.success === true || deleteRes.data?.result?.data?.json?.id);
    ok('Recepcionista exclui sala definitivamente via rooms.deleteHard',
      deleteOk,
      `HTTP ${deleteRes.status} — ${JSON.stringify(deleteRes.data).substring(0, 80)}`);
    record('4 — Excluir sala definitivamente como recepcionista',
      'HTTP 200 com success=true',
      `HTTP ${deleteRes.status} — ${deleteOk ? 'OK' : JSON.stringify(deleteRes.data).substring(0, 80)}`,
      deleteOk ? 'OK' : 'PROBLEMA');

    if (deleteOk) {
      const listFinal = await trpcGet('rooms.list', { includeInactive: true }, recepCookie);
      const roomListFinal = listFinal.data?.result?.data?.json ?? [];
      const gone = !roomListFinal.some(r => r.id === targetRoomId);
      ok('Sala excluída não aparece mais na listagem', gone,
        gone ? 'Removida' : 'Ainda presente');
      record('4 — Sala excluída some da listagem',
        'Sala não aparece em rooms.list',
        gone ? 'Removida' : 'Ainda presente',
        gone ? 'OK' : 'PROBLEMA');
    }
  } else {
    record('4 — Inativar/excluir sala', 'HTTP 200', 'Não testado (cenário 2 falhou)', 'N/A');
  }

  // Tentar excluir sala COM reservas
  const roomWithBookings = await pool.query(
    `SELECT DISTINCT b."roomId" FROM bookings b 
     INNER JOIN rooms r ON r.id = b."roomId" AND r."tenantId" = 1
     LIMIT 1`
  );
  if (roomWithBookings.rows.length > 0) {
    const roomWithBookingId = roomWithBookings.rows[0].roomId;
    const deleteWithBookingRes = await trpcPost('rooms.deleteHard', { id: roomWithBookingId }, recepCookie);
    const isBlocked = deleteWithBookingRes.status !== 200 ||
      JSON.stringify(deleteWithBookingRes.data).includes('reservas');
    ok('Excluir sala COM reservas é bloqueado com mensagem de erro',
      isBlocked,
      `HTTP ${deleteWithBookingRes.status} — ${JSON.stringify(deleteWithBookingRes.data).substring(0, 100)}`);
    record('4 — Bloquear exclusão de sala com reservas',
      'Erro "sala possui reservas registradas"',
      `HTTP ${deleteWithBookingRes.status} — ${JSON.stringify(deleteWithBookingRes.data).substring(0, 100)}`,
      isBlocked ? 'OK' : 'PROBLEMA');
  } else {
    record('4 — Bloquear exclusão de sala com reservas', 'Erro com mensagem de reservas', 'Não testado — sem sala com reservas', 'N/A');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 5: Bloqueios de Sala como recepcionista
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 5: Bloqueios de Sala como recepcionista ──');

  // Pegar uma sala existente do tenant
  const existingRoomRow = await pool.query(
    `SELECT id FROM rooms WHERE "tenantId" = 1 AND "isActive" = true LIMIT 1`
  );
  const existingRoomId = existingRoomRow.rows[0]?.id;

  if (existingRoomId) {
    // Listar bloqueios — startDate e endDate são obrigatórios
    const today = new Date();
    const nextMonth = new Date(today.getTime() + 30 * 86400000);
    const listBlocksRes = await trpcGet('roomBlocks.list', {
      roomId: existingRoomId,
      startDate: today,
      endDate: nextMonth,
    }, recepCookie);
    const listBlocksOk = listBlocksRes.status === 200;
    ok('Recepcionista lista bloqueios via roomBlocks.list',
      listBlocksOk,
      `HTTP ${listBlocksRes.status}`);
    record('5 — Listar bloqueios como recepcionista',
      'HTTP 200 (antes retornava FORBIDDEN)',
      `HTTP ${listBlocksRes.status}`,
      listBlocksOk ? 'OK' : 'PROBLEMA');

    // Criar bloqueio
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const blockStart = new Date(tomorrow);
    blockStart.setHours(9, 0, 0, 0);
    const blockEnd = new Date(tomorrow);
    blockEnd.setHours(11, 0, 0, 0);

    const createBlockRes = await trpcPost('roomBlocks.create', {
      roomId: existingRoomId,
      startTime: blockStart,
      endTime: blockEnd,
      reason: 'maintenance',
      notes: 'Manutenção preventiva (teste PR8)',
    }, recepCookie);
    const createdBlock = createBlockRes.data?.result?.data?.json;
    const createBlockOk = createBlockRes.status === 200 && (createdBlock?.id || createdBlock?.success);
    ok('Recepcionista cria bloqueio via roomBlocks.create',
      createBlockOk,
      `HTTP ${createBlockRes.status} — ${JSON.stringify(createBlockRes.data).substring(0, 80)}`);
    record('5 — Criar bloqueio como recepcionista',
      'HTTP 200 com id do bloqueio (antes retornava FORBIDDEN)',
      `HTTP ${createBlockRes.status} — ${createBlockOk ? 'OK' : JSON.stringify(createBlockRes.data).substring(0, 80)}`,
      createBlockOk ? 'OK' : 'PROBLEMA');

    let createdBlockId = createdBlock?.id ?? null;
    if (!createdBlockId && createBlockOk) {
      const blockRow = await pool.query(
        `SELECT id FROM "roomBlocks" WHERE "roomId" = $1 AND notes = 'Manutenção preventiva (teste PR8)' LIMIT 1`,
        [existingRoomId]
      );
      createdBlockId = blockRow.rows[0]?.id ?? null;
    }

    if (createBlockOk && createdBlockId) {
      // Verificar que aparece na listagem
      const listAfterBlock = await trpcGet('roomBlocks.list', {
      roomId: existingRoomId,
      startDate: today,
      endDate: nextMonth,
    }, recepCookie);
      const blockList = listAfterBlock.data?.result?.data?.json ?? [];
      const blockInList = blockList.some(b => b.id === createdBlockId || (b.notes && b.notes.includes('teste PR8')));
      ok('Bloqueio criado aparece na listagem', blockInList,
        `${blockList.length} bloqueios, id=${createdBlockId} ${blockInList ? 'encontrado' : 'NÃO encontrado'}`);
      record('5 — Bloqueio aparece na listagem',
        'Bloqueio presente em roomBlocks.list',
        blockInList ? 'Encontrado' : 'NÃO encontrado',
        blockInList ? 'OK' : 'PROBLEMA');

      // Remover bloqueio
      const deleteBlockRes = await trpcPost('roomBlocks.delete', { id: createdBlockId }, recepCookie);
      const deleteBlockOk = deleteBlockRes.status === 200 &&
        (deleteBlockRes.data?.result?.data?.json?.success === true || deleteBlockRes.data?.result?.data?.json?.id);
      ok('Recepcionista remove bloqueio via roomBlocks.delete',
        deleteBlockOk,
        `HTTP ${deleteBlockRes.status} — ${JSON.stringify(deleteBlockRes.data).substring(0, 80)}`);
      record('5 — Remover bloqueio como recepcionista',
        'HTTP 200 com success=true',
        `HTTP ${deleteBlockRes.status} — ${deleteBlockOk ? 'OK' : JSON.stringify(deleteBlockRes.data).substring(0, 80)}`,
        deleteBlockOk ? 'OK' : 'PROBLEMA');
    }
  } else {
    console.log('   ⚠️  Nenhuma sala ativa encontrada para testar bloqueios');
    record('5 — Bloqueios de Sala', 'HTTP 200', 'Não testado — sem sala ativa', 'N/A');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 6: Isolamento entre tenants
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 6: Isolamento entre tenants ──');

  // Criar tenant B temporário
  await pool.query(`INSERT INTO tenants (name, slug, plan, "createdAt", "updatedAt") VALUES ('Tenant B Salas', 'tenant-b-salas-tmp', 'starter', NOW(), NOW()) ON CONFLICT DO NOTHING`);
  const tenantBRow = await pool.query(`SELECT id FROM tenants WHERE slug = 'tenant-b-salas-tmp' LIMIT 1`);
  const tenantBId = tenantBRow.rows[0]?.id;

  if (tenantBId) {
    // Criar sala no tenant B
    const roomBInsert = await pool.query(
      `INSERT INTO rooms (name, capacity, "pricePerHour", "isActive", "tenantId", "createdAt", "updatedAt") VALUES ('Sala Tenant B', 2, 10000, true, $1, NOW(), NOW()) RETURNING id`,
      [tenantBId]
    );
    const roomBId = roomBInsert.rows[0]?.id;
    if (roomBId) {

      // Tentar editar sala do tenant B como recepcionista do tenant 1
      const editBRes = await trpcPost('rooms.update', {
        id: roomBId,
        pricePerHour: 99999,
      }, recepCookie);
      const isEditBlocked = editBRes.status !== 200 ||
        JSON.stringify(editBRes.data).toLowerCase().includes('not found') ||
        JSON.stringify(editBRes.data).toLowerCase().includes('forbidden') ||
        JSON.stringify(editBRes.data).toLowerCase().includes('tenant');
      ok('Recepcionista do tenant A não pode editar sala do tenant B',
        isEditBlocked,
        `HTTP ${editBRes.status} — ${JSON.stringify(editBRes.data).substring(0, 100)}`);
      record('6 — Isolamento: editar sala de outro tenant',
        'Erro (not found ou forbidden)',
        `HTTP ${editBRes.status} — ${JSON.stringify(editBRes.data).substring(0, 100)}`,
        isEditBlocked ? 'OK' : 'PROBLEMA');

      // Tentar excluir sala do tenant B
      const deleteBRes = await trpcPost('rooms.deleteHard', { id: roomBId }, recepCookie);
      const isDeleteBlocked = deleteBRes.status !== 200 ||
        JSON.stringify(deleteBRes.data).toLowerCase().includes('not found') ||
        JSON.stringify(deleteBRes.data).toLowerCase().includes('forbidden') ||
        JSON.stringify(deleteBRes.data).toLowerCase().includes('tenant');
      ok('Recepcionista do tenant A não pode excluir sala do tenant B',
        isDeleteBlocked,
        `HTTP ${deleteBRes.status} — ${JSON.stringify(deleteBRes.data).substring(0, 100)}`);
      record('6 — Isolamento: excluir sala de outro tenant',
        'Erro (not found ou forbidden)',
        `HTTP ${deleteBRes.status} — ${JSON.stringify(deleteBRes.data).substring(0, 100)}`,
        isDeleteBlocked ? 'OK' : 'PROBLEMA');

      // Tentar criar bloqueio em sala do tenant B
      const blockBRes = await trpcPost('roomBlocks.create', {
        roomId: roomBId,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        reason: 'Teste isolamento',
      }, recepCookie);
      const isBlockBlocked = blockBRes.status !== 200 ||
        JSON.stringify(blockBRes.data).toLowerCase().includes('not found') ||
        JSON.stringify(blockBRes.data).toLowerCase().includes('forbidden') ||
        JSON.stringify(blockBRes.data).toLowerCase().includes('tenant');
      ok('Recepcionista do tenant A não pode bloquear sala do tenant B',
        isBlockBlocked,
        `HTTP ${blockBRes.status} — ${JSON.stringify(blockBRes.data).substring(0, 100)}`);
      record('6 — Isolamento: bloquear sala de outro tenant',
        'Erro (not found ou forbidden)',
        `HTTP ${blockBRes.status} — ${JSON.stringify(blockBRes.data).substring(0, 100)}`,
        isBlockBlocked ? 'OK' : 'PROBLEMA');

      // Cleanup
      await pool.query(`DELETE FROM rooms WHERE id = $1`, [roomBId]);
    } else {
      await pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantBId]);
    }
    await pool.query(`DELETE FROM tenants WHERE id = $1`, [tenantBId]);
    console.log('   Tenant B temporário removido');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 7: Recepcionista SEM permissão "Ver Salas"
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 7: Recepcionista SEM permissão "Ver Salas" ──');

  await pool.query(`UPDATE users SET "permCanViewRooms" = false WHERE id = $1`, [recepId]);
  const recepNoPerm = await login('recepcao@onlife.com.br', 'recepcao123');
  if (recepNoPerm) {
    // Tentar criar sala
    const blockedCreate = await trpcPost('rooms.create', {
      name: 'Sala Bloqueada',
      capacity: 1,
      pricePerHour: 5000,
      isActive: true,
    }, recepNoPerm);
    const isCreateBlocked = blockedCreate.status === 403 ||
      blockedCreate.data?.error?.json?.data?.code === 'FORBIDDEN';
    ok('Recepcionista SEM permissão não pode criar sala (rooms.create)',
      isCreateBlocked,
      `HTTP ${blockedCreate.status} — ${JSON.stringify(blockedCreate.data).substring(0, 80)}`);
    record('7 — Sem permissão: rooms.create bloqueado',
      'HTTP 403 FORBIDDEN',
      `HTTP ${blockedCreate.status}`,
      isCreateBlocked ? 'OK' : 'PROBLEMA');

    // Tentar listar bloqueios
    const blockedBlockList = await trpcGet('roomBlocks.list', { roomId: existingRoomId ?? 1 }, recepNoPerm);
    const isBlockListBlocked = blockedBlockList.status === 403 ||
      blockedBlockList.data?.error?.json?.data?.code === 'FORBIDDEN';
    ok('Recepcionista SEM permissão não pode listar bloqueios (roomBlocks.list)',
      isBlockListBlocked,
      `HTTP ${blockedBlockList.status}`);
    record('7 — Sem permissão: roomBlocks.list bloqueado',
      'HTTP 403 FORBIDDEN',
      `HTTP ${blockedBlockList.status}`,
      isBlockListBlocked ? 'OK' : 'PROBLEMA');
  }

  // Verificar sidebar condicional no código
  const sidebarConditional = layoutContent.includes('permCanViewRooms') &&
    layoutContent.includes('"Gerenciar Salas"');
  ok('Sidebar "Gerenciar Salas" condicionado a permCanViewRooms no código',
    sidebarConditional,
    sidebarConditional ? 'Condição presente em DashboardLayout.tsx' : 'NÃO encontrada');
  record('7 — Sidebar some sem permissão',
    'Item renderizado condicionalmente via permCanViewRooms',
    sidebarConditional ? 'Condição presente' : 'NÃO encontrada',
    sidebarConditional ? 'OK' : 'PROBLEMA');

  // Reativar permissão
  await pool.query(`UPDATE users SET "permCanViewRooms" = true WHERE id = $1`, [recepId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Cenário 8: Admin sem regressão
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── Cenário 8: Admin sem regressão ──');

  // Admin lista salas
  const adminRooms = await trpcGet('rooms.list', { includeInactive: true }, adminCookie);
  const adminRoomsOk = adminRooms.status === 200 && (adminRooms.data?.result?.data?.json ?? []).length > 0;
  ok('Admin acessa rooms.list normalmente',
    adminRoomsOk,
    `HTTP ${adminRooms.status} — ${(adminRooms.data?.result?.data?.json ?? []).length} salas`);
  record('8 — Admin: rooms.list sem regressão',
    'HTTP 200 com lista de salas',
    `HTTP ${adminRooms.status} — ${(adminRooms.data?.result?.data?.json ?? []).length} salas`,
    adminRoomsOk ? 'OK' : 'PROBLEMA');

  // Admin lista bloqueios
  const adminBlocksStart = new Date();
  const adminBlocksEnd = new Date(adminBlocksStart.getTime() + 30 * 86400000);
  const adminBlocks = await trpcGet('roomBlocks.list', {
    roomId: existingRoomId ?? 1,
    startDate: adminBlocksStart,
    endDate: adminBlocksEnd,
  }, adminCookie);
  const adminBlocksOk = adminBlocks.status === 200;
  ok('Admin acessa roomBlocks.list normalmente',
    adminBlocksOk,
    `HTTP ${adminBlocks.status}`);
  record('8 — Admin: roomBlocks.list sem regressão',
    'HTTP 200',
    `HTTP ${adminBlocks.status}`,
    adminBlocksOk ? 'OK' : 'PROBLEMA');

  // Admin cria sala de teste e exclui
  const adminCreateRes = await trpcPost('rooms.create', {
    name: 'Sala Admin Teste PR8',
    capacity: 2,
    pricePerHour: 8000,
    isActive: true,
  }, adminCookie);
  const adminCreateOk = adminCreateRes.status === 200;
  ok('Admin cria sala normalmente (sem regressão)',
    adminCreateOk,
    `HTTP ${adminCreateRes.status}`);
  record('8 — Admin: rooms.create sem regressão',
    'HTTP 200',
    `HTTP ${adminCreateRes.status}`,
    adminCreateOk ? 'OK' : 'PROBLEMA');

  if (adminCreateOk) {
    const adminRoomRow = await pool.query(
      `SELECT id FROM rooms WHERE name = 'Sala Admin Teste PR8' AND "tenantId" = 1 LIMIT 1`
    );
    const adminRoomId = adminRoomRow.rows[0]?.id;
    if (adminRoomId) {
      await trpcPost('rooms.deleteHard', { id: adminRoomId }, adminCookie);
    }
  }

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
