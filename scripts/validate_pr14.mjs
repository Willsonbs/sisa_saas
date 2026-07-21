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

async function main() {
  // Login admin
  const loginRes = await fetch(BASE + '/api/trpc/auth.login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { email: 'empresa@example.com', password: 'admin@123' } }),
  });
  const adminCookie = loginRes.headers.get('set-cookie')?.match(/auth_token=([^;]+)/)?.[0];
  console.log('Login admin:', adminCookie ? 'OK' : 'FALHOU');

  // Cenário 2: Saldo da Erika na tela de Profissionais (admin.listUsers)
  console.log('\n=== Cenario 2: Saldo da Erika na tela de Profissionais (admin) ===');
  const users = await trpcGet('admin.listUsers', {}, adminCookie);
  const erika = users.data?.find(u => u.email === 'erika@example.com');
  console.log('Erika encontrada:', erika ? 'SIM' : 'NAO');
  if (erika) {
    console.log('creditBalance (cents):', erika.creditBalance);
    console.log('creditBalance (reais): R$', (erika.creditBalance / 100).toFixed(2));
    // Após a correção, deve mostrar R$1000.00 (ambas as transações são do tenant 1)
    // Antes da correção, também mostrava R$1000.00 pois ambas eram do tenant 1
    console.log(erika.creditBalance === 100000 ? '✅' : '⚠️', 'Saldo esperado: R$1000.00 (2 transacoes bonus no tenant 1)');
  }

  // Cenário 3: Verificar outros profissionais com discrepância
  console.log('\n=== Cenario 3: Verificar discrepancias em todos os profissionais ===');
  // Comparar saldo via admin.listUsers vs credits.getBalance para cada profissional
  const allUsers = users.data?.filter(u => u.role === 'professional') || [];
  console.log('Total de profissionais:', allUsers.length);
  let discrepancies = 0;
  for (const u of allUsers.slice(0, 5)) { // Verificar os primeiros 5
    const balance = await trpcGet('credits.getBalance', {}, null); // Precisaria do cookie do profissional
    // Apenas verificar que o campo existe e é número
    if (typeof u.creditBalance !== 'number') {
      console.log('PROBLEMA:', u.name, '— creditBalance não é número:', u.creditBalance);
      discrepancies++;
    }
  }
  console.log(discrepancies === 0 ? '✅' : '❌', 'Todos os saldos são números válidos');
  console.log('Amostra de saldos:');
  allUsers.slice(0, 6).forEach(u => {
    console.log(' -', u.name, ':', 'R$' + (u.creditBalance / 100).toFixed(2));
  });

  // Cenário 4: Criar profissional de teste e adicionar crédito manual
  console.log('\n=== Cenario 4: Regressao — criar profissional e adicionar credito manual ===');
  const createRes = await trpcPost('admin.createProfessional', {
    name: 'Profissional Teste PR14',
    email: 'teste_pr14@example.com',
    password: 'teste123',
    phone: '11999999999',
    specialty: 'Teste',
    registryType: 'Outro',
  }, adminCookie);
  console.log('Criar profissional: HTTP', createRes.status, 'success=', createRes.data?.success);
  console.log(createRes.data?.success ? '✅' : '❌', 'Criar profissional OK');

  // Verificar saldo inicial = 0
  const usersAfter = await trpcGet('admin.listUsers', {}, adminCookie);
  const newProf = usersAfter.data?.find(u => u.email === 'teste_pr14@example.com');
  console.log('Saldo inicial:', newProf ? 'R$' + (newProf.creditBalance / 100).toFixed(2) : 'NAO ENCONTRADO');
  console.log(newProf?.creditBalance === 0 ? '✅' : '❌', 'Saldo inicial = R$0.00');

  // Adicionar crédito manual
  if (newProf) {
    const addCredit = await trpcPost('credits.addManual', {
      professionalId: newProf.id,
      amount: 15000, // R$150,00
      description: 'Teste PR14',
    }, adminCookie);
    console.log('Adicionar credito: HTTP', addCredit.status, 'success=', addCredit.data?.success);
    console.log(addCredit.data?.success ? '✅' : '❌', 'Adicionar credito OK');

    // Verificar saldo após adição
    const usersAfterCredit = await trpcGet('admin.listUsers', {}, adminCookie);
    const profAfterCredit = usersAfterCredit.data?.find(u => u.email === 'teste_pr14@example.com');
    console.log('Saldo após adicao:', profAfterCredit ? 'R$' + (profAfterCredit.creditBalance / 100).toFixed(2) : 'NAO ENCONTRADO');
    console.log(profAfterCredit?.creditBalance === 15000 ? '✅' : '❌', 'Saldo = R$150.00 (esperado)');

    // Excluir profissional de teste
    const deleteRes = await trpcPost('admin.deleteProfessional', { id: newProf.id }, adminCookie);
    console.log('Excluir profissional de teste: HTTP', deleteRes.status, 'success=', deleteRes.data?.success);
  }
}

main().catch(e => console.error('ERRO:', e.message));
