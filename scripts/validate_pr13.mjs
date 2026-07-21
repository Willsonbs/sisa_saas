const BASE = 'http://localhost:3000';

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

function naturalCompare(a, b) {
  const tokenize = (s) => {
    const tokens = [];
    const re = /(\d+)|(\D+)/g;
    let m;
    while ((m = re.exec(s)) !== null) tokens.push(m[1] !== undefined ? parseInt(m[1]) : m[2]);
    return tokens;
  };
  const ax = tokenize(a), bx = tokenize(b);
  for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
    const av = ax[i], bv = bx[i];
    if (typeof av === 'number' && typeof bv === 'number') { if (av !== bv) return av - bv; }
    else { const as = String(av), bs = String(bv); if (as !== bs) return as < bs ? -1 : 1; }
  }
  return ax.length - bx.length;
}

async function main() {
  const loginRes = await fetch(BASE + '/api/trpc/auth.login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email: 'empresa@example.com', password: 'admin@123' } }),
  });
  const cookie = loginRes.headers.get('set-cookie')?.match(/auth_token=([^;]+)/)?.[0];
  console.log('Login admin:', cookie ? 'OK' : 'FALHOU');

  // Cenário 5: Nomes não-numéricos
  console.log('\n=== Cenário 5: Nomes não-numéricos ===');
  const rooms = await trpcGet('rooms.list', {}, cookie);
  const names = rooms.data?.map(r => r.name) || [];
  console.log('Salas:', names.join(', '));
  const nonNumeric = names.filter(n => !/\d/.test(n));
  console.log('Salas sem número:', nonNumeric.length > 0 ? nonNumeric.join(', ') : 'nenhuma');
  const testRoomIdx = names.indexOf('Test Room');
  const c16Idx = names.indexOf('Consultório 16');
  console.log('"Test Room" posição:', testRoomIdx, '| "Consultório 16" posição:', c16Idx);
  console.log(testRoomIdx > c16Idx ? '✅' : '❌', '"Test Room" aparece após Consultório 16 (ordem sensata)');

  // Cenário 6a: Criar sala
  console.log('\n=== Cenário 6: Regressão CRUD ===');
  const createRes = await trpcPost('rooms.create', {
    name: 'Sala Regressao PR13', capacity: 2, pricePerHour: 5000,
    availableMonday: true, availableTuesday: true, availableWednesday: true,
    availableThursday: true, availableFriday: true, availableSaturday: false, availableSunday: false,
    openTime: '08:00', closeTime: '18:00',
  }, cookie);
  console.log('Criar sala: HTTP', createRes.status, 'success=', createRes.data?.success);
  console.log(createRes.data?.success ? '✅' : '❌', 'Criar sala OK');

  const roomsAfterCreate = await trpcGet('rooms.list', {}, cookie);
  const namesAfterCreate = roomsAfterCreate.data?.map(r => r.name) || [];
  const newIdx = namesAfterCreate.indexOf('Sala Regressao PR13');
  console.log('"Sala Regressao PR13" posição:', newIdx, '(total:', namesAfterCreate.length + ')');
  console.log('Ordem após criar:', namesAfterCreate.join(', '));

  // Cenário 6b: Editar sala criada
  const newRoom = roomsAfterCreate.data?.find(r => r.name === 'Sala Regressao PR13');
  const editRes = await trpcPost('rooms.update', { id: newRoom?.id, capacity: 3 }, cookie);
  console.log('Editar sala: HTTP', editRes.status, 'success=', editRes.data?.success);
  console.log(editRes.data?.success ? '✅' : '❌', 'Editar sala OK');

  // Verificar posição estável após edição
  const roomsAfterEdit = await trpcGet('rooms.list', {}, cookie);
  const namesAfterEdit = roomsAfterEdit.data?.map(r => r.name) || [];
  const posAfterEdit = namesAfterEdit.indexOf('Sala Regressao PR13');
  console.log('Posição após edição:', posAfterEdit, '(esperado:', newIdx + ')');
  console.log(posAfterEdit === newIdx ? '✅' : '❌', 'Posição estável após edição');

  // Cenário 6c: Excluir sala criada
  const deleteRes = await trpcPost('rooms.delete', { id: newRoom?.id }, cookie);
  console.log('Excluir sala: HTTP', deleteRes.status, 'success=', deleteRes.data?.success);
  console.log(deleteRes.data?.success ? '✅' : '❌', 'Excluir sala OK');

  // Cenário 6d: Relatórios
  console.log('\n=== Cenário 6d: Relatórios ===');
  const report = await trpcGet('admin.reportByRoom', {}, cookie);
  console.log('reportByRoom: HTTP', report.status, 'salas=', report.data?.length || 0);
  const reportNames = report.data?.map(r => r.room?.name) || [];
  console.log('Salas no relatório:', reportNames.join(', '));
  const sortedReport = [...reportNames].sort(naturalCompare);
  const isNaturalReport = JSON.stringify(reportNames) === JSON.stringify(sortedReport);
  console.log(isNaturalReport ? '✅' : '❌', 'Relatório em ordem natural');
  console.log(report.status === 200 ? '✅' : '❌', 'Relatório sem regressão');
}

main().catch(e => console.error('ERRO:', e.message));
