import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, unique } from "drizzle-orm/mysql-core";

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
  role: mysqlEnum("role", ["admin", "professional", "receptionist", "financial"]).default("professional").notNull(),
  
  // Professional health fields
  professionalRegistry: varchar("professionalRegistry", { length: 50 }), // CRP, CRM, CRO, etc.
  registryType: varchar("registryType", { length: 20 }), // "CRP", "CRM", "CRO", etc.
  phone: varchar("phone", { length: 20 }),
  
  // Billing information
  cpf: varchar("cpf", { length: 14 }),
  address: text("address"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Rooms available for booking
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  capacity: int("capacity").notNull().default(1),
  
  // Equipment and features
  equipment: text("equipment"), // JSON array of equipment names
  features: text("features"), // JSON array of features
  
  // Photos
  photos: text("photos"), // JSON array of photo URLs from S3
  
  // Pricing (stored in cents to avoid decimal issues)
  pricePerHour: int("pricePerHour").notNull(), // in cents
  pricePerHalfDay: int("pricePerHalfDay"), // in cents
  pricePerDay: int("pricePerDay"), // in cents
  
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
 * Bookings/Reservations
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  
  roomId: int("roomId").notNull(),
  professionalId: int("professionalId").notNull(),
  
  // Patient information (only visible to professional and admin)
  patientName: varchar("patientName", { length: 200 }).notNull(),
  patientPhone: varchar("patientPhone", { length: 20 }),
  
  // Booking time (stored as Unix timestamp in milliseconds)
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  
  // Pricing snapshot at booking time (in cents)
  totalPrice: int("totalPrice").notNull(),
  
  // Status
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  
  // Notes visible to receptionist
  receptionNotes: text("receptionNotes"),
  
  // Private notes only for professional
  privateNotes: text("privateNotes"),
  
  // Cancellation info
  cancelledAt: timestamp("cancelledAt"),
  cancelledBy: int("cancelledBy"),
  cancellationReason: text("cancellationReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Credit system for professionals
 */
export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  
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
 * Payment transactions
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  
  // Amount in cents
  amount: int("amount").notNull(),
  
  // Payment method
  method: mysqlEnum("method", ["credit_card", "pix", "manual"]).notNull(),
  
  // Payment status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "refunded"]).default("pending").notNull(),
  
  // Stripe integration
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeChargeId: varchar("stripeChargeId", { length: 255 }),
  
  // PIX information
  pixQrCode: text("pixQrCode"),
  pixQrCodeUrl: text("pixQrCodeUrl"),
  pixExpiresAt: timestamp("pixExpiresAt"),
  
  // Invoice
  invoiceUrl: text("invoiceUrl"),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }),
  
  // Metadata
  metadata: text("metadata"), // JSON for additional data
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Cancellation rules configuration
 */
export const cancellationRules = mysqlTable("cancellationRules", {
  id: int("id").autoincrement().primaryKey(),
  
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
  
  type: mysqlEnum("type", ["booking_confirmation", "booking_reminder", "booking_cancelled", "payment_success", "payment_failed", "credit_added", "general"]).notNull(),
  
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  
  // Notification channels
  sentViaEmail: boolean("sentViaEmail").default(false),
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
 * API keys for external integrations
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
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
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
