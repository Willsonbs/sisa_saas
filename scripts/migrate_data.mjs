/**
 * Script de migração de dados: MySQL (TiDB) → PostgreSQL (Supabase)
 * 
 * Uso:
 *   MYSQL_URL="mysql://..." PG_URL="postgresql://..." node scripts/migrate_data.mjs
 * 
 * Ordem de inserção respeita dependências de FK:
 *   tenants → users → professionalTenants → rooms → roomBlocks
 *   → payments → bookings → credits → notifications → auditLogs
 *   → waitlistEntries → consentRecords → apiKeys → settings
 *   → patientAccessLogs → appointments → plans → subscriptions
 */

import mysql from 'mysql2/promise';
import pg from 'pg';

const { Pool: PgPool } = pg;

const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL;
const PG_URL = process.env.PG_URL;

if (!MYSQL_URL) { console.error('MYSQL_URL ou DATABASE_URL não definida'); process.exit(1); }
if (!PG_URL) { console.error('PG_URL não definida'); process.exit(1); }

// ─── Conexões ─────────────────────────────────────────────────────────────────

const mysqlConn = await mysql.createConnection(MYSQL_URL);
const pgPool = new PgPool({ connectionString: PG_URL, ssl: { rejectUnauthorized: false } });

console.log('✅ Conectado ao MySQL e ao PostgreSQL\n');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return new Date(v);
}

function toBool(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v;
  return v === 1 || v === '1' || v === 'true';
}

async function migrateTable(tableName, mysqlQuery, pgInsertFn, transformFn) {
  console.log(`📦 Migrando tabela: ${tableName}`);
  const [rows] = await mysqlConn.query(mysqlQuery);
  if (rows.length === 0) {
    console.log(`   ↳ Vazia, pulando.\n`);
    return 0;
  }

  let count = 0;
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    for (const row of rows) {
      const transformed = transformFn ? transformFn(row) : row;
      if (transformed) {
        await pgInsertFn(client, transformed);
        count++;
      }
    }
    await client.query('COMMIT');
    console.log(`   ↳ ${count} registros migrados.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`   ↳ ERRO em ${tableName}:`, err.message);
    throw err;
  } finally {
    client.release();
  }
  return count;
}

// ─── TENANTS ─────────────────────────────────────────────────────────────────

await migrateTable(
  'tenants',
  'SELECT * FROM tenants',
  async (client, r) => client.query(
    `INSERT INTO "tenants" (id, name, slug, "legalName", document, email, phone,
      "addressStreet", "addressNumber", "addressComplement", "addressNeighborhood",
      "addressCity", "addressState", "addressZip", address, plan, "isActive",
      "cancellationWindowHours", "cancellationWindowMinutes", "lateArrivalToleranceMinutes",
      "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
    [r.id, r.name, r.slug, r.legalName, r.document, r.email, r.phone,
     r.addressStreet, r.addressNumber, r.addressComplement, r.addressNeighborhood,
     r.addressCity, r.addressState, r.addressZip, r.address,
     r.plan || 'starter', toBool(r.isActive) ?? true,
     r.cancellationWindowHours ?? 12, r.cancellationWindowMinutes ?? 720,
     r.lateArrivalToleranceMinutes ?? 15,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── USERS ───────────────────────────────────────────────────────────────────

await migrateTable(
  'users',
  'SELECT * FROM users',
  async (client, r) => client.query(
    `INSERT INTO "users" (id, "openId", name, email, password, "loginMethod", role,
      "tenantId", "professionalRegistry", "registryType", phone, specialty,
      "publicProfileSlug", bio, "appointmentDurationMinutes", cpf, address,
      "permCanViewBookings", "permCanViewProfessionals", "permCanViewRooms",
      "permCanCheckIn", "permCanManagePatients", "passwordHash",
      "createdAt", "updatedAt", "lastSignedIn")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email`,
    [r.id, r.openId, r.name, r.email, r.password, r.loginMethod,
     r.role || 'professional', r.tenantId,
     r.professionalRegistry, r.registryType, r.phone, r.specialty,
     r.publicProfileSlug, r.bio, r.appointmentDurationMinutes ?? 60,
     r.cpf, r.address,
     toBool(r.permCanViewBookings) ?? true, toBool(r.permCanViewProfessionals) ?? true,
     toBool(r.permCanViewRooms) ?? true, toBool(r.permCanCheckIn) ?? true,
     toBool(r.permCanManagePatients) ?? false,
     r.passwordHash,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date(),
     toDate(r.lastSignedIn) || new Date()]
  )
);

// ─── PROFESSIONAL TENANTS ─────────────────────────────────────────────────────

await migrateTable(
  'professionalTenants',
  'SELECT * FROM professionalTenants',
  async (client, r) => client.query(
    `INSERT INTO "professionalTenants" (id, "professionalId", "tenantId", status,
      "approvedBy", "approvedAt", "rejectionReason", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.professionalId, r.tenantId, r.status || 'pending',
     r.approvedBy, toDate(r.approvedAt), r.rejectionReason,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── ROOMS ────────────────────────────────────────────────────────────────────

await migrateTable(
  'rooms',
  'SELECT * FROM rooms',
  async (client, r) => client.query(
    `INSERT INTO "rooms" (id, "tenantId", name, description, capacity, "roomType",
      equipment, features, photos, "pricePerHour", "pricePerHalfDay", "pricePerDay",
      "bufferBefore", "bufferAfter", "minDurationMinutes", "maxDurationMinutes",
      "minAdvanceHours", "availableMonday", "availableTuesday", "availableWednesday",
      "availableThursday", "availableFriday", "availableSaturday", "availableSunday",
      "openTime", "closeTime", "isActive", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
    [r.id, r.tenantId, r.name, r.description, r.capacity ?? 1,
     r.roomType || 'general', r.equipment, r.features, r.photos,
     r.pricePerHour ?? 0, r.pricePerHalfDay, r.pricePerDay,
     r.bufferBefore ?? 0, r.bufferAfter ?? 0,
     r.minDurationMinutes ?? 60, r.maxDurationMinutes, r.minAdvanceHours ?? 0,
     toBool(r.availableMonday) ?? true, toBool(r.availableTuesday) ?? true,
     toBool(r.availableWednesday) ?? true, toBool(r.availableThursday) ?? true,
     toBool(r.availableFriday) ?? true, toBool(r.availableSaturday) ?? false,
     toBool(r.availableSunday) ?? false,
     r.openTime || '08:00', r.closeTime || '18:00',
     toBool(r.isActive) ?? true,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── ROOM BLOCKS ──────────────────────────────────────────────────────────────

await migrateTable(
  'roomBlocks',
  'SELECT * FROM roomBlocks',
  async (client, r) => client.query(
    `INSERT INTO "roomBlocks" (id, "roomId", "tenantId", "startTime", "endTime",
      reason, notes, "createdBy", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.roomId, r.tenantId, toDate(r.startTime), toDate(r.endTime),
     r.reason || 'other', r.notes, r.createdBy,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

await migrateTable(
  'payments',
  'SELECT * FROM payments',
  async (client, r) => client.query(
    `INSERT INTO "payments" (id, "professionalId", "tenantId", amount, method, status,
      "stripePaymentIntentId", "stripeChargeId", "pixQrCode", "pixQrCodeUrl",
      "pixExpiresAt", "invoiceUrl", "invoiceNumber", metadata,
      "createdAt", "updatedAt", "paidAt", "refundedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.professionalId, r.tenantId, r.amount ?? 0,
     r.method || 'manual', r.status || 'pending',
     r.stripePaymentIntentId, r.stripeChargeId,
     r.pixQrCode, r.pixQrCodeUrl, toDate(r.pixExpiresAt),
     r.invoiceUrl, r.invoiceNumber, r.metadata,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date(),
     toDate(r.paidAt), toDate(r.refundedAt)]
  )
);

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

await migrateTable(
  'bookings',
  'SELECT * FROM bookings',
  async (client, r) => client.query(
    `INSERT INTO "bookings" (id, "tenantId", "roomId", "professionalId",
      "patientName", "patientPhone", "startTime", "endTime",
      "bufferStartTime", "bufferEndTime", "totalPrice", status,
      "paymentId", "receptionNotes", "privateNotes",
      "cancelledAt", "cancelledBy", "cancellationReason",
      "noShowRegisteredAt", "noShowRegisteredBy", "completedAt",
      "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.roomId, r.professionalId,
     r.patientName, r.patientPhone,
     toDate(r.startTime), toDate(r.endTime),
     toDate(r.bufferStartTime), toDate(r.bufferEndTime),
     r.totalPrice ?? 0, r.status || 'draft',
     r.paymentId, r.receptionNotes, r.privateNotes,
     toDate(r.cancelledAt), r.cancelledBy, r.cancellationReason,
     toDate(r.noShowRegisteredAt), r.noShowRegisteredBy, toDate(r.completedAt),
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── CREDITS ──────────────────────────────────────────────────────────────────

await migrateTable(
  'credits',
  'SELECT * FROM credits',
  async (client, r) => client.query(
    `INSERT INTO "credits" (id, "professionalId", "tenantId", amount, type,
      "bookingId", "paymentId", description, "balanceAfter", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.professionalId, r.tenantId, r.amount ?? 0,
     r.type || 'purchase', r.bookingId, r.paymentId,
     r.description, r.balanceAfter ?? 0,
     toDate(r.createdAt) || new Date()]
  )
);

// ─── CANCELLATION RULES ───────────────────────────────────────────────────────

await migrateTable(
  'cancellationRules',
  'SELECT * FROM cancellationRules',
  async (client, r) => client.query(
    `INSERT INTO "cancellationRules" (id, "tenantId", "hoursBeforeBooking",
      "refundPercentage", description, "isActive", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.hoursBeforeBooking ?? 24,
     r.refundPercentage ?? 100, r.description,
     toBool(r.isActive) ?? true,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

const VALID_NOTIF_TYPES = [
  'booking_confirmation','booking_cancellation','booking_reminder',
  'booking_reminder_24h','booking_reminder_2h','payment_success',
  'payment_failed','credit_added','system','professional_approved',
  'professional_rejected','professional_blocked','general',
  'booking_cancelled','booking_blocked_cancellation','noshow_registered',
];

await migrateTable(
  'notifications',
  'SELECT * FROM notifications',
  async (client, r) => client.query(
    `INSERT INTO "notifications" (id, "userId", "tenantId", type, title, message,
      "sentViaEmail", "sentViaWhatsApp", "sentViaApp", "isRead", "readAt",
      "bookingId", "paymentId", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.userId, r.tenantId,
     VALID_NOTIF_TYPES.includes(r.type) ? r.type : 'general',
     r.title || 'Notificação', r.message || '',
     toBool(r.sentViaEmail) ?? false, toBool(r.sentViaWhatsApp) ?? false,
     toBool(r.sentViaApp) ?? true, toBool(r.isRead) ?? false,
     toDate(r.readAt), r.bookingId, r.paymentId,
     toDate(r.createdAt) || new Date()]
  )
);

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

await migrateTable(
  'auditLogs',
  'SELECT * FROM auditLogs',
  async (client, r) => client.query(
    `INSERT INTO "auditLogs" (id, "tenantId", "userId", "userEmail", action,
      "entityType", "entityId", before, after, "ipAddress", "userAgent", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.userId, r.userEmail, r.action || 'unknown',
     r.entityType || 'unknown', r.entityId, r.before, r.after,
     r.ipAddress, r.userAgent,
     toDate(r.createdAt) || new Date()]
  )
);

// ─── WAITLIST ENTRIES ─────────────────────────────────────────────────────────

await migrateTable(
  'waitlistEntries',
  'SELECT * FROM waitlistEntries',
  async (client, r) => client.query(
    `INSERT INTO "waitlistEntries" (id, "tenantId", "professionalId", "roomId",
      "patientName", "patientContact", "contactType", "preferredDays",
      "preferredTimeStart", "preferredTimeEnd", notes, status, "consentId",
      "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.professionalId, r.roomId,
     r.patientName || '', r.patientContact || '',
     r.contactType || 'email', r.preferredDays,
     r.preferredTimeStart, r.preferredTimeEnd, r.notes,
     r.status || 'waiting', r.consentId,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── CONSENT RECORDS ──────────────────────────────────────────────────────────

await migrateTable(
  'consentRecords',
  'SELECT * FROM consentRecords',
  async (client, r) => client.query(
    `INSERT INTO "consentRecords" (id, "tenantId", "subjectName", "subjectContact",
      purpose, "consentVersion", "consentText", "consentGiven",
      "ipAddress", "userAgent", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.subjectName || '', r.subjectContact || '',
     r.purpose || '', r.consentVersion || '1.0',
     r.consentText || '', toBool(r.consentGiven) ?? true,
     r.ipAddress, r.userAgent,
     toDate(r.createdAt) || new Date()]
  )
);

// ─── API KEYS ─────────────────────────────────────────────────────────────────

await migrateTable(
  'apiKeys',
  'SELECT * FROM apiKeys',
  async (client, r) => client.query(
    `INSERT INTO "apiKeys" (id, "userId", "tenantId", name, key, "isActive",
      "canReadBookings", "canCreateBookings", "canCancelBookings",
      "lastUsedAt", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.userId, r.tenantId, r.name || '', r.key || '',
     toBool(r.isActive) ?? true,
     toBool(r.canReadBookings) ?? true, toBool(r.canCreateBookings) ?? true,
     toBool(r.canCancelBookings) ?? false,
     toDate(r.lastUsedAt),
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

await migrateTable(
  'settings',
  'SELECT * FROM settings',
  async (client, r) => client.query(
    `INSERT INTO "settings" (id, "tenantId", key, value, description, "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.key || '', r.value || '',
     r.description, toDate(r.updatedAt) || new Date()]
  )
);

// ─── PATIENT ACCESS LOGS ──────────────────────────────────────────────────────

await migrateTable(
  'patientAccessLogs',
  'SELECT * FROM patientAccessLogs',
  async (client, r) => client.query(
    `INSERT INTO "patientAccessLogs" (id, "tenantId", "userId", "userEmail",
      "bookingId", action, context, "ipAddress", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.userId, r.userEmail, r.bookingId,
     r.action || 'view', r.context, r.ipAddress,
     toDate(r.createdAt) || new Date()]
  )
);

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

await migrateTable(
  'appointments',
  'SELECT * FROM appointments',
  async (client, r) => client.query(
    `INSERT INTO "appointments" (id, "bookingId", "tenantId", "professionalId",
      "startTime", "endTime", "patientName", "patientPhone", status, notes,
      "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.bookingId, r.tenantId, r.professionalId,
     toDate(r.startTime), toDate(r.endTime),
     r.patientName, r.patientPhone, r.status || 'scheduled',
     r.notes, toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── PLANS ────────────────────────────────────────────────────────────────────

await migrateTable(
  'plans',
  'SELECT * FROM plans',
  async (client, r) => client.query(
    `INSERT INTO "plans" (id, name, description, "priceMonthly", "priceYearly",
      "maxRooms", "maxProfessionals", features, "isActive", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.name || '', r.description, r.priceMonthly ?? 0, r.priceYearly,
     r.maxRooms ?? 5, r.maxProfessionals ?? 10, r.features,
     toBool(r.isActive) ?? true,
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

await migrateTable(
  'subscriptions',
  'SELECT * FROM subscriptions',
  async (client, r) => client.query(
    `INSERT INTO "subscriptions" (id, "tenantId", "planId", status,
      "stripeCustomerId", "stripeSubscriptionId",
      "currentPeriodStart", "currentPeriodEnd", "canceledAt",
      "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO NOTHING`,
    [r.id, r.tenantId, r.planId, r.status || 'trialing',
     r.stripeCustomerId, r.stripeSubscriptionId,
     toDate(r.currentPeriodStart), toDate(r.currentPeriodEnd), toDate(r.canceledAt),
     toDate(r.createdAt) || new Date(), toDate(r.updatedAt) || new Date()]
  )
);

// ─── Atualizar sequences PostgreSQL ───────────────────────────────────────────

console.log('🔄 Atualizando sequences das tabelas...');
const tables = [
  'tenants','users','professionalTenants','rooms','roomBlocks',
  'payments','bookings','credits','cancellationRules','notifications',
  'auditLogs','waitlistEntries','consentRecords','apiKeys','settings',
  'patientAccessLogs','appointments','plans','subscriptions'
];

const client = await pgPool.connect();
try {
  for (const table of tables) {
    try {
      await client.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`);
      process.stdout.write('.');
    } catch (e) {
      // tabela pode estar vazia
    }
  }
  console.log('\n✅ Sequences atualizadas.\n');
} finally {
  client.release();
}

// ─── Resumo final ─────────────────────────────────────────────────────────────

console.log('🎉 Migração concluída com sucesso!');
console.log('   Verifique os dados no Supabase Dashboard.');

await mysqlConn.end();
await pgPool.end();
