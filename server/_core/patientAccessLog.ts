/**
 * Helper para registrar acesso a dados sensíveis de pacientes (LGPD).
 * Toda visualização, edição ou exportação de dados de paciente deve ser registrada.
 */
import { getDb } from "../db";
import { patientAccessLogs } from "../../drizzle/schema";

export type PatientAccessAction = "view" | "edit" | "export";

export interface LogPatientAccessParams {
  tenantId: number;
  userId: number;
  userEmail?: string | null;
  bookingId: number;
  action: PatientAccessAction;
  context?: string;
  ipAddress?: string;
}

/**
 * Registra um acesso a dados sensíveis de paciente.
 * Falha silenciosamente para não bloquear o fluxo principal.
 */
export async function logPatientAccess(params: LogPatientAccessParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(patientAccessLogs).values({
      tenantId: params.tenantId,
      userId: params.userId,
      userEmail: params.userEmail ?? undefined,
      bookingId: params.bookingId,
      action: params.action,
      context: params.context ?? undefined,
      ipAddress: params.ipAddress ?? undefined,
    });
  } catch {
    // Log silencioso — não deve bloquear o fluxo principal
    console.warn("[PatientAccessLog] Failed to log patient access:", params.bookingId);
  }
}

/**
 * Extrai o IP do request Express.
 */
export function getClientIp(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string | undefined {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip?.trim();
  }
  return req.ip;
}
