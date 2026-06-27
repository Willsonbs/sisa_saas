import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { resolveTenantId, type AuthenticatedUser } from "@shared/userContext";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware que garante usuário autenticado e injeta ctx.auth com tipos fortes.
 * ctx.auth.tenantId é sempre number (nunca null) — usa resolveTenantId() internamente.
 */
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  const auth: AuthenticatedUser = {
    id: ctx.user.id,
    email: ctx.user.email,
    role: ctx.user.role as AuthenticatedUser["role"],
    tenantId: resolveTenantId(ctx.user),
    name: ctx.user.name ?? null,
  };

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      auth, // ctx.auth é a forma tipada e segura de acessar o usuário
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    const auth: AuthenticatedUser = {
      id: ctx.user.id,
      email: ctx.user.email,
      role: ctx.user.role as AuthenticatedUser["role"],
      tenantId: resolveTenantId(ctx.user),
      name: ctx.user.name ?? null,
    };

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        auth,
      },
    });
  }),
);

/**
 * Procedure para staff interno (admin, receptionist, financial).
 * Permite acesso a dados do tenant sem permissões de admin completo.
 * Recepcionistas e financeiro têm acesso de leitura ao tenant deles.
 */
export const staffProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const staffRoles = ['admin', 'super_admin', 'receptionist', 'financial'];

    if (!ctx.user || !staffRoles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a staff interno." });
    }

    const auth: AuthenticatedUser = {
      id: ctx.user.id,
      email: ctx.user.email,
      role: ctx.user.role as AuthenticatedUser["role"],
      tenantId: resolveTenantId(ctx.user),
      name: ctx.user.name ?? null,
    };

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        auth,
      },
    });
  }),
);

/**
 * Procedure exclusiva para SUPER_ADMIN (proprietário da plataforma SISA).
 * Não exige tenantId — opera em escopo global.
 */
export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'super_admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo ao proprietário da plataforma SISA." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        auth: {
          id: ctx.user.id,
          email: ctx.user.email,
          role: 'super_admin' as const,
          tenantId: 0,
          name: ctx.user.name ?? null,
        },
      },
    });
  }),
);
