import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const tenantPlanEnum = pgEnum("tenant_plan", ["starter", "pro", "business", "enterprise"]);

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "professional", "receptionist", "financial"]);

export const professionalTenantStatusEnum = pgEnum("professional_tenant_status", ["pending", "approved", "rejected", "blocked"]);

export const roomTypeEnum = pgEnum("room_type", ["general", "psychiatry", "dentistry", "physiotherapy", "nursing", "other"]);

export const roomBlockReasonEnum = pgEnum("room_block_reason", ["maintenance", "manager_reserve", "other"]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "draft",
  "pending_payment",
  "confirmed",
  "canceled_with_credit",
  "no_show",
  "completed",
]);

export const creditTypeEnum = pgEnum("credit_type", ["purchase", "refund", "debit", "bonus"]);

export const paymentMethodEnum = pgEnum("payment_method", ["credit_card", "pix", "manual", "credits"]);

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "refunded", "chargeback"]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_confirmation",
  "booking_cancellation",
  "booking_reminder",
  "booking_reminder_24h",
  "booking_reminder_2h",
  "payment_success",
  "payment_failed",
  "credit_added",
  "system",
  "professional_approved",
  "professional_rejected",
  "professional_blocked",
  "general",
  "booking_cancelled",
  "booking_blocked_cancellation",
  "noshow_registered",
]);

export const waitlistContactTypeEnum = pgEnum("waitlist_contact_type", ["email", "phone", "whatsapp"]);

export const waitlistStatusEnum = pgEnum("waitlist_status", ["waiting", "notified", "converted", "expired"]);

export const patientActionEnum = pgEnum("patient_action", ["view", "edit", "export"]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled", "confirmed", "completed", "cancelled", "no_show"
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "trialing", "past_due", "canceled", "unpaid"]);

// ─── TENANTS ──────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  legalName: varchar("legalName", { length: 200 }),
  document: varchar("document", { length: 18 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  addressStreet: varchar("addressStreet", { length: 200 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  addressComplement: varchar("addressComplement", { length: 100 }),
  addressNeighborhood: varchar("addressNeighborhood", { length: 100 }),
  addressCity: varchar("addressCity", { length: 100 }),
  addressState: varchar("addressState", { length: 2 }),
  addressZip: varchar("addressZip", { length: 10 }),
  address: text("address"),
  plan: tenantPlanEnum("plan").default("starter").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  cancellationWindowHours: integer("cancellationWindowHours").default(12).notNull(),
  cancellationWindowMinutes: integer("cancellationWindowMinutes").default(720).notNull(),
  lateArrivalToleranceMinutes: integer("lateArrivalToleranceMinutes").default(15).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── USERS ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("professional").notNull(),
  tenantId: integer("tenantId"),
  professionalRegistry: varchar("professionalRegistry", { length: 50 }),
  registryType: varchar("registryType", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  specialty: varchar("specialty", { length: 100 }),
  publicProfileSlug: varchar("publicProfileSlug", { length: 100 }).unique(),
  bio: text("bio"),
  appointmentDurationMinutes: integer("appointmentDurationMinutes").default(60).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  cnpj: varchar("cnpj", { length: 18 }),
  dateOfBirth: varchar("dateOfBirth", { length: 10 }),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  permCanViewBookings: boolean("permCanViewBookings").default(true).notNull(),
  permCanViewProfessionals: boolean("permCanViewProfessionals").default(true).notNull(),
  permCanViewRooms: boolean("permCanViewRooms").default(true).notNull(),
  permCanCheckIn: boolean("permCanCheckIn").default(true).notNull(),
  permCanManagePatients: boolean("permCanManagePatients").default(false).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── PROFESSIONAL-TENANT ASSOCIATIONS ────────────────────────────────────────

export const professionalTenants = pgTable("professionalTenants", {
  id: serial("id").primaryKey(),
  professionalId: integer("professionalId").notNull(),
  tenantId: integer("tenantId").notNull(),
  status: professionalTenantStatusEnum("status").default("pending").notNull(),
  approvedBy: integer("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  // SECURITY: garante que um profissional só pode ter um vínculo por tenant
  uqProfessionalTenant: uniqueIndex("uq_professional_tenant").on(table.professionalId, table.tenantId),
}));
export type ProfessionalTenant = typeof professionalTenants.$inferSelect;
export type InsertProfessionalTenant = typeof professionalTenants.$inferInsert;

// ─── ROOMS ────────────────────────────────────────────────────────────────────

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  capacity: integer("capacity").notNull().default(1),
  roomType: roomTypeEnum("roomType").default("general").notNull(),
  equipment: text("equipment"),
  features: text("features"),
  photos: text("photos"),
  pricePerHour: integer("pricePerHour").notNull(),
  pricePerHalfDay: integer("pricePerHalfDay"),
  pricePerDay: integer("pricePerDay"),
  bufferBefore: integer("bufferBefore").default(0).notNull(),
  bufferAfter: integer("bufferAfter").default(0).notNull(),
  minDurationMinutes: integer("minDurationMinutes").default(60).notNull(),
  maxDurationMinutes: integer("maxDurationMinutes"),
  minAdvanceHours: integer("minAdvanceHours").default(0).notNull(),
  availableMonday: boolean("availableMonday").default(true),
  availableTuesday: boolean("availableTuesday").default(true),
  availableWednesday: boolean("availableWednesday").default(true),
  availableThursday: boolean("availableThursday").default(true),
  availableFriday: boolean("availableFriday").default(true),
  availableSaturday: boolean("availableSaturday").default(false),
  availableSunday: boolean("availableSunday").default(false),
  openTime: varchar("openTime", { length: 5 }).default("08:00"),
  closeTime: varchar("closeTime", { length: 5 }).default("18:00"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

// ─── ROOM BLOCKS ──────────────────────────────────────────────────────────────

export const roomBlocks = pgTable("roomBlocks", {
  id: serial("id").primaryKey(),
  roomId: integer("roomId").notNull(),
  tenantId: integer("tenantId").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  reason: roomBlockReasonEnum("reason").notNull(),
  notes: text("notes"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type RoomBlock = typeof roomBlocks.$inferSelect;
export type InsertRoomBlock = typeof roomBlocks.$inferInsert;

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  roomId: integer("roomId").notNull(),
  professionalId: integer("professionalId").notNull(),
  patientName: varchar("patientName", { length: 200 }),
  patientPhone: varchar("patientPhone", { length: 20 }),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  bufferStartTime: timestamp("bufferStartTime"),
  bufferEndTime: timestamp("bufferEndTime"),
  totalPrice: integer("totalPrice").notNull(),
  status: bookingStatusEnum("status").default("draft").notNull(),
  paymentId: integer("paymentId"),
  receptionNotes: text("receptionNotes"),
  privateNotes: text("privateNotes"),
  cancelledAt: timestamp("cancelledAt"),
  cancelledBy: integer("cancelledBy"),
  cancellationReason: text("cancellationReason"),
  noShowRegisteredAt: timestamp("noShowRegisteredAt"),
  noShowRegisteredBy: integer("noShowRegisteredBy"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ─── CREDITS ──────────────────────────────────────────────────────────────────

export const credits = pgTable("credits", {
  id: serial("id").primaryKey(),
  professionalId: integer("professionalId").notNull(),
  tenantId: integer("tenantId").notNull(),
  amount: integer("amount").notNull(),
  type: creditTypeEnum("type").notNull(),
  bookingId: integer("bookingId"),
  paymentId: integer("paymentId"),
  description: text("description"),
  balanceAfter: integer("balanceAfter").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  professionalId: integer("professionalId").notNull(),
  tenantId: integer("tenantId").notNull(),
  amount: integer("amount").notNull(),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  pixQrCode: text("pixQrCode"),
  pixQrCodeUrl: text("pixQrCodeUrl"),
  pixExpiresAt: timestamp("pixExpiresAt"),
  invoiceUrl: text("invoiceUrl"),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
  refundedAt: timestamp("refundedAt"),
});
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── CANCELLATION RULES ───────────────────────────────────────────────────────

export const cancellationRules = pgTable("cancellationRules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  hoursBeforeBooking: integer("hoursBeforeBooking").notNull(),
  refundPercentage: integer("refundPercentage").notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type CancellationRule = typeof cancellationRules.$inferSelect;
export type InsertCancellationRule = typeof cancellationRules.$inferInsert;

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  sentViaEmail: boolean("sentViaEmail").default(false),
  sentViaWhatsApp: boolean("sentViaWhatsApp").default(false),
  sentViaApp: boolean("sentViaApp").default(true),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  bookingId: integer("bookingId"),
  paymentId: integer("paymentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  userId: integer("userId"),
  userEmail: varchar("userEmail", { length: 320 }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: integer("entityId"),
  before: text("before"),
  after: text("after"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── WAITLIST ENTRIES ─────────────────────────────────────────────────────────

export const waitlistEntries = pgTable("waitlistEntries", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  professionalId: integer("professionalId").notNull(),
  roomId: integer("roomId"),
  patientName: varchar("patientName", { length: 200 }).notNull(),
  patientContact: varchar("patientContact", { length: 200 }).notNull(),
  contactType: waitlistContactTypeEnum("contactType").default("email").notNull(),
  preferredDays: text("preferredDays"),
  preferredTimeStart: varchar("preferredTimeStart", { length: 5 }),
  preferredTimeEnd: varchar("preferredTimeEnd", { length: 5 }),
  notes: text("notes"),
  status: waitlistStatusEnum("status").default("waiting").notNull(),
  consentId: integer("consentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;

// ─── CONSENT RECORDS ──────────────────────────────────────────────────────────

export const consentRecords = pgTable("consentRecords", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  subjectName: varchar("subjectName", { length: 200 }).notNull(),
  subjectContact: varchar("subjectContact", { length: 200 }).notNull(),
  purpose: varchar("purpose", { length: 200 }).notNull(),
  consentVersion: varchar("consentVersion", { length: 20 }).default("1.0").notNull(),
  consentText: text("consentText").notNull(),
  consentGiven: boolean("consentGiven").default(true).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConsentRecord = typeof consentRecords.$inferSelect;
export type InsertConsentRecord = typeof consentRecords.$inferInsert;

// ─── API KEYS ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable("apiKeys", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tenantId: integer("tenantId"),
  name: varchar("name", { length: 100 }).notNull(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  canReadBookings: boolean("canReadBookings").default(true),
  canCreateBookings: boolean("canCreateBookings").default(true),
  canCancelBookings: boolean("canCancelBookings").default(false),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId"),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── PATIENT ACCESS LOGS (LGPD) ───────────────────────────────────────────────

export const patientAccessLogs = pgTable("patientAccessLogs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  userId: integer("userId").notNull(),
  userEmail: varchar("userEmail", { length: 320 }),
  bookingId: integer("bookingId").notNull(),
  action: patientActionEnum("action").notNull(),
  context: varchar("context", { length: 200 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PatientAccessLog = typeof patientAccessLogs.$inferSelect;
export type InsertPatientAccessLog = typeof patientAccessLogs.$inferInsert;

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull(),
  tenantId: integer("tenantId").notNull(),
  professionalId: integer("professionalId").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  patientName: varchar("patientName", { length: 200 }),
  patientPhone: varchar("patientPhone", { length: 20 }),
  status: appointmentStatusEnum("status").default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── PLANS ────────────────────────────────────────────────────────────────────

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceMonthly: integer("priceMonthly").notNull(),
  priceYearly: integer("priceYearly"),
  maxRooms: integer("maxRooms").notNull().default(5),
  maxProfessionals: integer("maxProfessionals").notNull().default(10),
  features: text("features"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenantId").notNull(),
  planId: integer("planId").notNull(),
  status: subscriptionStatusEnum("status").default("trialing").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
