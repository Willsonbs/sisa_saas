/**
 * Reminder Service
 * Sends booking reminders 24h and 2h before the booking start time.
 * Called periodically via the /api/cron/reminders endpoint or internal interval.
 */

import * as db from "./db";

/**
 * Send reminders for bookings starting in the next window.
 * This should be called every ~30 minutes by a cron job or internal interval.
 */
export async function sendBookingReminders(): Promise<{
  sent24h: number;
  sent2h: number;
  errors: number;
}> {
  const now = new Date();
  let sent24h = 0;
  let sent2h = 0;
  let errors = 0;

  try {
    // Get all confirmed bookings in the next 26 hours (to catch 24h window)
    const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);
    const upcoming = await db.getBookingsNeedingReminders(now, windowEnd);

    for (const booking of upcoming) {
      const startTime = new Date(booking.startTime);
      const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      try {
        // 24h reminder: between 23.5h and 24.5h before start
        if (hoursUntilStart >= 23.5 && hoursUntilStart <= 24.5) {
          const alreadySent = await db.hasNotificationBeenSent(booking.id, "booking_reminder_24h");
          if (!alreadySent) {
            await db.createNotification({
              userId: booking.professionalId,
              tenantId: booking.tenantId,
              type: "booking_reminder_24h",
              title: "Lembrete: Reserva amanhã",
              message: `Você tem uma reserva amanhã às ${startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
              bookingId: booking.id,
            });
            sent24h++;
          }
        }

        // 2h reminder: between 1.5h and 2.5h before start
        if (hoursUntilStart >= 1.5 && hoursUntilStart <= 2.5) {
          const alreadySent = await db.hasNotificationBeenSent(booking.id, "booking_reminder_2h");
          if (!alreadySent) {
            await db.createNotification({
              userId: booking.professionalId,
              tenantId: booking.tenantId,
              type: "booking_reminder_2h",
              title: "Lembrete: Reserva em 2 horas",
              message: `Sua reserva começa em 2 horas (${startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}).`,
              bookingId: booking.id,
            });
            sent2h++;
          }
        }
      } catch (err) {
        console.error(`[Reminders] Error processing booking ${booking.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[Reminders] Fatal error:", err);
    errors++;
  }

  console.log(`[Reminders] Sent: 24h=${sent24h}, 2h=${sent2h}, errors=${errors}`);
  return { sent24h, sent2h, errors };
}

/**
 * Start a background interval to send reminders every 30 minutes.
 * Safe to call on server startup.
 */
export function startReminderInterval(): void {
  // Run immediately on startup (after a short delay to let server initialize)
  setTimeout(async () => {
    console.log("[Reminders] Running initial reminder check...");
    await sendBookingReminders();
  }, 10_000); // 10 seconds after startup

  // Then run every 30 minutes
  setInterval(async () => {
    await sendBookingReminders();
  }, 30 * 60 * 1000);

  console.log("[Reminders] Reminder service started (interval: 30 minutes)");
}
