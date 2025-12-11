import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@onlife.com.br",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    professionalRegistry: null,
    registryType: null,
    phone: null,
    cpf: null,
    address: null,
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

function createProfessionalContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "professional-user",
    email: "professional@onlife.com.br",
    name: "Professional User",
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

describe("rooms router", () => {
  it("should list all active rooms", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const rooms = await caller.rooms.list();

    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);
    
    const room = rooms[0];
    expect(room).toHaveProperty("id");
    expect(room).toHaveProperty("name");
    expect(room).toHaveProperty("pricePerHour");
    expect(room.isActive).toBe(true);
  });

  it("should get room by id", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    const rooms = await caller.rooms.list();
    const firstRoom = rooms[0];

    const room = await caller.rooms.getById({ id: firstRoom.id });

    expect(room.id).toBe(firstRoom.id);
    expect(room.name).toBe(firstRoom.name);
    expect(Array.isArray(room.equipment)).toBe(true);
    expect(Array.isArray(room.features)).toBe(true);
    expect(Array.isArray(room.photos)).toBe(true);
  });

  it("should allow admin to create room", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.rooms.create({
      name: "Test Room",
      description: "A test room",
      capacity: 2,
      equipment: ["Table", "Chairs"],
      features: ["Quiet", "Private"],
      pricePerHour: 10000,
    });

    expect(result.success).toBe(true);
  });

  it("should prevent non-admin from creating room", async () => {
    const ctx = createProfessionalContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.rooms.create({
        name: "Test Room",
        description: "A test room",
        capacity: 2,
        pricePerHour: 10000,
      })
    ).rejects.toThrow("Admin access required");
  });
});
