import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createProfessionalContext(id: number = 2): TrpcContext {
  const user: AuthenticatedUser = {
    id,
    openId: `professional-${id}`,
    email: `professional${id}@onlife.com.br`,
    name: `Professional ${id}`,
    loginMethod: "manus",
    role: "professional",
    professionalRegistry: "CRP 12345",
    registryType: "CRP",
    phone: "(11) 99999-9999",
    cpf: "123.456.789-00",
    address: "Rua Exemplo, 123",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("credits router", () => {
  it("should return credit balance", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const balance = await caller.credits.balance();

    expect(typeof balance).toBe("number");
    expect(balance).toBeGreaterThanOrEqual(0);
  });

  it("should return credit history", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const history = await caller.credits.history({ limit: 10 });

    expect(Array.isArray(history)).toBe(true);
  });

  it("should list available credit packages", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const packages = await caller.credits.packages();

    expect(Array.isArray(packages)).toBe(true);
    expect(packages.length).toBeGreaterThan(0);
    
    const pkg = packages[0];
    expect(pkg).toHaveProperty("id");
    expect(pkg).toHaveProperty("name");
    expect(pkg).toHaveProperty("credits");
    expect(pkg).toHaveProperty("price");
    expect(pkg.credits).toBeGreaterThan(0);
    expect(pkg.price).toBeGreaterThan(0);
  });
});
