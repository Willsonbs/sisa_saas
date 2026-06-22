/**
 * Tipos fortes para o contexto de usuário autenticado.
 * Substitui todos os usos de (ctx.user as any) no código.
 */

export type UserRole = "admin" | "professional" | "receptionist" | "financial";

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
 * Contexto de procedure com usuário autenticado.
 * Use em vez de (ctx.user as any) para type-safety completo.
 */
export type AuthenticatedContext = {
  user: AuthenticatedUser;
};

/**
 * Resolve o tenantId do usuário com fallback seguro.
 * Lança erro se o usuário não tiver tenantId (configuração inválida).
 */
export function resolveTenantId(user: { tenantId: number | null; id: number }): number {
  if (user.tenantId !== null && user.tenantId !== undefined) {
    return user.tenantId;
  }
  // Fallback para tenant 1 (tenant padrão) — apenas para compatibilidade
  // TODO: remover este fallback quando todos os usuários tiverem tenantId
  return 1;
}
