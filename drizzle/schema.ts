import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, unique, bigint } from "drizzle-orm/mysql-core";

/**
 * Tenants — cada empresa/prédio é um tenant isolado
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // subdomínio: slug.sisa.com.br
  
  // Razão Social / Documento
  legalName: varchar("legalName", { length: 200 }), // Razão Social
  document: varchar("document", { length: 18 }),    // CPF ou CNPJ

  // Contact
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),

  // Endereço detalhado
  addressStreet: varchar("addressStreet", { length: 200 }),
  addressNumber: varchar("addressNumber", { length: 20 }),
  addressComplement: varchar("addressComplement", { length: 100 }),
  addressNeighborhood: varchar("addressNeighborhood", { length: 100 }),
  addressCity: varchar("addressCity", { length: 100 }),
  addressState: varchar("addressState", { length: 2 }),
  addressZip: varchar("addressZip", { length: 10 }),

  // Legacy single-field address (kept for compatibility)
  address: text("address"),
  
  // Plan
  plan: mysqlEnum("plan", ["starter", "pro", "business", "enterprise"]).default("starter").notNull(),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Cancellation policy (hours before booking)
  cancellationWindowHours: int("cancellationWindowHours").default(12).notNull(),

  // Cancellation policy for professionals (minutes before booking start)
  // Overrides cancellationWindowHours when set (more granular)
  cancellationWindowMinutes: int("cancellationWindowMinutes").default(720).notNull(), // default 12h = 720min
  
  // Late arrival policy (minutes)
  lateArrivalToleranceMinutes: int("lateArrivalToleranceMinutes").default(15).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

/**
 * Core user table backing auth flow.
 * Extended with professional health fields and role-based access control.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "professional", "receptionist", "financial"]).default("professional").notNull(),
  
  // Tenant association (null = super admin / platform owner)
  tenantId: int("tenantId"),
  
  // Professional health fields
  professionalRegistry: varchar("professionalRegistry", { length: 50 }), // CRP, CRM, CRO, etc.
  registryType: varchar("registryType", { length: 20 }), // "CRP", "CRM", "CRO", etc.
  phone: varchar("phone", { length: 20 }),
  specialty: varchar("specialty", { length: 100 }),
  
  // Public profile
  publicProfileSlug: varchar("publicProfileSlug", { length: 100 }).unique(), // URL pública: /p/:slug
  bio: text("bio"),

  // Default appointment duration for this professional (minutes)
  appointmentDurationMinutes: int("appointmentDurationMinutes").default(60).notNull(),
  
  // Billing information
  cpf: varchar("cpf", { length: 14 }),
  address: text("address"),
  
  // Internal user (receptionist/financial) permission flags
  permCanViewBookings: boolean("permCanViewBookings").default(true).notNull(),
  permCanViewProfessionals: boolean("permCanViewProfessionals").default(true).notNull(),
  permCanViewRooms: boolean("permCanViewRooms").default(true).notNull(),
  permCanCheckIn: boolean("permCanCheckIn").default(true).notNull(),
  permCanManagePatients: boolean("permCanManagePatients").default(false).notNull(),

  // Password hash for email/password login (staff users)
  passwordHash: varchar("passwordHash", { length: 255 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Professional-Tenant associations (vínculo com status de aprovação)
 */
export const professionalTenants = mysqlTable("professionalTenants", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  tenantId: int("tenantId").notNull(),
  
  // Approval status
  status: mysqlEnum("status", ["pending", "approved", "rejected", "blocked"]).default("pending").notNull(),
  
  approvedBy: int("approvedBy"), // userId who approved
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProfessionalTenant = typeof professionalTenants.$inferSelect;
export type InsertProfessionalTenant = typeof professionalTenants.$inferInsert;

/**
 * Rooms available for booking
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  capacity: int("capacity").notNull().default(1),
  
  // Room type
  roomType: mysqlEnum("roomType", ["general", "psychiatry", "dentistry", "physiotherapy", "nursing", "other"]).default("general").notNull(),
  
  // Equipment and features
  equipment: text("equipment"), // JSON array of equipment names
  features: text("features"), // JSON array of features
  
  // Photos
  photos: text("photos"), // JSON array of photo URLs from S3
  
  // Pricing (stored in cents to avoid decimal issues)
  pricePerHour: int("pricePerHour").notNull(), // in cents
  pricePerHalfDay: int("pricePerHalfDay"), // in cents
  pricePerDay: int("pricePerDay"), // in cents
  
  // Buffer rules (minutes)
  bufferBefore: int("bufferBefore").default(0).notNull(),
  bufferAfter: int("bufferAfter").default(0).notNull(),
  
  // Booking constraints
  minDurationMinutes: int("minDurationMinutes").default(60).notNull(), // minimum booking duration
  maxDurationMinutes: int("maxDurationMinutes"), // maximum booking duration (null = no limit)
  minAdvanceHours: int("minAdvanceHours").default(0).notNull(), // minimum advance booking time
  
  // Availability by day of week (0=Sunday, 6=Saturday)
  availableMonday: boolean("availableMonday").default(true),
  availableTuesday: boolean("availableTuesday").default(true),
  availableWednesday: boolean("availableWednesday").default(true),
  availableThursday: boolean("availableThursday").default(true),
  availableFriday: boolean("availableFriday").default(true),
  availableSaturday: boolean("availableSaturday").default(false),
  availableSunday: boolean("availableSunday").default(false),
  
  // Operating hours (stored as HH:mm format)
  openTime: varchar("openTime", { length: 5 }).default("08:00"),
  closeTime: varchar("closeTime", { length: 5 }).default("18:00"),
  
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

/**
 * Room blocks — bloqueios manuais (manutenção, reservado pelo gestor)
 */
export const roomBlocks = mysqlTable("roomBlocks", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  tenantId: int("tenantId").notNull(),
  
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  
  reason: mysqlEnum("reason", ["maintenance", "manager_reserve", "other"]).notNull(),
  notes: text("notes"),
  
  createdBy: int("createdBy").notNull(), // userId who created the block
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RoomBlock = typeof roomBlocks.$inferSelect;
export type InsertRoomBlock = typeof roomBlocks.$inferInsert;

/**
 * Bookings/Reservations — with full state machine
 * States: draft → pending_payment → confirmed → canceled_with_credit | no_show | completed
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  
  roomId: int("roomId").notNull(),
  professionalId: int("professionalId").notNull(),
  
  // Patient information (only visible to professional and admin)
  patientName: varchar("patientName", { length: 200 }),
  patientPhone: varchar("patientPhone", { length: 20 }),
  
  // Booking time (stored as UTC timestamps)
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  
  // Buffer slots (for display/conflict check)
  bufferStartTime: timestamp("bufferStartTime"), // startTime - bufferBefore
  bufferEndTime: timestamp("bufferEndTime"),     // endTime + bufferAfter
  
  // Pricing snapshot at booking time (in cents)
  totalPrice: int("totalPrice").notNull(),
  
  // Full state machine status
  status: mysqlEnum("status", [
    "draft",
    "pending_payment",
    "confirmed",
    "canceled_with_credit",
    "no_show",
    "completed"
  ]).default("draft").notNull(),
  
  // Payment reference
  paymentId: int("paymentId"),
  
  // Notes visible to receptionist
  receptionNotes: text("receptionNotes"),
  
  // Private notes only for professional
  privateNotes: text("privateNotes"),
  
  // Cancellation info
  cancelledAt: timestamp("cancelledAt"),
  cancelledBy: int("cancelledBy"),
  cancellationReason: text("cancellationReason"),
  
  // No-show info
  noShowRegisteredAt: timestamp("noShowRegisteredAt"),
  noShowRegisteredBy: int("noShowRegisteredBy"),
  
  // Completion
  completedAt: timestamp("completedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Credit system for professionals — per tenant wallet
 */
export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  tenantId: int("tenantId").notNull(), // credits are tenant-scoped
  
  // Amount in cents
  amount: int("amount").notNull(),
  
  // Transaction type
  type: mysqlEnum("type", ["purchase", "refund", "debit", "bonus"]).notNull(),
  
  // Reference to related entities
  bookingId: int("bookingId"),
  paymentId: int("paymentId"),
  
  description: text("description"),
  
  // Balance after this transaction (in cents)
  balanceAfter: int("balanceAfter").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

/**
 * Payment transactions — with full financial state machine
 * States: pending → paid → refunded | chargeback
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  tenantId: int("tenantId").notNull(),
  
  // Amount in cents
  amount: int("amount").notNull(),
  
  // Payment method
  method: mysqlEnum("method", ["credit_card", "pix", "manual", "credits"]).notNull(),
  
  // Financial state machine
  status: mysqlEnum("status", ["pending", "paid", "refunded", "chargeback"]).default("pending").notNull(),
  
  // Stripe integration
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  
  // PIX information
  pixQrCode: text("pixQrCode"),
  pixQrCodeUrl: text("pixQrCodeUrl"),
  pixExpiresAt: timestamp("pixExpiresAt"),
  
  // Invoice / receipt
  invoiceUrl: text("invoiceUrl"),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  
  // Metadata
  metadata: text("metadata"), // JSON for additional data
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  paidAt: timestamp("paidAt"),
  refundedAt: timestamp("refundedAt"),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Cancellation rules configuration — per tenant
 */
export const cancellationRules = mysqlTable("cancellationRules", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"), // null = global default
  
  // Hours before booking start time
  hoursBeforeBooking: int("hoursBeforeBooking").notNull(),
  
  // Refund percentage (0-100)
  refundPercentage: int("refundPercentage").notNull(),
  
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CancellationRule = typeof cancellationRules.$inferSelect;
export type InsertCancellationRule = typeof cancellationRules.$inferInsert;

/**
 * Notifications sent to users
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId"),
  
  type: mysqlEnum("type", [
    "booking_confirmation",
    "booking_reminder",
    "booking_reminder_24h",
    "booking_reminder_2h",
    "booking_cancelled",
    "booking_blocked_cancellation",
    "payment_success",
    "payment_failed",
    "credit_added",
    "noshow_registered",
    "professional_approved",
    "professional_blocked",
    "general"
  ]).notNull(),
  
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  
  // Notification channels
  sentViaEmail: boolean("sentViaEmail").default(false),
  sentViaWhatsApp: boolean("sentViaWhatsApp").default(false),
  sentViaApp: boolean("sentViaApp").default(true),
  
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  
  // Related entities
  bookingId: int("bookingId"),
  paymentId: int("paymentId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Audit log — trilha de auditoria para ações críticas
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  
  // Who performed the action
  userId: int("userId"),
  userEmail: varchar("userEmail", { length: 320 }),
  
  // What action was performed
  action: varchar("action", { length: 100 }).notNull(), // e.g., "booking.cancel", "room.price_change"
  
  // What entity was affected
  entityType: varchar("entityType", { length: 50 }).notNull(), // "booking", "room", "user", "credit"
  entityId: int("entityId"),
  
  // State before and after
  before: text("before"), // JSON snapshot
  after: text("after"),   // JSON snapshot
  
  // Context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Waitlist entries — lista de espera do portal público do paciente
 */
export const waitlistEntries = mysqlTable("waitlistEntries", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  professionalId: int("professionalId").notNull(),
  roomId: int("roomId"), // optional: specific room preference
  
  // Patient info (minimal)
  patientName: varchar("patientName", { length: 200 }).notNull(),
  patientContact: varchar("patientContact", { length: 200 }).notNull(), // email or phone
  contactType: mysqlEnum("contactType", ["email", "phone", "whatsapp"]).default("email").notNull(),
  
  // Preferences
  preferredDays: text("preferredDays"), // JSON array: ["monday", "wednesday"]
  preferredTimeStart: varchar("preferredTimeStart", { length: 5 }), // HH:mm
  preferredTimeEnd: varchar("preferredTimeEnd", { length: 5 }),     // HH:mm
  notes: text("notes"),
  
  // Status
  status: mysqlEnum("status", ["waiting", "notified", "converted", "expired"]).default("waiting").notNull(),
  
  // LGPD consent reference
  consentId: int("consentId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;

/**
 * Consent records — consentimento LGPD
 */
export const consentRecords = mysqlTable("consentRecords", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  
  // Data subject (titular dos dados)
  subjectName: varchar("subjectName", { length: 200 }).notNull(),
  subjectContact: varchar("subjectContact", { length: 200 }).notNull(),
  
  // Consent details
  purpose: varchar("purpose", { length: 200 }).notNull(), // e.g., "waitlist_contact"
  consentVersion: varchar("consentVersion", { length: 20 }).default("1.0").notNull(),
  consentText: text("consentText").notNull(), // Full text shown to user
  
  // Consent given
  consentGiven: boolean("consentGiven").default(true).notNull(),
  
  // Context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsentRecord = typeof consentRecords.$inferSelect;
export type InsertConsentRecord = typeof consentRecords.$inferInsert;

/**
 * API keys for external integrations
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId"),
  
  name: varchar("name", { length: 100 }).notNull(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  
  isActive: boolean("isActive").default(true).notNull(),
  
  // Permissions
  canReadBookings: boolean("canReadBookings").default(true),
  canCreateBookings: boolean("canCreateBookings").default(true),
  canCancelBookings: boolean("canCancelBookings").default(false),
  
  lastUsedAt: timestamp("lastUsedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * System settings and configuration
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"), // null = global
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Patient Access Logs — trilha de acesso a dados sensíveis de pacientes (LGPD)
 * Registra quem abriu/visualizou/editou dados de paciente e quando.
 * "Não basta registrar alteração — precisa saber: quem abriu o prontuário?"
 */
export const patientAccessLogs = mysqlTable("patientAccessLogs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),

  // Quem acessou
  userId: int("userId").notNull(),
  userEmail: varchar("userEmail", { length: 320 }),

  // Qual reserva/paciente foi acessado
  bookingId: int("bookingId").notNull(),

  // Tipo de ação: view = visualizou, edit = editou, export = exportou
  action: mysqlEnum("action", ["view", "edit", "export"]).notNull(),

  // Contexto adicional (ex: "Acessou via dashboard", "Editou privateNotes")
  context: varchar("context", { length: 200 }),

  // Endereço IP para auditoria
  ipAddress: varchar("ipAddress", { length: 45 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PatientAccessLog = typeof patientAccessLogs.$inferSelect;
export type InsertPatientAccessLog = typeof patientAccessLogs.$inferInsert;

/**
 * Appointments — atendimentos individuais dentro de uma reserva
 * Uma reserva pode conter múltiplos atendimentos (ex: reserva 14h-16h com pacientes a cada 30min)
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  tenantId: int("tenantId").notNull(),
  professionalId: int("professionalId").notNull(),

  // Horário individual do atendimento
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),

  // Dados do paciente (criptografados — LGPD)
  patientName: varchar("patientName", { length: 200 }),
  patientPhone: varchar("patientPhone", { length: 20 }),

  // Status do atendimento
  status: mysqlEnum("status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]).default("scheduled").notNull(),

  // Observações
  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Plans — planos de assinatura da plataforma SISA
 */
export const plans = mysqlTable("plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  priceMonthly: int("priceMonthly").notNull(), // in cents
  priceYearly: int("priceYearly"),             // in cents
  maxRooms: int("maxRooms").notNull().default(5),
  maxProfessionals: int("maxProfessionals").notNull().default(10),
  features: text("features"),                  // JSON array of feature strings
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * Subscriptions — assinaturas dos tenants
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  planId: int("planId").notNull(),
  status: mysqlEnum("status", ["active", "trialing", "past_due", "canceled", "unpaid"]).default("trialing").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  canceledAt: timestamp("canceledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
