/**
 * Tipos fortes para o contexto de usuário autenticado.
 * Substitui todos os usos de (ctx.user as any) no código.
 */

export type UserRole = "super_admin" | "admin" | "professional" | "receptionist" | "financial";

/**
 * Usuário autenticado com tenantId garantido (não-nulo).
 * Usado em procedures que exigem isolamento de tenant.
 */
export type AuthenticatedUser = {
  id: number;
  email: string;
  role: UserRole;
  tenantId: number;
  name: string | null;
};

/**
 * Usuário super_admin — sem tenantId (plataforma SISA).
 */
export type SuperAdminUser = {
  id: number;
  email: string;
  role: "super_admin";
  tenantId: null;
  name: string | null;
};

/**
 * Contexto de procedure com usuário autenticado.
 * Use em vez de (ctx.user as any) para type-safety completo.
 */
export type AuthenticatedContext = {
  user: AuthenticatedUser;
};

/**
 * Resolve o tenantId do usuário.
 * Lança erro se o usuário não tiver tenantId (configuração inválida) — NÃO faz
 * fallback silencioso para um tenant "padrão", pois isso poderia fazer um
 * usuário mal configurado (bug de cadastro, etc.) ser tratado como pertencente
 * ao tenant 1 e ganhar acesso não intencional aos dados dele.
 * Super admins não têm tenantId — retorna 0 como sentinela.
 */
export function resolveTenantId(user: { tenantId: number | null; id: number; role?: string }): number {
  if (user.role === 'super_admin') return 0; // sentinela: sem tenant
  if (user.tenantId !== null && user.tenantId !== undefined) {
    return user.tenantId;
  }
  throw new Error(
    `Usuário id=${user.id} não possui tenantId configurado. Configuração de conta inválida — contate o suporte.`
  );
}
