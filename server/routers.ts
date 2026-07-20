import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { getCancellationRules, createCancellationRule, updateCancellationRule, deleteCancellationRule } from "./db";
import { getCreditPackageById, CREDIT_PACKAGES, buildCustomCreditPackage, MIN_CUSTOM_CREDIT_AMOUNT_CENTS } from "./products";
import { 
  sendEmail, 
  getBookingConfirmationEmail, 
  getCancellationEmail,
  getPaymentSuccessEmail 
} from "./emailService";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { encrypt, decrypt } from "./_core/encryption";
import { logPatientAccess, getClientIp } from "./_core/patientAccessLog";
import { superAdminRouter } from "./routers/superAdmin";

// Receptionist procedure (admin or receptionist)
const receptionistProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.role !== 'admin' && ctx.auth.role !== 'receptionist') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Receptionist access required' });
  }
  return next({ ctx });
});

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Gerenciamento de profissionais: admin sempre tem acesso; recepcionista/financeiro
// só quando a permissão "Ver Profissionais" estiver habilitada para o usuário
// (dono da empresa pode delegar o cadastro de novos profissionais à recepção).
const professionalsManageProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isAdmin = ctx.auth.role === 'admin';
  const isPermittedStaff = (ctx.auth.role === 'receptionist' || ctx.auth.role === 'financial')
    && !!ctx.user?.permCanViewProfessionals;
  if (!isAdmin && !isPermittedStaff) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para gerenciar profissionais.' });
  }
  return next({ ctx });
});

// Gerenciamento de salas: admin sempre tem acesso; recepcionista/financeiro
// só quando a permissão "Ver Salas" estiver habilitada para o usuário (mesma
// tela e funções do administrador: criar, editar, inativar/excluir salas).
const roomsManageProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isAdmin = ctx.auth.role === 'admin';
  const isPermittedStaff = (ctx.auth.role === 'receptionist' || ctx.auth.role === 'financial')
    && !!ctx.user?.permCanViewRooms;
  if (!isAdmin && !isPermittedStaff) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para gerenciar salas.' });
  }
  return next({ ctx });
});

// Dias da semana na mesma ordem de Date.getDay() (0=domingo .. 6=sábado),
// mapeados para as colunas booleanas de disponibilidade da sala.
const WEEKDAY_AVAILABILITY_FIELDS = [
  'availableSunday', 'availableMonday', 'availableTuesday', 'availableWednesday',
  'availableThursday', 'availableFriday', 'availableSaturday',
] as const;

// Valida se a sala está configurada como disponível no dia da semana e dentro
// do horário de funcionamento (openTime/closeTime) do horário solicitado.
// Enforçado no backend (não só na UI) para que ninguém consiga criar reserva
// fora do funcionamento configurado da sala, mesmo chamando a API diretamente.
function assertRoomOpenForSlot(room: any, startTime: Date, endTime: Date) {
  const dow = startTime.getDay();
  const field = WEEKDAY_AVAILABILITY_FIELDS[dow];
  if (room[field] === false) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta sala não está disponível neste dia da semana.' });
  }

  const parseMinutes = (t?: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const openMins = parseMinutes(room.openTime);
  const closeMins = parseMinutes(room.closeTime);
  const startMins = startTime.getHours() * 60 + startTime.getMinutes();
  const endMins = endTime.getHours() * 60 + endTime.getMinutes();
  if ((openMins != null && startMins < openMins) || (closeMins != null && endMins > closeMins)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este horário está fora do funcionamento da sala.' });
  }
}

// Staff procedure (admin, receptionist, financial, super_admin)
const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ['admin', 'super_admin', 'receptionist', 'financial'];
  if (!allowed.includes(ctx.auth.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a staff interno.' });
  }
  return next({ ctx });
});

// Professional or admin procedure
const professionalProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.role !== 'admin' && ctx.auth.role !== 'professional') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Professional access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  superAdmin: superAdminRouter,
  
  auth: router({
    me: publicProcedure.query(opts => {
      const user = opts.ctx.user;
      if (!user) return null;
      // SECURITY: nunca expor hash de senha ao frontend
      const { password, passwordHash, cpf, cnpj, ...safeUser } = user as any;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie('auth_token', { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(z.object({
        name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
        email: z.string().email("Email inv\u00e1lido"),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        phone: z.string().min(10, "Telefone inv\u00e1lido"),
        professionalRegistry: z.string().min(3, "Registro profissional obrigat\u00f3rio"),
        registryType: z.enum(["CRP", "CRM", "CRO", "CREFITO", "COREN", "Outro"]),
        cpf: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { hashPassword } = await import('./auth');
        
        // Verificar se email j\u00e1 existe
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ 
            code: 'CONFLICT', 
            message: 'Este email j\u00e1 est\u00e1 cadastrado' 
          });
        }
        
        // Hash da senha
        const hashedPassword = await hashPassword(input.password);
        
        // Criar usu\u00e1rio
        await db.createProfessional({
          email: input.email,
          password: hashedPassword,
          name: input.name,
          phone: input.phone,
          professionalRegistry: input.professionalRegistry,
          registryType: input.registryType,
          cpf: input.cpf,
          role: 'professional',
          loginMethod: 'password',
        });
        
        return { 
          success: true,
          message: 'Cadastro realizado! Fa\u00e7a login para acessar o sistema.'
        };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email("Email inv\u00e1lido"),
        password: z.string().min(1, "Senha obrigat\u00f3ria"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { verifyPassword, generateToken } = await import('./auth');
        const { getSessionCookieOptions } = await import('./_core/cookies');
        const { checkLoginRateLimit, registerFailedLogin, clearLoginRateLimit } = await import('./_core/loginRateLimit');

        const clientIp = getClientIp(ctx.req);

        // SECURITY: bloqueia força bruta de senha por email+IP
        const blockedForSeconds = checkLoginRateLimit(input.email, clientIp);
        if (blockedForSeconds !== null) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Muitas tentativas de login. Tente novamente em ${Math.ceil(blockedForSeconds / 60)} minuto(s).`,
          });
        }

        // Buscar usuário
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          registerFailedLogin(input.email, clientIp);
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Email ou senha inválidos' 
          });
        }
        
        // Usuários internos (receptionist, financial) usam passwordHash
        // Profissionais/admins criados via cadastro usam password
        const hashToVerify = user.passwordHash ?? user.password;
        if (!hashToVerify) {
          registerFailedLogin(input.email, clientIp);
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Email ou senha inválidos' 
          });
        }
        
        // Verificar senha (bcrypt funciona para ambos os campos)
        const isValid = await verifyPassword(input.password, hashToVerify);
        if (!isValid) {
          registerFailedLogin(input.email, clientIp);
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Email ou senha inválidos' 
          });
        }

        clearLoginRateLimit(input.email, clientIp);
        
        // Gerar token JWT
        const token = await generateToken(user.id, user.email, user.role);
        
        // Definir cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie('auth_token', token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });
        
        return { 
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        };
      }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        professionalRegistry: z.string().optional(),
        registryType: z.string().optional(),
        cpf: z.string().optional(),
        address: z.string().optional(),
        specialty: z.string().optional(),
        bio: z.string().optional(),
        publicProfileSlug: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.publicProfileSlug) {
          const existing = await db.getUserBySlug(input.publicProfileSlug);
          if (existing && existing.id !== ctx.auth.id) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Este slug já está em uso por outro profissional.' });
          }
        }
        await db.updateUserProfile(ctx.auth.id, input);
        return { success: true };
      }),
    checkSlug: protectedProcedure
      .input(z.object({ slug: z.string().min(3) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserBySlug(input.slug);
        const available = !existing || existing.id === ctx.auth.id;
        return { available };
      }),
  }),

  rooms: router({
    list: protectedProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }).optional())
      .query(async ({ ctx, input }) => {
        // SECURITY: filtrar salas pelo tenant do usuário logado
        const rooms = await db.getAllRooms(input?.includeInactive, ctx.auth.tenantId);
        return rooms.map(room => ({
          ...room,
          equipment: room.equipment ? JSON.parse(room.equipment) : [],
          features: room.features ? JSON.parse(room.features) : [],
          photos: room.photos ? JSON.parse(room.photos) : [],
        }));
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        // Isolamento de tenant: só retorna a sala se pertencer ao tenant do usuário logado
        const room = await db.getRoomById(input.id, ctx.auth.tenantId);
        if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
        return {
          ...room,
          equipment: room.equipment ? JSON.parse(room.equipment) : [],
          features: room.features ? JSON.parse(room.features) : [],
          photos: room.photos ? JSON.parse(room.photos) : [],
        };
      }),
    
    create: roomsManageProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        capacity: z.number().default(1),
        equipment: z.array(z.string()).optional(),
        features: z.array(z.string()).optional(),
        pricePerHour: z.number(),
        pricePerHalfDay: z.number().optional(),
        pricePerDay: z.number().optional(),
        availableMonday: z.boolean().default(true),
        availableTuesday: z.boolean().default(true),
        availableWednesday: z.boolean().default(true),
        availableThursday: z.boolean().default(true),
        availableFriday: z.boolean().default(true),
        availableSaturday: z.boolean().default(false),
        availableSunday: z.boolean().default(false),
        openTime: z.string().default("08:00"),
        closeTime: z.string().default("18:00"),
      }))
      .mutation(async ({ ctx, input }) => {
        const roomData = {
          ...input,
          tenantId: ctx.auth.tenantId,
          equipment: input.equipment ? JSON.stringify(input.equipment) : null,
          features: input.features ? JSON.stringify(input.features) : null,
          photos: null,
        };
        await db.createRoom(roomData);
        return { success: true };
      }),
    
    update: roomsManageProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        capacity: z.number().optional(),
        equipment: z.array(z.string()).optional(),
        features: z.array(z.string()).optional(),
        pricePerHour: z.number().optional(),
        pricePerHalfDay: z.number().optional(),
        pricePerDay: z.number().optional(),
        availableMonday: z.boolean().optional(),
        availableTuesday: z.boolean().optional(),
        availableWednesday: z.boolean().optional(),
        availableThursday: z.boolean().optional(),
        availableFriday: z.boolean().optional(),
        availableSaturday: z.boolean().optional(),
        availableSunday: z.boolean().optional(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, equipment, features, ...rest } = input;
        const updateData = {
          ...rest,
          ...(equipment && { equipment: JSON.stringify(equipment) }),
          ...(features && { features: JSON.stringify(features) }),
        };
        // SECURITY: garante que a sala pertence ao tenant do admin antes de alterar
        const existingRoom = await db.getRoomById(id, ctx.auth.tenantId);
        if (!existingRoom) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
        await db.updateRoom(id, updateData, ctx.auth.tenantId);
        return { success: true };
      }),
    
    uploadPhoto: adminProcedure
      .input(z.object({
        roomId: z.number(),
        photoBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const room = await db.getRoomById(input.roomId, ctx.auth.tenantId);
        if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
        
        const buffer = Buffer.from(input.photoBase64, 'base64');
        const fileKey = `rooms/${input.roomId}/${nanoid()}.${input.mimeType.split('/')[1]}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        const currentPhotos = room.photos ? JSON.parse(room.photos) : [];
        currentPhotos.push(url);
        
        await db.updateRoom(input.roomId, { photos: JSON.stringify(currentPhotos) }, ctx.auth.tenantId);
        return { url };
      }),
    
    delete: roomsManageProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // SECURITY: garante que a sala pertence ao tenant do admin antes de desativar
        const existingRoom = await db.getRoomById(input.id, ctx.auth.tenantId);
        if (!existingRoom) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
        await db.deleteRoom(input.id, ctx.auth.tenantId);
        return { success: true };
      }),

    deleteHard: roomsManageProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        // SECURITY: garante que a sala pertence ao tenant do admin antes de excluir definitivamente
        const existingRoom = await db.getRoomById(input.id, ctx.auth.tenantId);
        if (!existingRoom) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
        const { rooms: roomsTable, bookings: bookingsTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const existing = await dbConn.select({ id: bookingsTable.id }).from(bookingsTable).where(eq(bookingsTable.roomId, input.id)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Não é possível excluir: sala possui reservas registradas. Use "Inativar" para desabilitá-la.' });
        await dbConn.delete(roomsTable).where(eq(roomsTable.id, input.id));
        return { success: true };
      }),

    // Disponibilidade pública das salas — sem dados sensíveis (RF04)
    availability: protectedProcedure
      .input(z.object({
        date: z.date(),
        tenantId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const tenantId = input.tenantId ?? ctx.auth.tenantId;
        const startOfDay = new Date(input.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(input.date);
        endOfDay.setHours(23, 59, 59, 999);

        const rooms = await db.getAllRooms(false, tenantId);
        const allBookings = await db.getBookingsByTenant(tenantId, startOfDay, endOfDay);
        const allBlocks = await db.getAllRoomBlocksByTenant(tenantId, startOfDay, endOfDay);

        // Retorna apenas dados não-sensíveis: sala, horário, tipo de ocupação
        // professionalId é incluído para que o frontend distinga "minha reserva" vs "ocupado por outro"
        const occupiedSlots = (allBookings || []).filter((b: any) =>
          !['cancelled', 'canceled_with_credit', 'no_show'].includes(b.status)
        ).map((b: any) => ({
          roomId: b.roomId,
          startTime: b.startTime,
          endTime: b.endTime,
          professionalId: b.professionalId,
          type: 'booking' as const,
        }));

        const blockedSlots = (allBlocks || []).map((bl: any) => ({
          roomId: bl.roomId,
          startTime: bl.startTime,
          endTime: bl.endTime,
          type: bl.blockType === 'maintenance' ? 'maintenance' as const : 'admin_block' as const,
          reason: bl.reason ?? undefined,
        }));

        return {
          rooms: rooms.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            capacity: r.capacity,
            pricePerHour: r.pricePerHour,
            equipment: r.equipment ? JSON.parse(r.equipment) : [],
            photos: r.photos ? JSON.parse(r.photos) : [],
            openTime: r.openTime ?? '07:00',
            closeTime: r.closeTime ?? '21:00',
            // Disponibilidade por dia da semana (config em Gerenciar Salas) —
            // antes não era enviada ao frontend, então a UI mostrava a sala
            // como disponível mesmo em dias desmarcados (ex: sábado/domingo).
            availableMonday: r.availableMonday,
            availableTuesday: r.availableTuesday,
            availableWednesday: r.availableWednesday,
            availableThursday: r.availableThursday,
            availableFriday: r.availableFriday,
            availableSaturday: r.availableSaturday,
            availableSunday: r.availableSunday,
          })),
          occupiedSlots,
          blockedSlots,
        };
      }),
  }),

  bookings: router({
    list: professionalProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const bookings = await db.getBookingsByProfessional(ctx.auth.id, input?.status);
        
        const enrichedBookings = await Promise.all(
          bookings.map(async (booking) => {
            const room = await db.getRoomById(booking.roomId, ctx.auth.tenantId);
            return {
              ...booking,
              // Descriptografa dados sensíveis (LGPD)
              patientName: decrypt(booking.patientName) ?? booking.patientName,
              patientPhone: decrypt(booking.patientPhone),
              privateNotes: decrypt(booking.privateNotes),
              room,
            };
          })
        );
        
        return enrichedBookings;
      }),
    
    upcoming: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUpcomingBookings(ctx.auth.id, input?.limit);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id, ctx.auth.tenantId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        
        if (ctx.auth.role !== 'admin' && booking.professionalId !== ctx.auth.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        // Log de acesso LGPD: registra quem visualizou dados do paciente
        void logPatientAccess({
          tenantId: ctx.auth.tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          bookingId: booking.id,
          action: 'view',
          context: 'getById',
          ipAddress: getClientIp(ctx.req),
        });
        
        // Descriptografa dados sensíveis antes de retornar
        return {
          ...booking,
          patientName: decrypt(booking.patientName) ?? booking.patientName,
          patientPhone: decrypt(booking.patientPhone),
          privateNotes: decrypt(booking.privateNotes),
        };
      }),
    
    getByRoom: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        // SECURITY: verifica que a sala pertence ao tenant do usuário antes de retornar reservas
        const room = await db.getRoomById(input.roomId, ctx.auth.tenantId);
        if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sala não encontrada' });
        return db.getBookingsByRoom(input.roomId, input.startDate, input.endDate);
      }),
    
    create: professionalProcedure
      .input(z.object({
        roomId: z.number(),
        patientName: z.string(),
        patientPhone: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        receptionNotes: z.string().optional(),
        privateNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Rejeita reservas no passado
        if (input.startTime <= new Date()) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Não é possível reservar em data ou horário no passado.',
          });
        }

        const room = await db.getRoomById(input.roomId, ctx.auth.tenantId);
        if (!room || !room.isActive) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not available' });
        }
        assertRoomOpenForSlot(room, input.startTime, input.endTime);

        const hasConflict = await db.checkBookingConflict(
          input.roomId,
          input.startTime,
          input.endTime
        );
        if (hasConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário disponível.' });
        }
        
        const durationMs = input.endTime.getTime() - input.startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const totalPrice = Math.ceil(durationHours * room.pricePerHour);
        
        const balance = await db.getCreditBalance(ctx.auth.id);
        if (balance < totalPrice) {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'Insufficient credits' 
          });
        }
        
        const tenantId = room.tenantId || 1;
        
        // Check room block conflicts
        const hasBlockConflict = await db.checkRoomBlockConflict(
          input.roomId,
          input.startTime,
          input.endTime
        );
        if (hasBlockConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Esta sala está bloqueada neste horário (manutenção ou bloqueio pelo gestor). Escolha outro horário.' });
        }
        
        // Calculate buffer times
        const bufferStartTime = new Date(input.startTime.getTime() - (room.bufferBefore || 0) * 60000);
        const bufferEndTime = new Date(input.endTime.getTime() + (room.bufferAfter || 0) * 60000);
        
        // Criptografa dados sensíveis antes de persistir (LGPD)
        await db.createBooking({
          roomId: input.roomId,
          tenantId,
          professionalId: ctx.auth.id,
          patientName: encrypt(input.patientName) ?? input.patientName,
          patientPhone: encrypt(input.patientPhone || null),
          startTime: input.startTime,
          endTime: input.endTime,
          bufferStartTime,
          bufferEndTime,
          totalPrice,
          status: 'confirmed',
          receptionNotes: input.receptionNotes || null,
          privateNotes: encrypt(input.privateNotes || null),
        });
        
        const newBalance = balance - totalPrice;
        await db.addCredit({
          professionalId: ctx.auth.id,
          tenantId,
          amount: -totalPrice,
          type: 'debit',
          description: `Reserva: ${room.name}`,
          balanceAfter: newBalance,
        });
        
        if (ctx.auth.email) {
          await sendEmail({
            to: ctx.auth.email,
            subject: 'Reserva Confirmada - On Life',
            html: getBookingConfirmationEmail({
              professionalName: ctx.auth.name || 'Profissional',
              roomName: room.name,
              startTime: input.startTime,
              endTime: input.endTime,
              patientName: input.patientName,
              totalPrice,
            }),
            userId: ctx.auth.id,
            type: 'booking_confirmation',
          });
        }
        
        return { success: true, totalPrice, newBalance };
      }),

    // Create booking and pay directly via Stripe (no credits needed)
    createWithPayment: professionalProcedure
      .input(z.object({
        roomId: z.number(),
        patientName: z.string(),
        patientPhone: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
        receptionNotes: z.string().optional(),
        privateNotes: z.string().optional(),
        paymentMethod: z.enum(['card', 'pix']).optional().default('card'),
      }))
      .mutation(async ({ ctx, input }) => {
        // Rejeita reservas no passado
        if (input.startTime <= new Date()) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Não é possível reservar em data ou horário no passado.',
          });
        }

        const room = await db.getRoomById(input.roomId, ctx.auth.tenantId);
        if (!room || !room.isActive) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not available' });
        }
        assertRoomOpenForSlot(room, input.startTime, input.endTime);

        const hasConflict = await db.checkBookingConflict(input.roomId, input.startTime, input.endTime);
        if (hasConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário disponível.' });
        }

        const hasBlockConflict = await db.checkRoomBlockConflict(input.roomId, input.startTime, input.endTime);
        if (hasBlockConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Esta sala está bloqueada neste horário (manutenção ou bloqueio pelo gestor). Escolha outro horário.' });
        }

        const durationMs = input.endTime.getTime() - input.startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const totalPrice = Math.ceil(durationHours * room.pricePerHour);
        const tenantId = room.tenantId || 1;

        const bufferStartTime = new Date(input.startTime.getTime() - (room.bufferBefore || 0) * 60000);
        const bufferEndTime = new Date(input.endTime.getTime() + (room.bufferAfter || 0) * 60000);

        // Create booking with 'pending_payment' status
        // SECURITY/LGPD: criptografa dados sensíveis do paciente, igual ao fluxo
        // de reserva por créditos (bookings.create) — antes ficavam em texto puro
        // apenas neste fluxo de pagamento via Stripe.
        const bookingResult = await db.createBooking({
          roomId: input.roomId,
          tenantId,
          professionalId: ctx.auth.id,
          patientName: encrypt(input.patientName) ?? input.patientName,
          patientPhone: encrypt(input.patientPhone || null),
          startTime: input.startTime,
          endTime: input.endTime,
          bufferStartTime,
          bufferEndTime,
          totalPrice,
          status: 'pending_payment',
          receptionNotes: input.receptionNotes || null,
          privateNotes: encrypt(input.privateNotes || null),
        });

        const bookingId = (bookingResult as any)?.insertId;

        // Create payment record
        const paymentResult = await db.createPayment({
          professionalId: ctx.auth.id,
          tenantId,
          amount: totalPrice,
          method: 'credit_card',
          status: 'pending',
          metadata: JSON.stringify({ bookingId, type: 'booking_payment' }),
        });

        const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!));
        const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
        const paymentMethods: ('card' | 'pix')[] = input.paymentMethod === 'pix' ? ['pix'] : ['card'];

        const createSession = async (methods: ('card' | 'pix')[]) =>
          stripe.checkout.sessions.create({
            payment_method_types: methods,
            line_items: [{
              price_data: {
                currency: 'brl',
                product_data: {
                  name: `Reserva: ${room.name}`,
                  description: `${input.startTime.toLocaleDateString('pt-BR')} ${input.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${input.endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                },
                unit_amount: totalPrice,
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${appUrl}/bookings?payment=success`,
            cancel_url: `${appUrl}/rooms/${input.roomId}/book?payment=cancelled`,
            metadata: {
              professionalId: ctx.auth.id.toString(),
              tenantId: tenantId.toString(),
              bookingId: bookingId?.toString() || '',
              paymentRecordId: (paymentResult as any)?.insertId?.toString() || '',
              type: 'booking_payment',
            },
          });

        let session;
        try {
          session = await createSession(paymentMethods);
        } catch (err: any) {
          if (input.paymentMethod === 'pix' && err?.message?.includes('payment_method_types')) {
            session = await createSession(['card']);
          } else {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Erro ao criar checkout' });
          }
        }

        return { url: session.url, sessionId: session.id, bookingId, totalPrice };
      }),

    cancel: professionalProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id, ctx.auth.tenantId);
        if (!booking) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        }
        
        if (ctx.auth.role !== 'admin' && booking.professionalId !== ctx.auth.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        if (booking.status === 'canceled_with_credit') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already cancelled' });
        }
        
        const now = new Date();
        const hoursUntilBooking = (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        const rules = await db.getActiveCancellationRules();
        let refundPercentage = 0;
        
        for (const rule of rules) {
          if (hoursUntilBooking >= rule.hoursBeforeBooking) {
            refundPercentage = rule.refundPercentage;
            break;
          }
        }
        
        const refundAmount = Math.floor(booking.totalPrice * (refundPercentage / 100));
        
        await db.updateBooking(input.id, {
          status: 'canceled_with_credit',
          cancelledAt: now,
          cancelledBy: ctx.auth.id,
          cancellationReason: input.reason || null,
        });
        
        if (refundAmount > 0) {
          // SECURITY/FINANCEIRO: o reembolso deve ir para o dono original da reserva
          // (booking.professionalId), não para quem executou o cancelamento
          // (ctx.auth.id) — um admin/recepcionista pode cancelar em nome de outro
          // profissional, e o crédito não pode parar na conta de quem cancelou.
          const balance = await db.getCreditBalance(booking.professionalId);
          const newBalance = balance + refundAmount;
          
          await db.addCredit({
            professionalId: booking.professionalId,
            tenantId: booking.tenantId || 1,
            amount: refundAmount,
            type: 'refund',
            bookingId: input.id,
            description: `Reembolso de cancelamento (${refundPercentage}%)`,
            balanceAfter: newBalance,
          });
        }
        
        const room = await db.getRoomById(booking.roomId, ctx.auth.tenantId);
        if (ctx.auth.email && room) {
          await sendEmail({
            to: ctx.auth.email,
            subject: 'Reserva Cancelada - On Life',
            html: getCancellationEmail({
              professionalName: ctx.auth.name || 'Profissional',
              roomName: room.name,
              startTime: booking.startTime,
              refundAmount,
            }),
            userId: ctx.auth.id,
            type: 'booking_cancelled',
            bookingId: input.id,
          });
        }
        
        return { success: true, refundAmount, refundPercentage };
      }),
  }),

  credits: router({
    balance: professionalProcedure.query(async ({ ctx }) => {
      const tenantId = ctx.auth.tenantId;
      return db.getCreditBalance(ctx.auth.id, tenantId);
    }),
    
    history: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        return db.getCreditHistory(ctx.auth.id, input?.limit, tenantId);
      }),
    
    packages: publicProcedure.query(() => {
      return CREDIT_PACKAGES;
    }),
    
    // Admin: manually add credits to a professional
    addManual: adminProcedure
      .input(z.object({
        professionalId: z.number(),
        amount: z.number().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        // SECURITY: garante que o profissional pertence a este tenant antes de creditar
        const dbConnCheck = await db.getDb();
        if (!dbConnCheck) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { professionalTenants } = await import('../drizzle/schema');
        const { eq: eqOp, and: andOp } = await import('drizzle-orm');
        const link = await dbConnCheck.select({ id: professionalTenants.id })
          .from(professionalTenants)
          .where(andOp(eqOp(professionalTenants.professionalId, input.professionalId), eqOp(professionalTenants.tenantId, tenantId)))
          .limit(1);
        if (link.length === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'Profissional não pertence a este tenant.' });
        const balance = await db.getCreditBalance(input.professionalId, tenantId);
        const newBalance = balance + input.amount;
        
        await db.addCredit({
          professionalId: input.professionalId,
          tenantId,
          amount: input.amount,
          type: 'bonus',
          description: input.description || 'Crédito manual adicionado pelo administrador',
          balanceAfter: newBalance,
        });
        
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'credit.manual_add',
          entityType: 'credit',
          entityId: input.professionalId,
          after: JSON.stringify({ amount: input.amount, description: input.description }),
        });
        
        // Notify professional
        await db.createNotification({
          userId: input.professionalId,
          tenantId,
          type: 'credit_added',
          title: 'Créditos adicionados',
          message: `${(input.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em créditos foram adicionados à sua conta.`,
        });
        
        return { success: true, newBalance };
      }),
    
    // Get balance for a specific professional (admin only)
    getBalanceByProfessional: adminProcedure
      .input(z.object({ professionalId: z.number() }))
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        // SECURITY: garante que o profissional pertence a este tenant antes de expor o saldo
        const dbConnCheck = await db.getDb();
        if (!dbConnCheck) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { professionalTenants } = await import('../drizzle/schema');
        const { eq: eqOp, and: andOp } = await import('drizzle-orm');
        const link = await dbConnCheck.select({ id: professionalTenants.id })
          .from(professionalTenants)
          .where(andOp(eqOp(professionalTenants.professionalId, input.professionalId), eqOp(professionalTenants.tenantId, tenantId)))
          .limit(1);
        if (link.length === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'Profissional não pertence a este tenant.' });
        return db.getCreditBalance(input.professionalId, tenantId);
      }),
  }),

  payments: router({
    history: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getPaymentHistory(ctx.auth.id, input?.limit, ctx.auth.tenantId);
      }),
    
    // Create Stripe checkout session for credit purchase
    createCheckout: professionalProcedure
      .input(z.object({
        packageId: z.string().optional(),
        // Valor avulso em centavos (ex: R$ 55,45 = 5545). Mínimo de R$ 50,00.
        customAmountCents: z.number().int().min(MIN_CUSTOM_CREDIT_AMOUNT_CENTS).optional(),
        paymentMethod: z.enum(['card', 'pix']).optional().default('card'),
      }).refine(data => !!data.packageId !== !!data.customAmountCents, {
        message: 'Informe um pacote OU um valor avulso, não os dois.',
      }))
      .mutation(async ({ ctx, input }) => {
        const pkg = input.customAmountCents !== undefined
          ? buildCustomCreditPackage(input.customAmountCents)
          : getCreditPackageById(input.packageId!);
        if (!pkg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pacote não encontrado' });
        
        const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!));
        const tenantId = ctx.auth.tenantId;
        
        // Create payment record first
        const paymentResult = await db.createPayment({
          professionalId: ctx.auth.id,
          tenantId,
          amount: pkg.price,
          method: 'credit_card',
          status: 'pending',
          metadata: JSON.stringify({ packageId: pkg.id, credits: pkg.credits }),
        });
        
        const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
        const paymentMethods: ('card' | 'boleto' | 'pix')[] = input.paymentMethod === 'pix' ? ['pix'] : ['card'];

        // PIX requires a Stripe account with Brazilian payment methods enabled.
        // If PIX is requested but not available, fall back to card.
        const createStripeSession = async (methods: ('card' | 'boleto' | 'pix')[]) => {
          return stripe.checkout.sessions.create({
            payment_method_types: methods,
            line_items: [{
              price_data: {
                currency: 'brl',
                product_data: {
                  name: pkg.name,
                  description: pkg.description,
                },
                unit_amount: pkg.price,
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${appUrl}/credits?payment=success`,
            cancel_url: `${appUrl}/credits?payment=cancelled`,
            metadata: {
              professionalId: ctx.auth.id.toString(),
              tenantId: tenantId.toString(),
              packageId: pkg.id,
              credits: pkg.credits.toString(),
              paymentRecordId: (paymentResult as any)?.insertId?.toString() || '',
            },
          });
        };

        let session;
        try {
          session = await createStripeSession(paymentMethods);
        } catch (err: any) {
          // PIX may not be available on this Stripe account - fall back to card
          if (input.paymentMethod === 'pix' && err?.message?.includes('payment_method_types')) {
            console.warn('[Stripe] PIX not available, falling back to card:', err.message);
            session = await createStripeSession(['card']);
          } else {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Erro ao criar checkout' });
          }
        }

        // Update payment record with Stripe session ID for tracking
        const insertResult = paymentResult as any;
        if (insertResult?.insertId) {
          await db.updatePayment(insertResult.insertId, {
            stripePaymentIntentId: session.id, // store session ID for now, will be updated with payment_intent on webhook
          });
        }
        
        return { url: session.url, sessionId: session.id };
      }),
    
    // Admin: list all payments for the tenant
    listByTenant: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        const db2 = await import('./db').then(m => m.getDb());
        if (!db2) return [];
        const { payments: paymentsTable } = await import('../drizzle/schema');
        const { eq, desc } = await import('drizzle-orm');
        return db2.select().from(paymentsTable)
          .where(eq(paymentsTable.tenantId, tenantId))
          .orderBy(desc(paymentsTable.createdAt))
          .limit(input?.limit || 50);
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.auth.id, input?.limit);
      }),
    
    unread: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotifications(ctx.auth.id);
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: só marca como lida se a notificação pertencer ao usuário logado
        await db.markNotificationAsRead(input.id, ctx.auth.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.auth.id);
      return { success: true };
    }),
  }),

  reception: router({
    agenda: protectedProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ ctx, input }) => {
        if (ctx.auth.role !== 'admin' && ctx.auth.role !== 'receptionist') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Receptionist access required' });
        }
        
        const bookingsList = await db.getReceptionAgenda(input.date);
        
        const enrichedBookings = await Promise.all(
          bookingsList.map(async (booking) => {
            const room = await db.getRoomById(booking.roomId, ctx.auth.tenantId);
            const professional = await db.getUserById(booking.professionalId);
            
            return {
              id: booking.id,
              roomName: room?.name || 'Unknown',
              professionalName: professional?.name || 'Unknown',
              patientName: booking.patientName,
              startTime: booking.startTime,
              endTime: booking.endTime,
              receptionNotes: booking.receptionNotes,
              status: booking.status,
            };
          })
        );
        
        return enrichedBookings;
      }),

    todayBookings: receptionistProcedure
      .input(z.object({
        search: z.string().optional(),
        date: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId!;
        const dateStr = input.date ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
        const startOfDay = new Date(`${dateStr}T00:00:00-03:00`).getTime();
        const endOfDay   = new Date(`${dateStr}T23:59:59-03:00`).getTime();
        const rawBookings = await db.getReceptionBookings(tenantId, startOfDay, endOfDay);
        const enriched = await Promise.all(rawBookings.map(async (b) => {
          const room = await db.getRoomById(b.roomId);
          const prof = await db.getUserById(b.professionalId);
          return {
            id: b.id,
            startTime: b.startTime instanceof Date ? b.startTime.getTime() : Number(b.startTime),
            endTime: b.endTime instanceof Date ? b.endTime.getTime() : Number(b.endTime),
            status: b.status as string,
            receptionNotes: b.receptionNotes as string | null,
            roomName: room?.name ?? '—',
            professionalId: b.professionalId,
            professionalName: prof?.name ?? '—',
            professionalSpecialty: prof?.specialty ?? null,
            patientName: decrypt(b.patientName) ?? b.patientName as string | null,
          };
        }));
        if (input.search) {
          const q = input.search.toLowerCase();
          return enriched.filter(b =>
            (b.professionalName ?? '').toLowerCase().includes(q) ||
            (b.roomName ?? '').toLowerCase().includes(q) ||
            (b.patientName ?? '').toLowerCase().includes(q)
          );
        }
        return enriched;
      }),

    // Lista enxuta de profissionais cadastrados no tenant, para autocomplete
    // de filtro no Painel de Recepção (não expõe email/CPF/telefone).
    professionals: receptionistProcedure.query(async ({ ctx }) => {
      return db.getProfessionalNamesByTenant(ctx.auth.tenantId!);
    }),
  }),

  admin: router({
    listUsers: professionalsManageProcedure.query(async ({ ctx }) => {
      return await db.getAllProfessionals(ctx.auth.tenantId);
    }),

    createProfessional: professionalsManageProcedure
      .input(z.object({
        name: z.string().min(2, 'Nome obrigatório'),
        email: z.string().email('E-mail inválido'),
        password: z.string().min(6, 'Senha mínima: 6 caracteres'),
        phone: z.string().optional(),
        specialty: z.string().optional(),
        registryType: z.string().optional(),
        professionalRegistry: z.string().optional(),
        bio: z.string().optional(),
        cpf: z.string().optional(),
        cnpj: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
        appointmentDurationMinutes: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { hashPassword } = await import('./auth');
        const existing = await db.getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Este e-mail já está cadastrado.' });
        const hashedPassword = await hashPassword(input.password);
        const { password, ...rest } = input;
        const newUser = await db.createProfessional({
          ...rest,
          password: hashedPassword,
          role: 'professional',
          loginMethod: 'password',
        });
        // Link professional to this tenant
        const dbConn = await db.getDb();
        if (dbConn && newUser?.id) {
          const { professionalTenants } = await import('../drizzle/schema');
          await dbConn.insert(professionalTenants).values({
            professionalId: newUser.id,
            tenantId: ctx.auth.tenantId,
            status: 'approved',
            approvedBy: ctx.auth.id,
            approvedAt: new Date(),
          });
        }
        return { success: true };
      }),
    stats: adminProcedure.query(async ({ ctx }) => {
      // SECURITY: escopar estatísticas ao tenant do admin logado
      const tenantId = ctx.auth.tenantId;
      const rooms = await db.getAllRooms(true, tenantId);
      const professionals = await db.getAllProfessionals(tenantId);
      const bookingStats = await db.getDashboardBookingStats(tenantId);
      return {
        totalRooms: rooms.length,
        activeRooms: rooms.filter(r => r.isActive).length,
        totalProfessionals: professionals.length,
        bookingsToday: bookingStats.bookingsToday,
        revenueThisMonth: bookingStats.revenueThisMonth,
      };
    }),

    listAllBookings: staffProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional(), roomId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

        const { bookings: bookingsTable, users, rooms: roomsTable } = await import('../drizzle/schema');
        const { eq, and, gte, lte, sql } = await import('drizzle-orm');

        // Construir condições de filtro
        const conditions: any[] = [eq(bookingsTable.tenantId, tenantId)];
        if (input?.startDate) conditions.push(sql`${bookingsTable.startTime} >= ${input.startDate}`);
        if (input?.endDate) conditions.push(sql`${bookingsTable.startTime} <= ${input.endDate}`);
        if (input?.roomId) conditions.push(eq(bookingsTable.roomId, input.roomId));

        // JOIN único — sem N+1
        const rows = await dbConn
          .select({
            id: bookingsTable.id,
            tenantId: bookingsTable.tenantId,
            professionalId: bookingsTable.professionalId,
            roomId: bookingsTable.roomId,
            startTime: bookingsTable.startTime,
            endTime: bookingsTable.endTime,
            status: bookingsTable.status,
            patientName: bookingsTable.patientName,
            patientPhone: bookingsTable.patientPhone,
            privateNotes: bookingsTable.privateNotes,
            totalPrice: bookingsTable.totalPrice,
            createdAt: bookingsTable.createdAt,
            professionalName: users.name,
            roomName: roomsTable.name,
          })
          .from(bookingsTable)
          .leftJoin(users, eq(bookingsTable.professionalId, users.id))
          .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
          .where(and(...conditions));

        // SECURITY/LGPD: o papel "financial" só precisa de dados de cobrança
        // (valor, sala, profissional, status) — não de identidade do paciente
        // nem de notas clínicas privadas. Minimiza exposição por princípio de
        // necessidade (LGPD), sem tirar acesso de quem realmente precisa
        // (admin, super_admin, receptionist).
        const isFinancialOnly = ctx.auth.role === 'financial';
        return rows.map((b: any) => ({
          ...b,
          patientName: isFinancialOnly ? '(dado restrito)' : (decrypt(b.patientName) ?? b.patientName),
          patientPhone: isFinancialOnly ? null : decrypt(b.patientPhone),
          privateNotes: isFinancialOnly ? null : decrypt(b.privateNotes),
          professionalName: b.professionalName || `Profissional #${b.professionalId}`,
          roomName: b.roomName || `Sala #${b.roomId}`,
        }));
      }),

    updateProfessional: professionalsManageProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        specialty: z.string().optional(),
        professionalRegistry: z.string().optional(),
        registryType: z.string().optional(),
        bio: z.string().optional(),
        cpf: z.string().optional(),
        cnpj: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        address: z.string().optional(),
        publicProfileSlug: z.string().optional(),
        appointmentDurationMinutes: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        // Verify professional belongs to this tenant (multi-tenant isolation)
        const { users, professionalTenants } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        const link = await dbConn.select({ id: professionalTenants.id })
          .from(professionalTenants)
          .where(and(eq(professionalTenants.professionalId, id), eq(professionalTenants.tenantId, ctx.auth.tenantId)))
          .limit(1);
        if (link.length === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'Profissional não pertence a este tenant.' });
        await dbConn.update(users).set(data as any).where(eq(users.id, id));
        return { success: true };
      }),

    deleteProfessional: professionalsManageProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { users, bookings: bookingsTable, credits: creditsTable, professionalTenants } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        // SECURITY: garante que o profissional pertence a este tenant (mesma checagem de updateProfessional)
        const link = await dbConn.select({ id: professionalTenants.id })
          .from(professionalTenants)
          .where(and(eq(professionalTenants.professionalId, input.id), eq(professionalTenants.tenantId, ctx.auth.tenantId)))
          .limit(1);
        if (link.length === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'Profissional não pertence a este tenant.' });
        const existing = await dbConn.select({ id: bookingsTable.id }).from(bookingsTable).where(eq(bookingsTable.professionalId, input.id)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Não é possível excluir: profissional possui reservas registradas.' });
        await dbConn.delete(creditsTable).where(eq(creditsTable.professionalId, input.id));
        await dbConn.delete(users).where(eq(users.id, input.id));
        return { success: true };
      }),

    reportByRoom: adminProcedure
      .input(z.object({ roomId: z.number().optional(), startDate: z.date().optional(), endDate: z.date().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        // SECURITY: filtrar salas pelo tenant do admin
        const allRooms = await db.getAllRooms(false, tenantId);
        const allBookings = await db.getBookingsByTenant(tenantId, input?.startDate, input?.endDate);
        const rooms = input?.roomId ? allRooms.filter((r: any) => r.id === input.roomId) : allRooms;
        return Promise.all(rooms.map(async (room: any) => {
          const rb = allBookings.filter((b: any) => b.roomId === room.id && b.status === 'confirmed');
          const enriched = await Promise.all(rb.map(async (b: any) => {
            const prof = await db.getUserById(b.professionalId);
            return { ...b, professionalName: (prof as any)?.name || `Profissional #${b.professionalId}` };
          }));
          return { room, bookings: enriched, totalBookings: enriched.length, totalRevenue: enriched.reduce((s: number, b: any) => s + b.totalPrice, 0) };
        }));
      }),
  }),

  cancellationRules: router({
    // SECURITY: list filtrado pelo tenant do usuário logado (protectedProcedure)
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getCancellationRules(ctx.auth.tenantId);
    }),
    create: adminProcedure
      .input(
        z.object({
          hoursBeforeBooking: z.number().min(0),
          refundPercentage: z.number().min(0).max(100),
          description: z.string(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // SECURITY: vincular regra ao tenant do admin
        await createCancellationRule({ ...input, tenantId: ctx.auth.tenantId });
        return { success: true };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          hoursBeforeBooking: z.number().min(0).optional(),
          refundPercentage: z.number().min(0).max(100).optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // SECURITY: só atualiza regras do próprio tenant
        await updateCancellationRule(input.id, input, ctx.auth.tenantId);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: só deleta regras do próprio tenant
        await deleteCancellationRule(input.id, ctx.auth.tenantId);
        return { success: true };
      }),
  }),

  // ============= TENANT MANAGEMENT =============
  tenants: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = ctx.auth.tenantId;
      return db.getTenantById(tenantId);
    }),
    
    update: adminProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        cancellationWindowHours: z.number().min(0).max(168).optional(),
        lateArrivalToleranceMinutes: z.number().min(0).max(60).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        await db.updateTenant(tenantId, input);
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'tenant.update',
          entityType: 'tenant',
          entityId: tenantId,
          after: JSON.stringify(input),
        });
        return { success: true };
      }),
    
    professionals: adminProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        return db.getProfessionalsByTenant(tenantId, input?.status);
      }),
    
    approveProfessional: adminProcedure
      .input(z.object({ linkId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        await db.updateProfessionalTenantLink(input.linkId, {
          status: 'approved',
          approvedBy: ctx.auth.id,
          approvedAt: new Date(),
        });
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'professional.approve',
          entityType: 'professionalTenant',
          entityId: input.linkId,
        });
        return { success: true };
      }),
    
    blockProfessional: adminProcedure
      .input(z.object({ linkId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        await db.updateProfessionalTenantLink(input.linkId, {
          status: 'blocked',
          rejectionReason: input.reason || null,
        });
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'professional.block',
          entityType: 'professionalTenant',
          entityId: input.linkId,
          after: JSON.stringify({ reason: input.reason }),
        });
        return { success: true };
      }),
  }),

  // ============= ROOM BLOCKS =============
  roomBlocks: router({
    list: roomsManageProcedure
      .input(z.object({
        roomId: z.number().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        if (input.roomId) {
          return db.getRoomBlocks(input.roomId, input.startDate, input.endDate);
        }
        return db.getAllRoomBlocksByTenant(tenantId, input.startDate, input.endDate);
      }),
    
    create: roomsManageProcedure
      .input(z.object({
        roomId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
        reason: z.enum(['maintenance', 'manager_reserve', 'other']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        
        // Check for booking conflicts
        const hasConflict = await db.checkBookingConflict(input.roomId, input.startTime, input.endTime);
        if (hasConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Existe uma reserva confirmada neste período' });
        }
        
        await db.createRoomBlock({
          roomId: input.roomId,
          tenantId,
          startTime: input.startTime,
          endTime: input.endTime,
          reason: input.reason,
          notes: input.notes || null,
          createdBy: ctx.auth.id,
        });
        
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'room.block',
          entityType: 'room',
          entityId: input.roomId,
          after: JSON.stringify(input),
        });
        
        return { success: true };
      }),
    
    delete: roomsManageProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        await db.deleteRoomBlock(input.id);
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'room.unblock',
          entityType: 'roomBlock',
          entityId: input.id,
        });
        return { success: true };
      }),
  }),

  // ============= NO-SHOW MANAGEMENT =============
  noShow: router({
    register: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId, ctx.auth.tenantId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reserva não encontrada' });
        if (booking.status !== 'confirmed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas reservas confirmadas podem ser marcadas como no-show' });
        }
        
        const tenantId = ctx.auth.tenantId;
        const before = JSON.stringify({ status: booking.status });
        
        await db.updateBooking(input.bookingId, {
          status: 'no_show',
          noShowRegisteredAt: new Date(),
          noShowRegisteredBy: ctx.auth.id,
        });
        
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'booking.no_show',
          entityType: 'booking',
          entityId: input.bookingId,
          before,
          after: JSON.stringify({ status: 'no_show' }),
        });
        
        // Notify professional
        const professional = await db.getUserById(booking.professionalId);
        if (professional) {
          await db.createNotification({
            userId: professional.id,
            tenantId,
            type: 'noshow_registered',
            title: 'No-show registrado',
            message: `O paciente ${booking.patientName} não compareceu ao atendimento.`,
            bookingId: input.bookingId,
          });
        }
        
        return { success: true };
      }),
    
    complete: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId, ctx.auth.tenantId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reserva não encontrada' });
        if (booking.status !== 'confirmed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas reservas confirmadas podem ser completadas' });
        }
        
        await db.updateBooking(input.bookingId, {
          status: 'completed',
          completedAt: new Date(),
        });
        
        return { success: true };
      }),
  }),

  // ============= WAITLIST =============
  waitlist: router({
    list: professionalProcedure.query(async ({ ctx }) => {
      const tenantId = ctx.auth.tenantId;
      return db.getWaitlistByProfessional(ctx.auth.id, tenantId);
    }),
    
    add: publicProcedure
      .input(z.object({
        tenantId: z.number(),
        professionalId: z.number(),
        roomId: z.number().optional(),
        patientName: z.string().min(2),
        patientContact: z.string().min(5),
        contactType: z.enum(['email', 'phone', 'whatsapp']).default('email'),
        preferredDays: z.array(z.string()).optional(),
        preferredTimeStart: z.string().optional(),
        preferredTimeEnd: z.string().optional(),
        notes: z.string().optional(),
        // LGPD consent
        consentGiven: z.boolean(),
        consentText: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!input.consentGiven) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Consentimento LGPD obrigatório' });
        }
        
        // Create consent record
        const consentResult = await db.createConsentRecord({
          tenantId: input.tenantId,
          subjectName: input.patientName,
          subjectContact: input.patientContact,
          purpose: 'waitlist_contact',
          consentVersion: '1.0',
          consentText: input.consentText,
          consentGiven: true,
          ipAddress: ctx.req.ip || null,
          userAgent: ctx.req.headers['user-agent'] || null,
        });
        
        await db.createWaitlistEntry({
          tenantId: input.tenantId,
          professionalId: input.professionalId,
          roomId: input.roomId || null,
          patientName: input.patientName,
          patientContact: input.patientContact,
          contactType: input.contactType,
          preferredDays: input.preferredDays ? JSON.stringify(input.preferredDays) : null,
          preferredTimeStart: input.preferredTimeStart || null,
          preferredTimeEnd: input.preferredTimeEnd || null,
          notes: input.notes || null,
          status: 'waiting',
        });
        
        return { success: true };
      }),
    
    notify: professionalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: só atualiza entradas da lista de espera do próprio profissional
        await db.updateWaitlistEntry(input.id, { status: 'notified' }, ctx.auth.id);
        return { success: true };
      }),
    
    convert: professionalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: só converte entradas da lista de espera do próprio profissional
        await db.updateWaitlistEntry(input.id, { status: 'converted' }, ctx.auth.id);
        return { success: true };
      }),
  }),

  // ============= AUDIT LOGS =============
  audit: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        return db.getAuditLogs(tenantId, input?.limit || 100);
      }),
  }),

  // ============= PUBLIC PORTAL =============
  portal: router({
    getProfessionalBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const professional = await db.getUserBySlug(input.slug);
        if (!professional) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profissional não encontrado' });
        
        return {
          id: professional.id,
          name: professional.name,
          specialty: professional.specialty,
          registryType: professional.registryType,
          professionalRegistry: professional.professionalRegistry,
          bio: professional.bio,
          tenantId: professional.tenantId,
        };
      }),
    
    getAvailableSlots: publicProcedure
      .input(z.object({
        professionalId: z.number(),
        tenantId: z.number(),
        date: z.date(),
      }))
      .query(async ({ input }) => {
        const rooms = await db.getAllRooms(false, input.tenantId);
        const startOfDay = new Date(input.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(input.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const bookings = await db.getBookingsByTenant(input.tenantId, startOfDay, endOfDay);
        const blocks = await db.getAllRoomBlocksByTenant(input.tenantId, startOfDay, endOfDay);
        
        // Endpoint público: NUNCA expor nomes, notas ou dados sensíveis.
        // Retorna apenas os slots livres por sala (formato seguro para portal público).
        const OPEN_HOUR = 7;
        const CLOSE_HOUR = 21;
        const SLOT_MINUTES = 60;
        
        const safeRooms = rooms.map((room: any) => ({
          id: room.id,
          name: room.name,
          pricePerHour: room.pricePerHour,
          capacity: room.capacity,
        }));
        
        const availableSlots: Record<number, string[]> = {};
        for (const room of rooms) {
          const slots: string[] = [];
          for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
            const slotStart = new Date(input.date);
            slotStart.setHours(h, 0, 0, 0);
            const slotEnd = new Date(input.date);
            slotEnd.setHours(h + SLOT_MINUTES / 60, 0, 0, 0);
            
            const occupied = bookings.some((b: any) =>
              b.roomId === room.id &&
              b.status === 'confirmed' &&
              new Date(b.startTime) < slotEnd &&
              new Date(b.endTime) > slotStart
            );
            const blocked = blocks.some((bl: any) =>
              bl.roomId === room.id &&
              new Date(bl.startTime) < slotEnd &&
              new Date(bl.endTime) > slotStart
            );
            
            if (!occupied && !blocked) {
              slots.push(`${String(h).padStart(2, '0')}:00`);
            }
          }
          availableSlots[room.id] = slots;
        }
        
        return { rooms: safeRooms, availableSlots };
      }),
  }),

  // ============= APPOINTMENTS =============
  appointments: router({
    // Listar atendimentos de uma reserva
    listByBooking: professionalProcedure
      .input(z.object({ bookingId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verifica que a reserva pertence ao profissional (ou admin)
        const booking = await db.getBookingById(input.bookingId, ctx.auth.tenantId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reserva não encontrada' });
        if (ctx.auth.role !== 'admin' && booking.professionalId !== ctx.auth.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
        const appts = await db.getAppointmentsByBooking(input.bookingId);
        return appts.map(a => ({
          ...a,
          patientName: decrypt(a.patientName) ?? a.patientName,
          patientPhone: decrypt(a.patientPhone),
        }));
      }),

    // Criar atendimento dentro de uma reserva
    create: professionalProcedure
      .input(z.object({
        bookingId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
        patientName: z.string().optional(),
        patientPhone: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId, ctx.auth.tenantId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reserva não encontrada' });
        if (ctx.auth.role !== 'admin' && booking.professionalId !== ctx.auth.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
        // Validate times are within booking window
        if (input.startTime < booking.startTime || input.endTime > booking.endTime) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Atendimento fora do horário da reserva' });
        }
        await db.createAppointment({
          bookingId: input.bookingId,
          tenantId: ctx.auth.tenantId,
          professionalId: ctx.auth.id,
          startTime: input.startTime,
          endTime: input.endTime,
          patientName: input.patientName ? encrypt(input.patientName) : null,
          patientPhone: input.patientPhone ? encrypt(input.patientPhone) : null,
          notes: input.notes || null,
        });
        return { success: true };
      }),

    // Atualizar status/dados de um atendimento
    update: professionalProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
        patientName: z.string().optional(),
        patientPhone: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, patientName, patientPhone, ...rest } = input;
        await db.updateAppointment(id, {
          ...rest,
          patientName: patientName ? encrypt(patientName) : undefined,
          patientPhone: patientPhone ? encrypt(patientPhone) : undefined,
        });
        return { success: true };
      }),

    // Deletar atendimento
    delete: professionalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAppointment(input.id);
        return { success: true };
      }),

    // Gerar atendimentos automaticamente a partir da duração padrão do profissional
    generateFromBooking: professionalProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId, ctx.auth.tenantId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reserva não encontrada' });
        if (ctx.auth.role !== 'admin' && booking.professionalId !== ctx.auth.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
        const durationMinutes = await db.getProfessionalAppointmentDuration(ctx.auth.id);
        const totalMinutes = (booking.endTime.getTime() - booking.startTime.getTime()) / 60000;
        const slots = Math.floor(totalMinutes / durationMinutes);
        // Remove existing appointments first
        await db.deleteAppointmentsByBooking(input.bookingId);
        for (let i = 0; i < slots; i++) {
          const start = new Date(booking.startTime.getTime() + i * durationMinutes * 60000);
          const end = new Date(start.getTime() + durationMinutes * 60000);
          await db.createAppointment({
            bookingId: input.bookingId,
            tenantId: ctx.auth.tenantId,
            professionalId: ctx.auth.id,
            startTime: start,
            endTime: end,
          });
        }
        return { success: true, slots };
      }),
  }),

  // ============= BOOKING POLICY =============
  bookingPolicy: router({
    // Retorna a política atual do tenant
    get: protectedProcedure.query(async ({ ctx }) => {
      const tenant = await db.getTenantById(ctx.auth.tenantId);
      if (!tenant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Tenant não encontrado' });
      return {
        cancellationWindowMinutes: (tenant as any).cancellationWindowMinutes ?? tenant.cancellationWindowHours * 60,
        cancellationWindowHours: tenant.cancellationWindowHours,
        lateArrivalToleranceMinutes: tenant.lateArrivalToleranceMinutes,
      };
    }),

    // Atualiza a política do tenant (admin only)
    update: adminProcedure
      .input(z.object({
        cancellationWindowMinutes: z.number().min(0).max(10080).optional(), // max 7 days
        lateArrivalToleranceMinutes: z.number().min(0).max(120).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId;
        await db.updateTenant(tenantId, input as any);
        await db.createAuditLog({
          tenantId,
          userId: ctx.auth.id,
          userEmail: ctx.auth.email,
          action: 'tenant.policy_update',
          entityType: 'tenant',
          entityId: tenantId,
          after: JSON.stringify(input),
        });
        return { success: true };
      }),

    // Retorna a duração padrão de atendimento do profissional logado
    getMyAppointmentDuration: professionalProcedure.query(async ({ ctx }) => {
      const duration = await db.getProfessionalAppointmentDuration(ctx.auth.id);
      return { appointmentDurationMinutes: duration };
    }),

    // Atualiza a duração padrão de atendimento do profissional
    updateMyAppointmentDuration: professionalProcedure
      .input(z.object({ appointmentDurationMinutes: z.number().min(15).max(480) }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
        const { users: usersTable } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        await dbConn.update(usersTable).set({ appointmentDurationMinutes: input.appointmentDurationMinutes } as any).where(eq(usersTable.id, ctx.auth.id));
        return { success: true };
      }),
  }),

  apiKeys: router({
    list: professionalProcedure.query(async ({ ctx }) => {
      return db.getUserApiKeys(ctx.auth.id);
    }),
    
    create: professionalProcedure
      .input(z.object({
        name: z.string(),
        canReadBookings: z.boolean().default(true),
        canCreateBookings: z.boolean().default(true),
        canCancelBookings: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const key = `sk_${nanoid(32)}`;
        
        await db.createApiKey({
          userId: ctx.auth.id,
          name: input.name,
          key,
          canReadBookings: input.canReadBookings,
          canCreateBookings: input.canCreateBookings,
          canCancelBookings: input.canCancelBookings,
        });
        
        return { key };
      }),
    
    revoke: professionalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.revokeApiKey(input.id);
        return { success: true };
      }),
  }),

  // ── Staff / Internal Users (receptionist, financial) ──────────────────────
  staff: router({
    list: adminProcedure.query(async ({ ctx }) => {
      const tenantId = ctx.auth.tenantId!;
      const rows = await db.getStaffByTenant(tenantId);
      return rows.map((r) => ({
        id: r.id,
        name: r.name ?? '',
        email: r.email,
        role: r.role as string,
        createdAt: r.createdAt,
        permissions: {
          canViewBookings: Boolean(r.permCanViewBookings),
          canViewProfessionals: Boolean(r.permCanViewProfessionals),
          canViewRooms: Boolean(r.permCanViewRooms),
          canCheckIn: Boolean(r.permCanCheckIn),
        },
      }));
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['receptionist', 'financial']),
        permissions: z.object({
          canViewBookings: z.boolean().default(true),
          canViewProfessionals: z.boolean().default(true),
          canViewRooms: z.boolean().default(true),
          canCheckIn: z.boolean().default(true),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId!;
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(input.password, 10);
        const existing = await db.getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'E-mail já cadastrado' });
        await db.createStaffUser({
          name: input.name,
          email: input.email,
          passwordHash: hash,
          role: input.role,
          tenantId,
          permCanViewBookings: input.permissions.canViewBookings,
          permCanViewProfessionals: input.permissions.canViewProfessionals,
          permCanViewRooms: input.permissions.canViewRooms,
          permCanCheckIn: input.permissions.canCheckIn,
        });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        role: z.enum(['receptionist', 'financial']).optional(),
        isActive: z.boolean().optional(),
        permissions: z.object({
          canViewBookings: z.boolean(),
          canViewProfessionals: z.boolean(),
          canViewRooms: z.boolean(),
          canCheckIn: z.boolean(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId!;
        const updateData: Parameters<typeof db.updateStaffUser>[2] = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.role !== undefined) updateData.role = input.role;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        if (input.permissions) {
          updateData.permCanViewBookings = input.permissions.canViewBookings;
          updateData.permCanViewProfessionals = input.permissions.canViewProfessionals;
          updateData.permCanViewRooms = input.permissions.canViewRooms;
          updateData.permCanCheckIn = input.permissions.canCheckIn;
        }
        await db.updateStaffUser(input.id, tenantId, updateData);
        return { success: true };
      }),

    resetPassword: adminProcedure
      .input(z.object({ id: z.number(), newPassword: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId!;
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.hash(input.newPassword, 10);
        await db.updateStaffUser(input.id, tenantId, { passwordHash: hash });
        return { success: true };
      }),

    remove: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.auth.tenantId!;
        await db.deleteStaffUser(input.id, tenantId);
        return { success: true };
      }),
  }),

});

export type AppRouter = typeof appRouter;
