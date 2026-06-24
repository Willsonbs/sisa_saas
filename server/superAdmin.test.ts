import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides: Partial<AuthUser>): TrpcContext {
  const clearedCookies: unknown[] = [];
  const res = {
    clearCookie: (_name: string, _opts?: unknown) => clearedCookies.push({ _name, _opts }),
  } as any;
  const user: AuthUser = {
    id: 1,
    email: "superadmin@sisa.com",
    name: "Super Admin",
    role: "super_admin",
    tenantId: null,
    openId: null,
    password: null,
    loginMethod: null,
    professionalRegistry: null,
    registryType: null,
    phone: null,
    cpf: null,
    address: null,
    specialty: null,
    bio: null,
    publicProfileSlug: null,
    appointmentDurationMinutes: 30,
    lastSignedIn: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return { req: {} as any, res, user };
}

const superAdminCtx = makeCtx({ role: "super_admin", tenantId: null });
const regularUserCtx = makeCtx({ id: 2, email: "admin@clinic.com", role: "admin", tenantId: 1 });

describe("superAdmin procedures — access control", () => {
  it("should reject non-super_admin users from dashboard", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.dashboard()).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from listTenants", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.listTenants({ status: "all" })).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from listPlans", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.listPlans()).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from billing", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.billing()).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from listUsers", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.listUsers({})).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from listAuditLogs", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.listAuditLogs({ limit: 10 })).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from toggleTenantStatus", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.toggleTenantStatus({ id: 1, isActive: false })).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from impersonateTenant", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.impersonateTenant({ tenantId: 1, reason: "test reason" })).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from createPlan", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.createPlan({
      name: "Test Plan",
      priceMonthly: 9900,
      maxRooms: 5,
      maxProfessionals: 10,
    })).rejects.toThrow(/Acesso exclusivo/);
  });

  it("should reject non-super_admin users from updatePlan", async () => {
    const caller = appRouter.createCaller(regularUserCtx);
    await expect(caller.superAdmin.updatePlan({ id: 1, name: "Updated" })).rejects.toThrow(/Acesso exclusivo/);
  });
});

describe("superAdmin procedures — impersonateTenant validation", () => {
  it("should reject impersonation with reason shorter than 5 chars", async () => {
    const caller = appRouter.createCaller(superAdminCtx);
    await expect(caller.superAdmin.impersonateTenant({ tenantId: 1, reason: "hi" })).rejects.toThrow();
  });
});
