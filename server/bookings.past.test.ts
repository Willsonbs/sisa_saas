import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Contexto de teste ────────────────────────────────────────────────────────

function createProfessionalContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "professional-user",
      email: "professional@sisa.com",
      name: "Professional User",
      loginMethod: "local",
      role: "professional",
      tenantId: 1,
      professionalRegistry: null,
      registryType: null,
      phone: null,
      cpf: null,
      address: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("bookings — validação de horário retroativo", () => {
  it("bookings.create deve rejeitar startTime no passado", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h atrás
    const pastEnd   = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h atrás

    await expect(
      caller.bookings.create({
        roomId: 1,
        startTime: pastStart,
        endTime: pastEnd,
        patientName: "Paciente Teste",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("passado"),
    });
  });

  it("bookings.createWithPayment deve rejeitar startTime no passado", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const pastStart = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3h atrás
    const pastEnd   = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h atrás

    await expect(
      caller.bookings.createWithPayment({
        roomId: 1,
        startTime: pastStart,
        endTime: pastEnd,
        patientName: "Paciente Teste",
        paymentMethod: "card",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("passado"),
    });
  });

  it("bookings.create deve rejeitar startTime igual a agora", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const now  = new Date();
    const end  = new Date(now.getTime() + 60 * 60 * 1000);

    await expect(
      caller.bookings.create({
        roomId: 1,
        startTime: now,
        endTime: end,
        patientName: "Paciente Teste",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("passado"),
    });
  });
});
