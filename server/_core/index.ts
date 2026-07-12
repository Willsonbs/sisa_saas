import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startReminderInterval } from "../reminderService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Configure cookie parser
  app.use(cookieParser());

  // ⚠️ STRIPE WEBHOOK must come BEFORE express.json() to receive raw body for signature verification
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !sig) {
      res.status(400).send('Missing webhook secret or signature');
      return;
    }

    try {
      const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!));
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const { professionalId, packageId, credits, tenantId, bookingId, paymentRecordId, type: paymentType } = session.metadata || {};

        const db = await import('../db');
        const profId = parseInt(professionalId, 10);
        const tenId = parseInt(tenantId || '1', 10);
        // SECURITY/FINANCEIRO: paymentRecordId identifica o registro de pagamento exato
        // criado no momento do checkout. Sem ele, um update por "professionalId + status
        // pending" confirmaria QUALQUER outro pagamento pendente do mesmo profissional
        // (ex: duas compras simultâneas), mesmo que não tenha sido pago.
        const paymentRecId = paymentRecordId ? parseInt(paymentRecordId, 10) : undefined;
        const { payments: paymentsTable, bookings: bookingsTable } = await import('../../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const dbConn = await db.getDb();

        if (!dbConn || !profId) {
          res.json({ received: true });
          return;
        }

        // Idempotency check
        const paymentIntentId = session.payment_intent || session.id;
        const existingPaid = await dbConn.select()
          .from(paymentsTable)
          .where(and(
            eq(paymentsTable.professionalId, profId),
            eq(paymentsTable.status, 'paid'),
            eq(paymentsTable.stripePaymentIntentId, paymentIntentId)
          ))
          .limit(1);

        if (existingPaid.length > 0) {
          console.log(`[Stripe] Already processed session ${session.id}, skipping`);
          res.json({ received: true });
          return;
        }

        // Condição de atualização do registro de pagamento: usa o ID exato quando
        // disponível (fluxo atual, que sempre envia paymentRecordId); mantém o filtro
        // por professionalId+pending como fallback só para sessões antigas sem esse
        // metadata.
        const paymentUpdateWhere = paymentRecId !== undefined && !Number.isNaN(paymentRecId)
          ? and(eq(paymentsTable.id, paymentRecId), eq(paymentsTable.professionalId, profId))
          : and(eq(paymentsTable.professionalId, profId), eq(paymentsTable.status, 'pending'));

        if (paymentType === 'booking_payment' && bookingId) {
          // Direct booking payment: confirm the booking
          const bookId = parseInt(bookingId, 10);
          await dbConn.update(bookingsTable)
            .set({ status: 'confirmed' })
            .where(eq(bookingsTable.id, bookId));

          await dbConn.update(paymentsTable)
            .set({ status: 'paid', stripePaymentIntentId: paymentIntentId })
            .where(paymentUpdateWhere);

          console.log(`[Stripe] Booking ${bookId} confirmed via direct payment for professional ${profId}`);
        } else if (credits) {
          // Credit package purchase
          const creditsNum = parseInt(credits, 10);
          const currentBalance = await db.getCreditBalance(profId);

          await db.addCredit({
            professionalId: profId,
            tenantId: tenId,
            amount: creditsNum,
            type: 'purchase',
            description: packageId === 'custom' ? 'Compra de créditos avulsos via Stripe' : `Compra de pacote via Stripe: ${packageId || 'N/A'}`,
            balanceAfter: currentBalance + creditsNum,
          });

          await dbConn.update(paymentsTable)
            .set({ status: 'paid', stripePaymentIntentId: paymentIntentId })
            .where(paymentUpdateWhere);

          console.log(`[Stripe] Credits added: ${creditsNum} to professional ${profId}`);
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('[Stripe] Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  // Configure body parser with larger size limit for file uploads (AFTER webhook route)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Start reminder service
  startReminderInterval();
}

startServer().catch(console.error);
