import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log("🌱 Seeding database...");

// Create default cancellation rules
const cancellationRules = [
  {
    hoursBeforeBooking: 48,
    refundPercentage: 100,
    description: "Cancelamento com 48h ou mais de antecedência - reembolso total",
    isActive: true,
  },
  {
    hoursBeforeBooking: 24,
    refundPercentage: 50,
    description: "Cancelamento entre 24h e 48h de antecedência - reembolso de 50%",
    isActive: true,
  },
  {
    hoursBeforeBooking: 0,
    refundPercentage: 0,
    description: "Cancelamento com menos de 24h de antecedência - sem reembolso",
    isActive: true,
  },
];

for (const rule of cancellationRules) {
  await db.insert(schema.cancellationRules).values(rule);
  console.log(`✓ Created cancellation rule: ${rule.description}`);
}

// Create sample rooms
const sampleRooms = [
  {
    name: "Sala 1 - Atendimento Individual",
    description: "Sala confortável e privativa para atendimentos individuais",
    capacity: 2,
    equipment: JSON.stringify(["Divã", "Mesa", "Cadeiras", "Ar condicionado"]),
    features: JSON.stringify(["Silenciosa", "Iluminação natural", "Privativa"]),
    pricePerHour: 8000, // R$ 80,00
    pricePerHalfDay: 30000, // R$ 300,00
    pricePerDay: 50000, // R$ 500,00
    availableMonday: true,
    availableTuesday: true,
    availableWednesday: true,
    availableThursday: true,
    availableFriday: true,
    availableSaturday: false,
    availableSunday: false,
    openTime: "08:00",
    closeTime: "18:00",
    isActive: true,
  },
  {
    name: "Sala 2 - Atendimento em Grupo",
    description: "Sala ampla ideal para terapias em grupo ou workshops",
    capacity: 8,
    equipment: JSON.stringify(["Cadeiras", "Projetor", "Whiteboard", "Ar condicionado", "Som"]),
    features: JSON.stringify(["Ampla", "Equipada", "Versátil"]),
    pricePerHour: 12000, // R$ 120,00
    pricePerHalfDay: 45000, // R$ 450,00
    pricePerDay: 80000, // R$ 800,00
    availableMonday: true,
    availableTuesday: true,
    availableWednesday: true,
    availableThursday: true,
    availableFriday: true,
    availableSaturday: true,
    availableSunday: false,
    openTime: "08:00",
    closeTime: "20:00",
    isActive: true,
  },
  {
    name: "Sala 3 - Consultório Premium",
    description: "Consultório premium com acabamento diferenciado",
    capacity: 3,
    equipment: JSON.stringify(["Divã premium", "Mesa executiva", "Poltronas", "Ar condicionado", "Frigobar"]),
    features: JSON.stringify(["Premium", "Silenciosa", "Vista panorâmica"]),
    pricePerHour: 15000, // R$ 150,00
    pricePerHalfDay: 55000, // R$ 550,00
    pricePerDay: 100000, // R$ 1.000,00
    availableMonday: true,
    availableTuesday: true,
    availableWednesday: true,
    availableThursday: true,
    availableFriday: true,
    availableSaturday: false,
    availableSunday: false,
    openTime: "08:00",
    closeTime: "18:00",
    isActive: true,
  },
];

for (const room of sampleRooms) {
  await db.insert(schema.rooms).values(room);
  console.log(`✓ Created room: ${room.name}`);
}

// Create system settings
const settings = [
  {
    key: "clinic_name",
    value: "On Life Clínica",
    description: "Nome da clínica",
  },
  {
    key: "clinic_email",
    value: "contato@onlife.com.br",
    description: "Email de contato da clínica",
  },
  {
    key: "clinic_phone",
    value: "(11) 9999-9999",
    description: "Telefone de contato da clínica",
  },
];

for (const setting of settings) {
  await db.insert(schema.settings).values(setting);
  console.log(`✓ Created setting: ${setting.key}`);
}

console.log("\n✅ Database seeded successfully!");

await connection.end();
