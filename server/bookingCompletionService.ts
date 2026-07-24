/**
 * Booking Completion Service
 * Marca reservas confirmadas como concluídas automaticamente assim que o
 * horário reservado termina, sem precisar de ação manual do admin.
 */

import * as db from "./db";

export async function completeExpiredBookings(): Promise<{ completed: number; errors: number }> {
  let completed = 0;
  let errors = 0;

  try {
    const expired = await db.getConfirmedBookingsPastEndTime(new Date());

    for (const booking of expired) {
      try {
        await db.updateBooking(booking.id, {
          status: "completed",
          completedAt: new Date(),
        });
        completed++;
      } catch (err) {
        console.error(`[BookingCompletion] Error completing booking ${booking.id}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[BookingCompletion] Fatal error:", err);
    errors++;
  }

  console.log(`[BookingCompletion] Completed: ${completed}, errors=${errors}`);
  return { completed, errors };
}

/**
 * Start a background interval to auto-complete expired bookings every 5 minutes.
 * Safe to call on server startup.
 */
export function startBookingCompletionInterval(): void {
  setTimeout(async () => {
    console.log("[BookingCompletion] Running initial completion check...");
    await completeExpiredBookings();
  }, 10_000);

  setInterval(async () => {
    await completeExpiredBookings();
  }, 5 * 60 * 1000);

  console.log("[BookingCompletion] Booking completion service started (interval: 5 minutes)");
}
