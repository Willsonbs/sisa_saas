import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { inferRouterContext } from "@trpc/server";
import type { AppRouter } from "./routers";

// ─── Minimal mock context ─────────────────────────────────────────────────────
function makeCtx(role: "admin" | "professional" = "professional") {
  return {
    user: { id: 1, email: "test@example.com", role, tenantId: 1, name: "Test User" },
    req: { ip: "127.0.0.1", headers: {} } as any,
  } as inferRouterContext<AppRouter>;
}

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getBookingById: vi.fn(),
  createAppointment: vi.fn(),
  getAppointmentsByBooking: vi.fn(),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
  deleteAppointmentsByBooking: vi.fn(),
  getProfessionalAppointmentDuration: vi.fn(),
  getTenantById: vi.fn(),
  updateTenant: vi.fn(),
  createAuditLog: vi.fn(),
  getDb: vi.fn(),
}));

import * as db from "./db";

const futureBooking = {
  id: 10,
  professionalId: 1,
  tenantId: 1,
  roomId: 1,
  startTime: new Date(Date.now() + 3 * 3600_000),
  endTime: new Date(Date.now() + 4 * 3600_000),
  status: "confirmed",
  totalPrice: 100,
  patientName: null,
  patientPhone: null,
};

const caller = appRouter.createCaller(makeCtx("professional"));
const adminCaller = appRouter.createCaller(makeCtx("admin"));

// ─── appointments.create ─────────────────────────────────────────────────────
describe("appointments.create", () => {
  beforeEach(() => {
    vi.mocked(db.getBookingById).mockResolvedValue(futureBooking as any);
    vi.mocked(db.createAppointment).mockResolvedValue({} as any);
  });

  it("creates an appointment within booking window", async () => {
    const result = await caller.appointments.create({
      bookingId: 10,
      startTime: new Date(futureBooking.startTime.getTime()),
      endTime: new Date(futureBooking.startTime.getTime() + 30 * 60_000),
    });
    expect(result.success).toBe(true);
    expect(db.createAppointment).toHaveBeenCalledOnce();
  });

  it("rejects appointment outside booking window", async () => {
    await expect(
      caller.appointments.create({
        bookingId: 10,
        startTime: new Date(futureBooking.endTime.getTime() + 60_000), // after booking end
        endTime: new Date(futureBooking.endTime.getTime() + 120_000),
      })
    ).rejects.toThrow("fora do horário");
  });

  it("rejects if booking not found", async () => {
    vi.mocked(db.getBookingById).mockResolvedValue(undefined as any);
    await expect(
      caller.appointments.create({
        bookingId: 999,
        startTime: new Date(futureBooking.startTime.getTime()),
        endTime: new Date(futureBooking.startTime.getTime() + 30 * 60_000),
      })
    ).rejects.toThrow("não encontrada");
  });
});

// ─── appointments.generateFromBooking ────────────────────────────────────────
describe("appointments.generateFromBooking", () => {
  beforeEach(() => {
    vi.mocked(db.getBookingById).mockResolvedValue(futureBooking as any);
    vi.mocked(db.getProfessionalAppointmentDuration).mockResolvedValue(30);
    vi.mocked(db.deleteAppointmentsByBooking).mockResolvedValue(undefined);
    vi.mocked(db.createAppointment).mockResolvedValue({} as any);
  });

  it("generates correct number of slots for 60-min booking with 30-min duration", async () => {
    vi.mocked(db.createAppointment).mockClear();
    const result = await caller.appointments.generateFromBooking({ bookingId: 10 });
    expect(result.success).toBe(true);
    expect(result.slots).toBe(2); // 60 min / 30 min = 2 slots
    expect(db.createAppointment).toHaveBeenCalledTimes(2);
  });
});

// ─── bookingPolicy.get ────────────────────────────────────────────────────────
describe("bookingPolicy.get", () => {
  it("returns tenant policy", async () => {
    vi.mocked(db.getTenantById).mockResolvedValue({
      id: 1,
      cancellationWindowHours: 12,
      lateArrivalToleranceMinutes: 15,
    } as any);
    const result = await caller.bookingPolicy.get();
    expect(result.cancellationWindowMinutes).toBe(720); // 12h * 60
    expect(result.lateArrivalToleranceMinutes).toBe(15);
  });
});

// ─── bookingPolicy.update ─────────────────────────────────────────────────────
describe("bookingPolicy.update", () => {
  beforeEach(() => {
    vi.mocked(db.updateTenant).mockResolvedValue(undefined as any);
    vi.mocked(db.createAuditLog).mockResolvedValue(undefined);
  });

  it("admin can update cancellation window", async () => {
    const result = await adminCaller.bookingPolicy.update({
      cancellationWindowMinutes: 120,
    });
    expect(result.success).toBe(true);
    expect(db.updateTenant).toHaveBeenCalledWith(1, expect.objectContaining({ cancellationWindowMinutes: 120 }));
  });

  it("non-admin cannot update policy", async () => {
    await expect(
      caller.bookingPolicy.update({ cancellationWindowMinutes: 60 })
    ).rejects.toThrow();
  });
});
