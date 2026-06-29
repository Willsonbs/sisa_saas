import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [tenants] = await conn.execute('SELECT * FROM tenants LIMIT 10');
const [users] = await conn.execute(`SELECT id, name, email, role, tenantId, specialty, professionalRegistry, registryType, phone FROM users LIMIT 30`);
const [rooms] = await conn.execute('SELECT id, tenantId, name, description, capacity, pricePerHour, isActive, openTime, closeTime FROM rooms LIMIT 30');
const [plans] = await conn.execute('SELECT id, name, description, priceMonthly, priceYearly, maxRooms, maxProfessionals, features, isActive FROM plans');
const [credits] = await conn.execute('SELECT id, professionalId, tenantId, amount, type, balanceAfter, description FROM credits LIMIT 30');
const [cancRules] = await conn.execute('SELECT id, tenantId, hoursBeforeBooking, refundPercentage, description, isActive FROM cancellationRules LIMIT 10');
const [subscriptions] = await conn.execute('SELECT id, tenantId, planId, status FROM subscriptions LIMIT 10');

console.log(JSON.stringify({ tenants, users, rooms, plans, credits, cancRules, subscriptions }, null, 2));
await conn.end();
