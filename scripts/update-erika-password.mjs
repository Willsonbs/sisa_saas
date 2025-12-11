import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema.ts";
import bcrypt from "bcryptjs";

const db = drizzle(process.env.DATABASE_URL);

async function updatePassword() {
  try {
    // Buscar usuário erika@
    const erikaUsers = await db.select().from(users).where(eq(users.email, "erika@onlifeararaquara.com.br"));
    
    if (erikaUsers.length === 0) {
      console.log("Usuário erika@ não encontrado. Buscando por email parcial...");
      const allUsers = await db.select().from(users);
      const erikaUser = allUsers.find(u => u.email && u.email.startsWith("erika@"));
      
      if (!erikaUser) {
        console.log("Nenhum usuário com email começando com erika@ foi encontrado.");
        console.log("Usuários disponíveis:", allUsers.map(u => u.email));
        return;
      }
      
      console.log(`Encontrado usuário: ${erikaUser.email}`);
      
      // Gerar hash da senha
      const hashedPassword = await bcrypt.hash("59ek6bj76p", 10);
      
      // Atualizar senha
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, erikaUser.id));
      
      console.log(`✅ Senha atualizada com sucesso para ${erikaUser.email}`);
      console.log(`Email: ${erikaUser.email}`);
      console.log(`Senha: 59ek6bj76p`);
      
    } else {
      const erikaUser = erikaUsers[0];
      console.log(`Encontrado usuário: ${erikaUser.email}`);
      
      // Gerar hash da senha
      const hashedPassword = await bcrypt.hash("59ek6bj76p", 10);
      
      // Atualizar senha
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, erikaUser.id));
      
      console.log(`✅ Senha atualizada com sucesso para ${erikaUser.email}`);
      console.log(`Email: ${erikaUser.email}`);
      console.log(`Senha: 59ek6bj76p`);
    }
    
  } catch (error) {
    console.error("❌ Erro ao atualizar senha:", error);
  }
  
  process.exit(0);
}

updatePassword();
