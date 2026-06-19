import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

// 1. Listar todos os profissionais
const [allProfessionals] = await db.execute(
  `SELECT id, email, name, tenantId FROM users WHERE role = 'professional'`
);

console.log(`\n=== Profissionais cadastrados: ${allProfessionals.length} ===`);
for (const p of allProfessionals) {
  console.log(`  [${p.id}] ${p.email} | ${p.name}`);
}

// 2. Calcular saldo atual de cada profissional
async function getBalance(professionalId) {
  const [rows] = await db.execute(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM credits WHERE professionalId = ?`,
    [professionalId]
  );
  // Retorna como número JS (pode vir como string do MySQL)
  return Number(rows[0].balance);
}

// 3. Adicionar R$ 500,00 (50000 centavos) para TODOS os profissionais
console.log("\n=== Adicionando R$ 500,00 de créditos para todos os profissionais ===");
for (const p of allProfessionals) {
  const currentBalance = await getBalance(p.id);
  const newBalance = currentBalance + 50000;
  // Garantir que balanceAfter não excede INT (2147483647)
  const safeBalance = Math.min(newBalance, 2147483647);
  const tenantId = p.tenantId || 1;
  await db.execute(
    `INSERT INTO credits (professionalId, amount, type, description, balanceAfter, tenantId, createdAt)
     VALUES (?, 50000, 'bonus', 'Crédito de teste - R$ 500,00', ?, ?, NOW())`,
    [p.id, safeBalance, tenantId]
  );
  console.log(`  ✓ ${p.email} — R$ ${(currentBalance/100).toFixed(2)} → R$ ${(newBalance/100).toFixed(2)}`);
}

// 4. Definir senha para profissionais com @example.com
const exampleUsers = allProfessionals.filter(p => p.email.endsWith("@example.com"));
console.log(`\n=== Profissionais @example.com: ${exampleUsers.length} ===`);

if (exampleUsers.length > 0) {
  const hash = await bcrypt.hash("Mudar@123", 12);
  for (const p of exampleUsers) {
    await db.execute(
      `UPDATE users SET password = ?, loginMethod = 'email' WHERE id = ?`,
      [hash, p.id]
    );
    console.log(`  ✓ Senha definida: ${p.email} → Mudar@123`);
  }
} else {
  console.log("  (nenhum profissional com @example.com encontrado)");
}

// 5. Resumo final
console.log("\n=== Saldos finais ===");
for (const p of allProfessionals) {
  const balance = await getBalance(p.id);
  console.log(`  ${p.email} → R$ ${(balance/100).toFixed(2)}`);
}

await db.end();
console.log("\nConcluído!");
