import { z } from "zod";
import { router, superAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  tenants, users, rooms, bookings, payments, plans, subscriptions, auditLogs,
} from "../../drizzle/schema";
import { eq, sql, desc, count, sum, and, gte, lte, isNull, isNotNull } from "drizzle-orm";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function logAudit(opts: {
  userId: number;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: number;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    tenantId: null,
    userId: opts.userId,
    userEmail: opts.userEmail,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId ?? null,
    before: opts.before ? JSON.stringify(opts.before) : null,
    after: opts.after ? JSON.stringify(opts.after) : null,
    ipAddress: opts.ipAddress ?? null,
  });
}

// ─── router ───────────────────────────────────────────────────────────────────

export const superAdminRouter = router({

  // ── Dashboard stats ────────────────────────────────────────────────────────
  dashboard: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      [totalTenants],
      [activeTenants],
      [totalProfessionals],
      [totalRooms],
      [totalBookings],
      [monthlyRevenue],
      [pendingPayments],
    ] = await Promise.all([
      db.select({ count: count() }).from(tenants),
      db.select({ count: count() }).from(tenants).where(eq(tenants.isActive, true)),
      db.select({ count: count() }).from(users).where(eq(users.role, "professional")),
      db.select({ count: count() }).from(rooms).where(eq(rooms.isActive, true)),
      db.select({ count: count() }).from(bookings),
      db.select({ total: sum(payments.amount) }).from(payments)
        .where(and(eq(payments.status, "paid"), gte(payments.createdAt, startOfMonth), lte(payments.createdAt, endOfMonth))),
      db.select({ count: count() }).from(payments).where(eq(payments.status, "pending")),
    ]);

    // Monthly growth — last 6 months
    const growthData: { month: string; tenants: number; bookings: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });

      const [[tc], [bc], [rev]] = await Promise.all([
        db.select({ count: count() }).from(tenants).where(and(gte(tenants.createdAt, start), lte(tenants.createdAt, end))),
        db.select({ count: count() }).from(bookings).where(and(gte(bookings.createdAt, start), lte(bookings.createdAt, end))),
        db.select({ total: sum(payments.amount) }).from(payments)
          .where(and(eq(payments.status, "paid"), gte(payments.createdAt, start), lte(payments.createdAt, end))),
      ]);
      growthData.push({ month: label, tenants: tc.count, bookings: bc.count, revenue: Number(rev.total ?? 0) });
    }

    return {
      totalTenants: totalTenants.count,
      activeTenants: activeTenants.count,
      totalProfessionals: totalProfessionals.count,
      totalRooms: totalRooms.count,
      totalBookings: totalBookings.count,
      monthlyRevenue: Number(monthlyRevenue.total ?? 0),
      pendingPayments: pendingPayments.count,
      growthData,
    };
  }),

  // ── Tenants list ───────────────────────────────────────────────────────────
  listTenants: superAdminProcedure
    .input(z.object({ search: z.string().optional(), status: z.enum(["all", "active", "inactive"]).default("all") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

      const enriched = await Promise.all(rows.map(async (t) => {
        const [[roomCount], [profCount], [bookingCount], sub] = await Promise.all([
          db.select({ count: count() }).from(rooms).where(and(eq(rooms.tenantId, t.id), eq(rooms.isActive, true))),
          db.select({ count: count() }).from(users).where(and(eq(users.tenantId, t.id), eq(users.role, "professional"))),
          db.select({ count: count() }).from(bookings).where(eq(bookings.tenantId, t.id)),
          db.select().from(subscriptions).where(eq(subscriptions.tenantId, t.id)).limit(1),
        ]);
        return {
          ...t,
          roomCount: roomCount.count,
          professionalCount: profCount.count,
          bookingCount: bookingCount.count,
          subscription: sub[0] ?? null,
        };
      }));

      let result = enriched;
      if (input.status === "active") result = result.filter(t => t.isActive);
      if (input.status === "inactive") result = result.filter(t => !t.isActive);
      if (input.search) {
        const q = input.search.toLowerCase();
        result = result.filter(t =>
          t.name.toLowerCase().includes(q) ||
          (t.email ?? "").toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q)
        );
      }
      return result;
    }),

  // ── Tenant details ─────────────────────────────────────────────────────────
  getTenant: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, input.id));
      if (!tenant) throw new Error("Tenant não encontrado");

      const [roomRows, profRows, bookingRows, subRows] = await Promise.all([
        db.select({ count: count() }).from(rooms).where(eq(rooms.tenantId, input.id)),
        db.select({ count: count() }).from(users).where(and(eq(users.tenantId, input.id), eq(users.role, "professional"))),
        db.select({ count: count() }).from(bookings).where(eq(bookings.tenantId, input.id)),
        db.select().from(subscriptions).where(eq(subscriptions.tenantId, input.id)).limit(1),
      ]);

      return {
        ...tenant,
        roomCount: roomRows[0].count,
        professionalCount: profRows[0].count,
        bookingCount: bookingRows[0].count,
        subscription: subRows[0] ?? null,
      };
    }),

  // ── Toggle tenant status ───────────────────────────────────────────────────
  toggleTenantStatus: superAdminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [before] = await db.select().from(tenants).where(eq(tenants.id, input.id));
      await db.update(tenants).set({ isActive: input.isActive }).where(eq(tenants.id, input.id));

      await logAudit({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: input.isActive ? "tenant.activate" : "tenant.block",
        entityType: "tenant",
        entityId: input.id,
        before: { isActive: before?.isActive },
        after: { isActive: input.isActive },
      });

      return { success: true };
    }),

  // ── Impersonate tenant (audit only) ───────────────────────────────────────
  impersonateTenant: superAdminProcedure
    .input(z.object({ tenantId: z.number(), reason: z.string().min(5) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await logAudit({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "IMPERSONATE_TENANT",
        entityType: "tenant",
        entityId: input.tenantId,
        after: { reason: input.reason },
      });

      return { success: true, tenantId: input.tenantId };
    }),

  // ── Update tenant cadastral data ────────────────────────────────────────────
  updateTenant: superAdminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      legalName: z.string().optional().nullable(),
      document: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      addressStreet: z.string().optional().nullable(),
      addressNumber: z.string().optional().nullable(),
      addressComplement: z.string().optional().nullable(),
      addressNeighborhood: z.string().optional().nullable(),
      addressCity: z.string().optional().nullable(),
      addressState: z.string().max(2).optional().nullable(),
      addressZip: z.string().optional().nullable(),
      plan: z.enum(["starter", "pro", "business", "enterprise"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const { id, ...fields } = input;
      const [before] = await db.select().from(tenants).where(eq(tenants.id, id));
      if (!before) throw new Error("Tenant não encontrado");

      await db.update(tenants).set({ ...fields }).where(eq(tenants.id, id));

      await logAudit({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        action: "tenant.update",
        entityType: "tenant",
        entityId: id,
        before,
        after: fields,
      });

      return { success: true };
    }),

  // ── Plans CRUD ─────────────────────────────────────────────────────────────
  listPlans: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    return db.select().from(plans).orderBy(plans.priceMonthly);
  }),

  createPlan: superAdminProcedure
    .input(z.object({
      name: z.string().min(2),
      description: z.string().optional(),
      priceMonthly: z.number().min(0),
      priceYearly: z.number().min(0).optional(),
      maxRooms: z.number().min(1),
      maxProfessionals: z.number().min(1),
      features: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      await db.insert(plans).values({
        name: input.name,
        description: input.description ?? null,
        priceMonthly: input.priceMonthly,
        priceYearly: input.priceYearly ?? null,
        maxRooms: input.maxRooms,
        maxProfessionals: input.maxProfessionals,
        features: input.features ? JSON.stringify(input.features) : null,
        isActive: true,
      });

      await logAudit({ userId: ctx.user.id, userEmail: ctx.user.email, action: "plan.create", entityType: "plan", after: input });
      return { success: true };
    }),

  updatePlan: superAdminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      priceMonthly: z.number().min(0).optional(),
      priceYearly: z.number().min(0).optional(),
      maxRooms: z.number().min(1).optional(),
      maxProfessionals: z.number().min(1).optional(),
      features: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const { id, features, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (features !== undefined) updateData.features = JSON.stringify(features);

      await db.update(plans).set(updateData).where(eq(plans.id, id));
      await logAudit({ userId: ctx.user.id, userEmail: ctx.user.email, action: "plan.update", entityType: "plan", entityId: id, after: input });
      return { success: true };
    }),

  // ── Subscriptions ──────────────────────────────────────────────────────────
  listSubscriptions: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const rows = await db.select({
      sub: subscriptions,
      tenant: tenants,
      plan: plans,
    })
      .from(subscriptions)
      .leftJoin(tenants, eq(subscriptions.tenantId, tenants.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .orderBy(desc(subscriptions.createdAt));

    return rows;
  }),

  // ── Billing overview ───────────────────────────────────────────────────────
  billing: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      [monthRevenue],
      [totalRevenue],
      [pendingCount],
      [activeSubsCount],
      recentPayments,
    ] = await Promise.all([
      db.select({ total: sum(payments.amount) }).from(payments)
        .where(and(eq(payments.status, "paid"), gte(payments.createdAt, startOfMonth))),
      db.select({ total: sum(payments.amount) }).from(payments).where(eq(payments.status, "paid")),
      db.select({ count: count() }).from(payments).where(eq(payments.status, "pending")),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db.select({
        id: payments.id,
        amount: payments.amount,
        status: payments.status,
        method: payments.method,
        createdAt: payments.createdAt,
        tenantId: payments.tenantId,
      }).from(payments).orderBy(desc(payments.createdAt)).limit(20),
    ]);

    // Monthly revenue last 6 months
    const monthlyData: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleString("pt-BR", { month: "short", year: "2-digit" });
      const [[rev]] = await Promise.all([
        db.select({ total: sum(payments.amount) }).from(payments)
          .where(and(eq(payments.status, "paid"), gte(payments.createdAt, start), lte(payments.createdAt, end))),
      ]);
      monthlyData.push({ month: label, revenue: Number(rev.total ?? 0) });
    }

    return {
      monthRevenue: Number(monthRevenue.total ?? 0),
      totalRevenue: Number(totalRevenue.total ?? 0),
      pendingPayments: pendingCount.count,
      activeSubscriptions: activeSubsCount.count,
      recentPayments,
      monthlyData,
    };
  }),

  // ── Users list ─────────────────────────────────────────────────────────────
  listUsers: superAdminProcedure
    .input(z.object({ search: z.string().optional(), role: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const rows = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        tenantId: users.tenantId,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users).orderBy(desc(users.createdAt));

      let result = rows;
      if (input.role) result = result.filter(u => u.role === input.role);
      if (input.search) {
        const q = input.search.toLowerCase();
        result = result.filter(u =>
          (u.name ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      }

      // Enrich with tenant name
      const tenantIds = Array.from(new Set(result.map(u => u.tenantId).filter(Boolean))) as number[];
      const tenantRows = tenantIds.length > 0
        ? await db.select({ id: tenants.id, name: tenants.name }).from(tenants)
        : [];
      const tenantMap = Object.fromEntries(tenantRows.map(t => [t.id, t.name]));

      return result.map(u => ({ ...u, tenantName: u.tenantId ? (tenantMap[u.tenantId] ?? null) : null }));
    }),

  // ── Audit logs ─────────────────────────────────────────────────────────────
  listAuditLogs: superAdminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(100) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input.limit);
    }),
});
