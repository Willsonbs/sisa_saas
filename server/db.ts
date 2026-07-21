import { eq, and, gte, lte, desc, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { 
  InsertUser, users, 
  rooms, InsertRoom, Room,
  bookings, InsertBooking, Booking,
  credits, InsertCredit, Credit,
  payments, InsertPayment, Payment,
  notifications, InsertNotification, Notification,
  apiKeys, InsertApiKey, ApiKey,
  settings, InsertSetting, Setting,
  tenants, InsertTenant, Tenant,
  professionalTenants, InsertProfessionalTenant, ProfessionalTenant,
  roomBlocks, InsertRoomBlock, RoomBlock,
  auditLogs, InsertAuditLog, AuditLog,
  waitlistEntries, InsertWaitlistEntry, WaitlistEntry,
  consentRecords, InsertConsentRecord, ConsentRecord,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle<typeof import('../drizzle/schema')>> | null = null;
let _pool: Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
// SUPABASE_URL takes priority over DATABASE_URL to allow migration without touching reserved env vars.
export async function getDb() {
  if (!_db) {
    const connStr = process.env.SUPABASE_URL || process.env.DATABASE_URL || '';
    if (!connStr) return null;
    try {
      // Supabase pooler (port 6543) and direct connections require SSL
      const needsSsl = connStr.includes('supabase.com') || connStr.includes('supabase.co');
      _pool = new Pool({
        connectionString: connStr,
        ssl: needsSsl ? { rejectUnauthorized: false } : false,
      });
      _db = drizzle(_pool);
      console.log(`[Database] Connected via ${process.env.SUPABASE_URL ? 'SUPABASE_URL' : 'DATABASE_URL'}`);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= TENANTS =============

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTenantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(tenants.name);
}

export async function createTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tenants).values(tenant);
  return result;
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tenants).set(data).where(eq(tenants.id, id));
}

// ============= PROFESSIONAL-TENANT LINKS =============

export async function getProfessionalTenantLink(professionalId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(professionalTenants)
    .where(and(
      eq(professionalTenants.professionalId, professionalId),
      eq(professionalTenants.tenantId, tenantId)
    )).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Lista enxuta (id + nome) dos profissionais aprovados de um tenant.
 * Usada para autocomplete de filtro (ex: painel de recepção) — não expõe
 * email/CPF/telefone etc, só o necessário para busca por nome (LGPD).
 */
export async function getProfessionalNamesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: users.id,
    name: users.name,
  })
    .from(users)
    .innerJoin(professionalTenants, and(
      eq(professionalTenants.professionalId, users.id),
      eq(professionalTenants.tenantId, tenantId),
      eq(professionalTenants.status, 'approved')
    ))
    .where(eq(users.role, 'professional'))
    .orderBy(users.name);
}

export async function getProfessionalsByTenant(tenantId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [eq(professionalTenants.tenantId, tenantId)];
  if (status) conditions.push(eq(professionalTenants.status, status as any));
  
  const links = await db.select().from(professionalTenants)
    .where(and(...conditions))
    .orderBy(desc(professionalTenants.createdAt));
  
  const enriched = await Promise.all(links.map(async (link) => {
    const user = await getUserById(link.professionalId);
    return { ...link, user };
  }));
  
  return enriched;
}

export async function createProfessionalTenantLink(link: InsertProfessionalTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(professionalTenants).values(link);
}

export async function updateProfessionalTenantLink(id: number, data: Partial<InsertProfessionalTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(professionalTenants).set(data).where(eq(professionalTenants.id, id));
}

// ============= USERS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId && !user.email) {
    throw new Error("User openId or email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      email: user.email || `temp_${Date.now()}@temp.com`,
      openId: user.openId || null,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "professionalRegistry", "registryType", "phone", "cpf", "address", "specialty", "bio", "publicProfileSlug"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      if (field === 'email' && normalized) {
        values[field] = normalized;
        updateSet[field] = normalized;
      } else if (field !== 'email') {
        (values as any)[field] = normalized;
        updateSet[field] = normalized;
      }
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'super_admin';
      updateSet.role = 'super_admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.email,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.publicProfileSlug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProfessional(data: InsertUser) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    return;
  }

  const result = await db.insert(users).values(data).returning({ id: users.id });
  return result[0] ?? null;
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set(data).where(eq(users.id, userId));
}

// Estatísticas do Dashboard administrativo: quantidade de reservas de hoje
// e faturamento do mês corrente. Só conta reservas efetivamente confirmadas
// (confirmed/completed) e no-show (paciente faltou mas o valor já foi
// cobrado, sem reembolso) — exclui draft/pending_payment (fluxo não
// finalizado) e canceled_with_credit (valor devolvido ao profissional).
export async function getDashboardBookingStats(tenantId: number) {
  const db = await getDb();
  if (!db) return { bookingsToday: 0, revenueThisMonth: 0 };

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const revenueStatusFilter = or(
    eq(bookings.status, 'confirmed'),
    eq(bookings.status, 'completed'),
    eq(bookings.status, 'no_show'),
  );

  const todayRows = await db.select({ id: bookings.id })
    .from(bookings)
    .where(and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.startTime, startOfDay),
      lte(bookings.startTime, endOfDay),
      revenueStatusFilter,
    ));

  const monthRows = await db.select({ totalPrice: bookings.totalPrice })
    .from(bookings)
    .where(and(
      eq(bookings.tenantId, tenantId),
      gte(bookings.startTime, startOfMonth),
      lte(bookings.startTime, endOfMonth),
      revenueStatusFilter,
    ));

  const revenueThisMonth = monthRows.reduce((sum, r) => sum + (r.totalPrice || 0), 0);

  return {
    bookingsToday: todayRows.length,
    revenueThisMonth,
  };
}

export async function getAllProfessionals(tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  // Subquery: sum of credit balance per professional
  const creditSumSq = db
    .select({
      professionalId: credits.professionalId,
      creditBalance: sql<number>`COALESCE(SUM(${credits.amount}), 0)`.as('creditBalance'),
    })
    .from(credits)
    .groupBy(credits.professionalId)
    .as('creditSums');

  if (tenantId) {
    // Single JOIN query — avoids two-step fetch and IN() with stale IDs
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        specialty: users.specialty,
        professionalRegistry: users.professionalRegistry,
        registryType: users.registryType,
        bio: users.bio,
        cpf: users.cpf,
        cnpj: users.cnpj,
        dateOfBirth: users.dateOfBirth,
        gender: users.gender,
        address: users.address,
        publicProfileSlug: users.publicProfileSlug,
        role: users.role,
        createdAt: users.createdAt,
        creditBalance: sql<number>`COALESCE(${creditSumSq.creditBalance}, 0)`,
      })
      .from(users)
      .innerJoin(
        professionalTenants,
        and(
          eq(professionalTenants.professionalId, users.id),
          eq(professionalTenants.tenantId, tenantId)
        )
      )
      .leftJoin(creditSumSq, eq(users.id, creditSumSq.professionalId))
      .where(eq(users.role, 'professional'));
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      specialty: users.specialty,
      professionalRegistry: users.professionalRegistry,
      registryType: users.registryType,
      bio: users.bio,
      cpf: users.cpf,
      cnpj: users.cnpj,
      dateOfBirth: users.dateOfBirth,
      gender: users.gender,
      address: users.address,
      publicProfileSlug: users.publicProfileSlug,
      role: users.role,
      createdAt: users.createdAt,
      creditBalance: sql<number>`COALESCE(${creditSumSq.creditBalance}, 0)`,
    })
    .from(users)
    .leftJoin(creditSumSq, eq(users.id, creditSumSq.professionalId))
    .where(eq(users.role, 'professional'));
}

// ============= ROOMS =============

export async function createRoom(room: InsertRoom) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(rooms).values(room);
  return result;
}

export async function updateRoom(id: number, data: Partial<InsertRoom>, tenantId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Isolamento de tenant: se tenantId for informado, so atualiza salas daquele tenant.
  const conditions = tenantId !== undefined
    ? and(eq(rooms.id, id), eq(rooms.tenantId, tenantId))
    : eq(rooms.id, id);
  await db.update(rooms).set(data).where(conditions);
}

export async function getRoomById(id: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Isolamento de tenant: sempre filtra por tenantId para evitar acesso cross-tenant
  const conditions = tenantId !== undefined
    ? and(eq(rooms.id, id), eq(rooms.tenantId, tenantId))
    : eq(rooms.id, id);
  const result = await db.select().from(rooms).where(conditions).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllRooms(includeInactive = false, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [];
  if (!includeInactive) conditions.push(eq(rooms.isActive, true));
  if (tenantId) conditions.push(eq(rooms.tenantId, tenantId));
  
  if (conditions.length === 0) return db.select().from(rooms);
  return db.select().from(rooms).where(and(...conditions));
}

export async function deleteRoom(id: number, tenantId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Isolamento de tenant: se tenantId for informado, so desativa salas daquele tenant.
  const conditions = tenantId !== undefined
    ? and(eq(rooms.id, id), eq(rooms.tenantId, tenantId))
    : eq(rooms.id, id);
  await db.update(rooms).set({ isActive: false }).where(conditions);
}

// ============= ROOM BLOCKS =============

export async function createRoomBlock(block: InsertRoomBlock) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(roomBlocks).values(block);
  return result;
}

export async function getRoomBlocks(roomId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roomBlocks)
    .where(and(
      eq(roomBlocks.roomId, roomId),
      or(
        and(gte(roomBlocks.startTime, startDate), lte(roomBlocks.startTime, endDate)),
        and(gte(roomBlocks.endTime, startDate), lte(roomBlocks.endTime, endDate)),
        and(lte(roomBlocks.startTime, startDate), gte(roomBlocks.endTime, endDate))
      )
    ))
    .orderBy(roomBlocks.startTime);
}

export async function getAllRoomBlocksByTenant(tenantId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roomBlocks)
    .where(and(
      eq(roomBlocks.tenantId, tenantId),
      gte(roomBlocks.startTime, startDate),
      lte(roomBlocks.endTime, endDate)
    ))
    .orderBy(roomBlocks.startTime);
}

export async function deleteRoomBlock(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(roomBlocks).where(eq(roomBlocks.id, id));
}

// ============= BOOKINGS =============

export async function createBooking(booking: InsertBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(bookings).values(booking);
  return result;
}

export async function updateBooking(id: number, data: Partial<InsertBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(bookings).set(data).where(eq(bookings.id, id));
}

export async function getBookingById(id: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Isolamento de tenant: sempre filtra por tenantId para evitar acesso cross-tenant
  const conditions = tenantId !== undefined
    ? and(eq(bookings.id, id), eq(bookings.tenantId, tenantId))
    : eq(bookings.id, id);
  const result = await db.select().from(bookings).where(conditions).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingsByProfessional(professionalId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (status) {
    return db.select().from(bookings)
      .where(and(
        eq(bookings.professionalId, professionalId),
        eq(bookings.status, status as any)
      ))
      .orderBy(desc(bookings.startTime));
  }
  
  return db.select().from(bookings)
    .where(eq(bookings.professionalId, professionalId))
    .orderBy(desc(bookings.startTime));
}

export async function getBookingsByRoom(roomId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(bookings)
    .where(and(
      eq(bookings.roomId, roomId),
      gte(bookings.startTime, startDate),
      lte(bookings.endTime, endDate),
      or(
        eq(bookings.status, 'confirmed'),
        eq(bookings.status, 'pending_payment')
      )
    ))
    .orderBy(bookings.startTime);
}

export async function getBookingsByTenant(tenantId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [eq(bookings.tenantId, tenantId)];
  if (startDate) conditions.push(gte(bookings.startTime, startDate));
  if (endDate) conditions.push(lte(bookings.endTime, endDate));
  
  return db.select().from(bookings)
    .where(and(...conditions))
    .orderBy(desc(bookings.startTime));
}

export async function checkBookingConflict(roomId: number, startTime: Date, endTime: Date, excludeBookingId?: number) {
  const db = await getDb();
  if (!db) return false;
  
  // Overlap estrito: exclui horários adjacentes (ex: 08:00-09:00 e 09:00-10:00 NÃO conflitam).
  // Dois intervalos [A,B] e [C,D] se sobrepõem se e somente se A < D && C < B.
  const conditions: any[] = [
    eq(bookings.roomId, roomId),
    or(
      eq(bookings.status, 'confirmed'),
      eq(bookings.status, 'pending_payment')
    ),
    sql`${bookings.startTime} < ${endTime} AND ${bookings.endTime} > ${startTime}`
  ];
  
  if (excludeBookingId) {
    conditions.push(sql`${bookings.id} != ${excludeBookingId}`);
  }
  
  const conflicts = await db.select().from(bookings).where(and(...conditions)).limit(1);
  return conflicts.length > 0;
}

export async function checkRoomBlockConflict(roomId: number, startTime: Date, endTime: Date) {
  const db = await getDb();
  if (!db) return false;
  
  // Overlap estrito: horários adjacentes não conflitam (A < D && C < B)
  const conflicts = await db.select().from(roomBlocks)
    .where(and(
      eq(roomBlocks.roomId, roomId),
      sql`${roomBlocks.startTime} < ${endTime} AND ${roomBlocks.endTime} > ${startTime}`
    ))
    .limit(1);
  
  return conflicts.length > 0;
}

export async function getUpcomingBookings(professionalId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  return db.select().from(bookings)
    .where(and(
      eq(bookings.professionalId, professionalId),
      gte(bookings.startTime, now),
      or(
        eq(bookings.status, 'confirmed'),
        eq(bookings.status, 'pending_payment')
      )
    ))
    .orderBy(bookings.startTime)
    .limit(limit);
}

export async function getReceptionAgenda(date: Date, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const conditions: any[] = [
    gte(bookings.startTime, startOfDay),
    lte(bookings.startTime, endOfDay),
    or(
      eq(bookings.status, 'confirmed'),
      eq(bookings.status, 'pending_payment')
    )
  ];
  
  if (tenantId) conditions.push(eq(bookings.tenantId, tenantId));
  
  return db.select().from(bookings)
    .where(and(...conditions))
    .orderBy(bookings.startTime);
}

// Get bookings that need reminders (24h or 2h before)
export async function getBookingsNeedingReminders(windowStart: Date, windowEnd: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(bookings)
    .where(and(
      eq(bookings.status, 'confirmed'),
      gte(bookings.startTime, windowStart),
      lte(bookings.startTime, windowEnd)
    ))
    .orderBy(bookings.startTime);
}

// ============= CREDITS =============

export async function addCredit(credit: InsertCredit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(credits).values(credit);
  return result;
}

export async function getCreditBalance(professionalId: number, tenantId?: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const conditions: any[] = [eq(credits.professionalId, professionalId)];
  if (tenantId) conditions.push(eq(credits.tenantId, tenantId));
  
  const result = await db.select({ balance: credits.balanceAfter })
    .from(credits)
    .where(and(...conditions))
    .orderBy(desc(credits.createdAt))
    .limit(1);
  
  return result.length > 0 ? result[0].balance : 0;
}

export async function getCreditHistory(professionalId: number, limit = 50, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions: any[] = [eq(credits.professionalId, professionalId)];
  if (tenantId) conditions.push(eq(credits.tenantId, tenantId));
  
  return db.select().from(credits)
    .where(and(...conditions))
    .orderBy(desc(credits.createdAt))
    .limit(limit);
}

// ============= PAYMENTS =============

export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(payments).values(payment);
  return result;
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(payments).set(data).where(eq(payments.id, id));
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPaymentByStripeId(stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(payments)
    .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPaymentHistory(professionalId: number, limit = 50, tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  // Isolamento de tenant: profissionais podem estar vinculados a mais de um
  // tenant (professionalTenants). Sem esse filtro, o histórico de pagamentos
  // de quem atua em mais de uma clínica mistura registros de todas elas.
  const conditions: any[] = [eq(payments.professionalId, professionalId)];
  if (tenantId) conditions.push(eq(payments.tenantId, tenantId));

  return db.select().from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

// Regras de Cancelamento (tabela cancellationRules) foram descontinuadas —
// removidas em favor da política única em Configurações > Políticas de
// Cancelamento e Tolerância (tenants.cancellationWindowHours), que já
// resolvia a mesma necessidade sem o bug de vazamento entre tenants que
// existia em getActiveCancellationRules(). A tabela cancellationRules
// permanece no banco (dados antigos, sem uso) — nenhuma migração destrutiva
// foi feita.

// ============= AUDIT LOGS =============

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return; // audit logs are non-critical, don't throw
  
  try {
    await db.insert(auditLogs).values(log);
  } catch (error) {
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}

export async function getAuditLogs(tenantId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getAuditLogsByEntity(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(auditLogs)
    .where(and(
      eq(auditLogs.entityType, entityType),
      eq(auditLogs.entityId, entityId)
    ))
    .orderBy(desc(auditLogs.createdAt));
}

// ============= WAITLIST =============

export async function createWaitlistEntry(entry: InsertWaitlistEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(waitlistEntries).values(entry);
  return result;
}

export async function getWaitlistByProfessional(professionalId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waitlistEntries)
    .where(and(
      eq(waitlistEntries.professionalId, professionalId),
      eq(waitlistEntries.tenantId, tenantId),
      eq(waitlistEntries.status, 'waiting')
    ))
    .orderBy(desc(waitlistEntries.createdAt));
}

export async function updateWaitlistEntry(id: number, data: Partial<InsertWaitlistEntry>, professionalId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // SECURITY: se professionalId fornecido, garante que a entrada pertence ao profissional
  const condition = professionalId
    ? and(eq(waitlistEntries.id, id), eq(waitlistEntries.professionalId, professionalId))
    : eq(waitlistEntries.id, id);
  await db.update(waitlistEntries).set(data).where(condition);
}

// ============= CONSENT RECORDS =============

export async function createConsentRecord(consent: InsertConsentRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consentRecords).values(consent);
  return result;
}

export async function getConsentRecord(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(consentRecords).where(eq(consentRecords.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= NOTIFICATIONS =============

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notifications).values(notification);
  return result;
}

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false)
    ))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationAsRead(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // SECURITY: se userId fornecido, garante que a notificação pertence ao usuário
  const condition = userId
    ? and(eq(notifications.id, id), eq(notifications.userId, userId))
    : eq(notifications.id, id);
  await db.update(notifications).set({ 
    isRead: true, 
    readAt: new Date() 
  }).where(condition);
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set({ 
    isRead: true, 
    readAt: new Date() 
  }).where(and(
    eq(notifications.userId, userId),
    eq(notifications.isRead, false)
  ));
}

// ============= API KEYS =============

export async function createApiKey(apiKey: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(apiKeys).values(apiKey);
  return result;
}

export async function getApiKeyByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(apiKeys)
    .where(and(
      eq(apiKeys.key, key),
      eq(apiKeys.isActive, true)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function updateApiKeyLastUsed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}

export async function revokeApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, id));
}

// ============= SETTINGS =============

export async function getSetting(key: string, tenantId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  if (tenantId) {
    const result = await db.select().from(settings)
      .where(and(eq(settings.key, key), eq(settings.tenantId, tenantId)))
      .limit(1);
    if (result.length > 0) return result[0];
  }
  
  const result = await db.select().from(settings)
    .where(and(eq(settings.key, key), sql`${settings.tenantId} IS NULL`))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setSetting(key: string, value: string, description?: string, tenantId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSetting(key, tenantId);
  
  if (existing) {
    await db.update(settings).set({ value, description }).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({ key, value, description, tenantId: tenantId ?? null });
  }
}

export async function getAllSettings(tenantId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (tenantId) {
    return db.select().from(settings)
      .where(or(
        eq(settings.tenantId, tenantId),
        sql`${settings.tenantId} IS NULL`
      ));
  }
  
  return db.select().from(settings);
}

// ============= REMINDER DEDUPLICATION =============
/**
 * Check if a specific type of notification has already been sent for a booking.
 * Used to prevent duplicate reminders.
 */
export async function hasNotificationBeenSent(bookingId: number, type: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ id: notifications.id })
    .from(notifications)
    .where(and(
      eq(notifications.bookingId, bookingId),
      eq(notifications.type, type as any)
    ))
    .limit(1);
  
  return result.length > 0;
}

// ============= APPOINTMENTS =============

export async function createAppointment(appt: {
  bookingId: number;
  tenantId: number;
  professionalId: number;
  startTime: Date;
  endTime: Date;
  patientName?: string | null;
  patientPhone?: string | null;
  notes?: string | null;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { appointments } = await import('../drizzle/schema');
  const result = await db.insert(appointments).values({
    ...appt,
    status: appt.status ?? 'scheduled',
  });
  return result;
}

export async function getAppointmentsByBooking(bookingId: number) {
  const db = await getDb();
  if (!db) return [];
  const { appointments } = await import('../drizzle/schema');
  return db.select().from(appointments)
    .where(eq(appointments.bookingId, bookingId))
    .orderBy(appointments.startTime);
}

export async function getAppointmentsByProfessional(professionalId: number, tenantId: number, from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const { appointments } = await import('../drizzle/schema');
  const conditions: any[] = [
    eq(appointments.professionalId, professionalId),
    eq(appointments.tenantId, tenantId),
  ];
  if (from) conditions.push(sql`${appointments.startTime} >= ${from}`);
  if (to) conditions.push(sql`${appointments.startTime} <= ${to}`);
  return db.select().from(appointments).where(and(...conditions)).orderBy(appointments.startTime);
}

export async function updateAppointment(id: number, data: {
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  patientName?: string | null;
  patientPhone?: string | null;
  notes?: string | null;
  startTime?: Date;
  endTime?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { appointments } = await import('../drizzle/schema');
  await db.update(appointments).set(data as any).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { appointments } = await import('../drizzle/schema');
  await db.delete(appointments).where(eq(appointments.id, id));
}

export async function deleteAppointmentsByBooking(bookingId: number) {
  const db = await getDb();
  if (!db) return;
  const { appointments } = await import('../drizzle/schema');
  await db.delete(appointments).where(eq(appointments.bookingId, bookingId));
}

// ============= POLICY RESOLVER =============

/**
 * Resolve the cancellation window (in minutes) for a given tenant.
 * Uses cancellationWindowMinutes if present, otherwise falls back to cancellationWindowHours * 60.
 */
export async function getTenantCancellationWindowMinutes(tenantId: number): Promise<number> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return 720; // default 12h
  // cancellationWindowMinutes takes precedence
  if ((tenant as any).cancellationWindowMinutes != null) {
    return (tenant as any).cancellationWindowMinutes as number;
  }
  return tenant.cancellationWindowHours * 60;
}

/**
 * Get the default appointment duration for a professional (minutes).
 */
export async function getProfessionalAppointmentDuration(professionalId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 60;
  const result = await db.select({ appointmentDurationMinutes: users.appointmentDurationMinutes })
    .from(users)
    .where(eq(users.id, professionalId))
    .limit(1);
  if (result.length > 0 && (result[0] as any).appointmentDurationMinutes) {
    return (result[0] as any).appointmentDurationMinutes as number;
  }
  return 60;
}

// ============= STAFF (Internal Users: receptionist, financial) =============

export async function getStaffByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    permCanViewBookings: users.permCanViewBookings,
    permCanViewProfessionals: users.permCanViewProfessionals,
    permCanViewRooms: users.permCanViewRooms,
    permCanCheckIn: users.permCanCheckIn,
    permCanManagePatients: users.permCanManagePatients,
  })
  .from(users)
  .where(and(
    eq(users.tenantId, tenantId),
    sql`${users.role} IN ('receptionist','financial')`
  ))
  .orderBy(users.name);
}

export async function createStaffUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: 'receptionist' | 'financial';
  tenantId: number;
  permCanViewBookings: boolean;
  permCanViewProfessionals: boolean;
  permCanViewRooms: boolean;
  permCanCheckIn: boolean;
  // Descontinuado na UI (Configurações > Usuários Internos) — recepcionista
  // nunca precisou editar dados de paciente. Mantido opcional aqui só para
  // não quebrar chamadas antigas; sempre grava false para novos usuários.
  permCanManagePatients?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.insert(users).values({
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    tenantId: data.tenantId,
    isActive: true,
    permCanViewBookings: data.permCanViewBookings,
    permCanViewProfessionals: data.permCanViewProfessionals,
    permCanViewRooms: data.permCanViewRooms,
    permCanCheckIn: data.permCanCheckIn,
    permCanManagePatients: data.permCanManagePatients ?? false,
  } as any);
}

export async function updateStaffUser(id: number, tenantId: number, data: Partial<{
  name: string;
  role: 'receptionist' | 'financial';
  isActive: boolean;
  passwordHash: string;
  permCanViewBookings: boolean;
  permCanViewProfessionals: boolean;
  permCanViewRooms: boolean;
  permCanCheckIn: boolean;
  // Descontinuado na UI — ver nota em createStaffUser.
  permCanManagePatients: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.update(users)
    .set(data as any)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
}

export async function deleteStaffUser(id: number, tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.delete(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
}

// ============= RECEPTION =============

export async function getReceptionBookings(tenantId: number, startMs: number, endMs: number) {
  const db = await getDb();
  if (!db) return [];
  // BUG CORRIGIDO: a condicao anterior comparava a coluna (enum booking_status)
  // com o valor 'cancelled', que NAO existe no enum (os valores validos sao
  // draft/pending_payment/confirmed/canceled_with_credit/no_show/completed).
  // No Postgres isso lanca "invalid input value for enum booking_status" e
  // derruba a query inteira - por isso o Painel de Recepcao sempre retornava
  // vazio, mesmo com reservas existindo no dia. O frontend ja exibe o status
  // "Cancelada" normalmente (ha badge propria para canceled_with_credit),
  // entao aqui simplesmente listamos todas as reservas do dia, sem excluir
  // nenhum status - igual ao padrao ja usado em admin.listAllBookings.
  return db.select({
    id: bookings.id,
    startTime: bookings.startTime,
    endTime: bookings.endTime,
    status: bookings.status,
    receptionNotes: bookings.receptionNotes,
    roomId: bookings.roomId,
    professionalId: bookings.professionalId,
    patientName: bookings.patientName,
  })
  .from(bookings)
  .where(and(
    eq(bookings.tenantId, tenantId),
    gte(bookings.startTime, new Date(startMs)),
    lte(bookings.startTime, new Date(endMs))
  ))
  .orderBy(bookings.startTime);
}
