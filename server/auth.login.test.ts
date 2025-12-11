import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { hashPassword } from "./auth";
import * as db from "./db";

function createMockContext(): { ctx: TrpcContext; cookies: Record<string, any> } {
  const cookies: Record<string, any> = {};

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: any, options: any) => {
        cookies[name] = { value, options };
      },
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx, cookies };
}

describe("auth.register and auth.login", () => {
  it("should register a new professional and login successfully", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = "senha123";

    // Registrar novo profissional
    const registerResult = await caller.auth.register({
      name: "Dr. Teste",
      email: testEmail,
      password: testPassword,
      phone: "11999999999",
      professionalRegistry: "123456",
      registryType: "CRM",
      cpf: "12345678900",
    });

    expect(registerResult.success).toBe(true);
    expect(registerResult.message).toContain("Cadastro realizado");

    // Verificar se usuário foi criado no banco
    const user = await db.getUserByEmail(testEmail);
    expect(user).toBeDefined();
    expect(user?.name).toBe("Dr. Teste");
    expect(user?.email).toBe(testEmail);
    expect(user?.role).toBe("professional");

    // Fazer login
    const loginResult = await caller.auth.login({
      email: testEmail,
      password: testPassword,
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user.email).toBe(testEmail);
    expect(loginResult.user.role).toBe("professional");
    expect(cookies.auth_token).toBeDefined();
    expect(cookies.auth_token.value).toBeTruthy();
  });

  it("should reject login with wrong password", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const testEmail = `test_wrong_${Date.now()}@example.com`;
    
    // Criar usuário
    await db.createProfessional({
      email: testEmail,
      password: await hashPassword("senha_correta"),
      name: "Dr. Teste Errado",
      phone: "11999999999",
      professionalRegistry: "123456",
      registryType: "CRM",
      role: "professional",
      loginMethod: "password",
    });

    // Tentar login com senha errada
    await expect(
      caller.auth.login({
        email: testEmail,
        password: "senha_errada",
      })
    ).rejects.toThrow("Email ou senha inválidos");
  });

  it("should reject duplicate email registration", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const testEmail = `test_duplicate_${Date.now()}@example.com`;

    // Primeiro registro
    await caller.auth.register({
      name: "Dr. Primeiro",
      email: testEmail,
      password: "senha123",
      phone: "11999999999",
      professionalRegistry: "123456",
      registryType: "CRM",
    });

    // Tentar registrar novamente
    await expect(
      caller.auth.register({
        name: "Dr. Segundo",
        email: testEmail,
        password: "senha456",
        phone: "11999999999",
        professionalRegistry: "654321",
        registryType: "CRP",
      })
    ).rejects.toThrow("Este email já está cadastrado");
  });
});
