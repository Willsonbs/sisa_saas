import { createNotification } from "./db";

/**
 * Email notification service
 * Sends emails and creates in-app notifications
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  userId: number;
  type: "booking_confirmation" | "booking_reminder" | "booking_cancelled" | "payment_success" | "payment_failed" | "credit_added" | "general";
  bookingId?: number;
  paymentId?: number;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Create in-app notification
    await createNotification({
      userId: options.userId,
      type: options.type,
      title: options.subject,
      message: stripHtml(options.html),
      sentViaEmail: true,
      sentViaApp: true,
      bookingId: options.bookingId,
      paymentId: options.paymentId,
    });

    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // For now, we just log and create in-app notification
    console.log(`[Email] Would send to ${options.to}: ${options.subject}`);
    
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Email templates

export function getBookingConfirmationEmail(data: {
  professionalName: string;
  roomName: string;
  startTime: Date;
  endTime: Date;
  patientName: string;
  totalPrice: number;
}) {
  const startFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(data.startTime);
  
  const endFormatted = new Intl.DateTimeFormat('pt-BR', {
    timeStyle: 'short',
  }).format(data.endTime);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Reserva Confirmada</h2>
      <p>Olá ${data.professionalName},</p>
      <p>Sua reserva foi confirmada com sucesso!</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Sala:</strong> ${data.roomName}</p>
        <p><strong>Paciente:</strong> ${data.patientName}</p>
        <p><strong>Data/Hora:</strong> ${startFormatted} até ${endFormatted}</p>
        <p><strong>Valor:</strong> R$ ${(data.totalPrice / 100).toFixed(2)}</p>
      </div>
      
      <p>Lembramos que você pode cancelar sua reserva com reembolso de créditos seguindo nossas políticas de cancelamento.</p>
      
      <p>Atenciosamente,<br>Equipe On Life</p>
    </div>
  `;
}

export function getBookingReminderEmail(data: {
  professionalName: string;
  roomName: string;
  startTime: Date;
  patientName: string;
}) {
  const startFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(data.startTime);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Lembrete de Reserva</h2>
      <p>Olá ${data.professionalName},</p>
      <p>Este é um lembrete de sua reserva agendada para breve:</p>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Sala:</strong> ${data.roomName}</p>
        <p><strong>Paciente:</strong> ${data.patientName}</p>
        <p><strong>Data/Hora:</strong> ${startFormatted}</p>
      </div>
      
      <p>Nos vemos em breve!</p>
      
      <p>Atenciosamente,<br>Equipe On Life</p>
    </div>
  `;
}

export function getCancellationEmail(data: {
  professionalName: string;
  roomName: string;
  startTime: Date;
  refundAmount: number;
}) {
  const startFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(data.startTime);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Reserva Cancelada</h2>
      <p>Olá ${data.professionalName},</p>
      <p>Sua reserva foi cancelada:</p>
      
      <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Sala:</strong> ${data.roomName}</p>
        <p><strong>Data/Hora:</strong> ${startFormatted}</p>
        <p><strong>Créditos reembolsados:</strong> R$ ${(data.refundAmount / 100).toFixed(2)}</p>
      </div>
      
      <p>Os créditos foram devolvidos à sua conta e já estão disponíveis para uso.</p>
      
      <p>Atenciosamente,<br>Equipe On Life</p>
    </div>
  `;
}

export function getPaymentSuccessEmail(data: {
  professionalName: string;
  amount: number;
  creditsAdded: number;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Pagamento Confirmado</h2>
      <p>Olá ${data.professionalName},</p>
      <p>Seu pagamento foi processado com sucesso!</p>
      
      <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Valor pago:</strong> R$ ${(data.amount / 100).toFixed(2)}</p>
        <p><strong>Créditos adicionados:</strong> R$ ${(data.creditsAdded / 100).toFixed(2)}</p>
      </div>
      
      <p>Seus créditos já estão disponíveis para uso. Você pode fazer novas reservas a qualquer momento.</p>
      
      <p>Atenciosamente,<br>Equipe On Life</p>
    </div>
  `;
}
