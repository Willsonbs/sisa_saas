import { eq, and, gte, lte, desc, sql, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  rooms, InsertRoom, Room,
  bookings, InsertBooking, Booking,
  credits, InsertCredit, Credit,
  payments, InsertPayment, Payment,
  cancellationRules, InsertCancellationRule, CancellationRule,
  notifications, InsertNotification, Notification,
  apiKeys, InsertApiKey, ApiKey,
  settings, InsertSetting, Setting
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "professionalRegistry", "registryType", "phone", "cpf", "address"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
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
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getAllProfessionals() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(users).where(eq(users.role, 'professional'));
}

// ============= ROOMS =============

export async function createRoom(room: InsertRoom) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(rooms).values(room);
  return result;
}

export async function updateRoom(id: number, data: Partial<InsertRoom>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(rooms).set(data).where(eq(rooms.id, id));
}

export async function getRoomById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllRooms(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  
  if (includeInactive) {
    return db.select().from(rooms);
  }
  return db.select().from(rooms).where(eq(rooms.isActive, true));
}

export async function deleteRoom(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(rooms).set({ isActive: false }).where(eq(rooms.id, id));
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

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
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
        eq(bookings.status, 'pending')
      )
    ))
    .orderBy(bookings.startTime);
}

export async function checkBookingConflict(roomId: number, startTime: Date, endTime: Date, excludeBookingId?: number) {
  const db = await getDb();
  if (!db) return false;
  
  const conditions = [
    eq(bookings.roomId, roomId),
    or(
      eq(bookings.status, 'confirmed'),
      eq(bookings.status, 'pending')
    ),
    or(
      and(
        gte(bookings.startTime, startTime),
        lte(bookings.startTime, endTime)
      ),
      and(
        gte(bookings.endTime, startTime),
        lte(bookings.endTime, endTime)
      ),
      and(
        lte(bookings.startTime, startTime),
        gte(bookings.endTime, endTime)
      )
    )
  ];
  
  if (excludeBookingId) {
    conditions.push(sql`${bookings.id} != ${excludeBookingId}`);
  }
  
  const conflicts = await db.select().from(bookings).where(and(...conditions)).limit(1);
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
        eq(bookings.status, 'pending')
      )
    ))
    .orderBy(bookings.startTime)
    .limit(limit);
}

export async function getReceptionAgenda(date: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return db.select().from(bookings)
    .where(and(
      gte(bookings.startTime, startOfDay),
      lte(bookings.startTime, endOfDay),
      or(
        eq(bookings.status, 'confirmed'),
        eq(bookings.status, 'pending')
      )
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

export async function getCreditBalance(professionalId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ balance: credits.balanceAfter })
    .from(credits)
    .where(eq(credits.professionalId, professionalId))
    .orderBy(desc(credits.createdAt))
    .limit(1);
  
  return result.length > 0 ? result[0].balance : 0;
}

export async function getCreditHistory(professionalId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(credits)
    .where(eq(credits.professionalId, professionalId))
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

export async function getPaymentHistory(professionalId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(payments)
    .where(eq(payments.professionalId, professionalId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

// ============= CANCELLATION RULES =============

export async function getActiveCancellationRules() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(cancellationRules)
    .where(eq(cancellationRules.isActive, true))
    .orderBy(desc(cancellationRules.hoursBeforeBooking));
}

export async function createCancellationRule(rule: InsertCancellationRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(cancellationRules).values(rule);
  return result;
}

export async function updateCancellationRule(id: number, data: Partial<InsertCancellationRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(cancellationRules).set(data).where(eq(cancellationRules.id, id));
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

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notifications).set({ 
    isRead: true, 
    readAt: new Date() 
  }).where(eq(notifications.id, id));
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

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setSetting(key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSetting(key);
  
  if (existing) {
    await db.update(settings).set({ value, description }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value, description });
  }
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(settings);
}
