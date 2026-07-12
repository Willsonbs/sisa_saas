// Replica a lógica de parseCustomAmount do Credits.tsx
function parseCustomAmount(raw) {
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.');
  const direct = Number(raw.trim().replace(',', '.'));
  const value = !isNaN(direct) ? direct : Number(normalized);
  if (isNaN(value) || value <= 0) return null;
  return Math.round(value * 100);
}

const MIN_CENTS = 5000; // R$ 50,00

const tests = [
  { input: '51',    expectedCents: 5100, desc: 'Cenário 2: "51" → deve cobrar R$51,00 (5100 cents)' },
  { input: '55,45', expectedCents: 5545, desc: 'Cenário 3: "55,45" → deve cobrar R$55,45 (5545 cents)' },
  { input: '30',    expectedCents: 3000, desc: 'Cenário 4: "30" → deve ser bloqueado (abaixo de R$50)' },
  { input: '50',    expectedCents: 5000, desc: 'Borda: "50" → exatamente no mínimo, deve passar' },
  { input: '49,99', expectedCents: 4999, desc: 'Borda: "49,99" → deve ser bloqueado' },
  { input: '1000',  expectedCents: 100000, desc: 'Extra: "1000" → R$1.000,00' },
];

tests.forEach(t => {
  const cents = parseCustomAmount(t.input);
  const blocked = cents === null || cents < MIN_CENTS;
  const isMin4 = t.input === '30' || t.input === '49,99';
  const ok = isMin4 ? blocked : (cents === t.expectedCents && !blocked);
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${t.desc}`);
  console.log(`   parseCustomAmount("${t.input}") = ${cents} cents | blocked=${blocked} | ok=${ok}`);
});
