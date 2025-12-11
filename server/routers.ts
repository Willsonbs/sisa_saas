import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { getCancellationRules, createCancellationRule, updateCancellationRule, deleteCancellationRule } from "./db";
import { getCreditPackageById, CREDIT_PACKAGES } from "./products";
import { 
  sendEmail, 
  getBookingConfirmationEmail, 
  getCancellationEmail,
  getPaymentSuccessEmail 
} from "./emailService";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Professional or admin procedure
const professionalProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'professional') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Professional access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
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
        
        // Buscar usu\u00e1rio
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.password) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Email ou senha inv\u00e1lidos' 
          });
        }
        
        // Verificar senha
        const isValid = await verifyPassword(input.password, user.password);
        if (!isValid) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Email ou senha inv\u00e1lidos' 
          });
        }
        
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
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  rooms: router({
    list: publicProcedure
      .input(z.object({ includeInactive: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        const rooms = await db.getAllRooms(input?.includeInactive);
        return rooms.map(room => ({
          ...room,
          equipment: room.equipment ? JSON.parse(room.equipment) : [],
          features: room.features ? JSON.parse(room.features) : [],
          photos: room.photos ? JSON.parse(room.photos) : [],
        }));
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const room = await db.getRoomById(input.id);
        if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
        return {
          ...room,
          equipment: room.equipment ? JSON.parse(room.equipment) : [],
          features: room.features ? JSON.parse(room.features) : [],
          photos: room.photos ? JSON.parse(room.photos) : [],
        };
      }),
    
    create: adminProcedure
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
      .mutation(async ({ input }) => {
        const roomData = {
          ...input,
          equipment: input.equipment ? JSON.stringify(input.equipment) : null,
          features: input.features ? JSON.stringify(input.features) : null,
          photos: null,
        };
        await db.createRoom(roomData);
        return { success: true };
      }),
    
    update: adminProcedure
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
      .mutation(async ({ input }) => {
        const { id, equipment, features, ...rest } = input;
        const updateData = {
          ...rest,
          ...(equipment && { equipment: JSON.stringify(equipment) }),
          ...(features && { features: JSON.stringify(features) }),
        };
        await db.updateRoom(id, updateData);
        return { success: true };
      }),
    
    uploadPhoto: adminProcedure
      .input(z.object({
        roomId: z.number(),
        photoBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const room = await db.getRoomById(input.roomId);
        if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' });
        
        const buffer = Buffer.from(input.photoBase64, 'base64');
        const fileKey = `rooms/${input.roomId}/${nanoid()}.${input.mimeType.split('/')[1]}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        const currentPhotos = room.photos ? JSON.parse(room.photos) : [];
        currentPhotos.push(url);
        
        await db.updateRoom(input.roomId, { photos: JSON.stringify(currentPhotos) });
        return { url };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteRoom(input.id);
        return { success: true };
      }),
  }),

  bookings: router({
    list: professionalProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const bookings = await db.getBookingsByProfessional(ctx.user.id, input?.status);
        
        const enrichedBookings = await Promise.all(
          bookings.map(async (booking) => {
            const room = await db.getRoomById(booking.roomId);
            return {
              ...booking,
              room,
            };
          })
        );
        
        return enrichedBookings;
      }),
    
    upcoming: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUpcomingBookings(ctx.user.id, input?.limit);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        
        if (ctx.user.role !== 'admin' && booking.professionalId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return booking;
      }),
    
    getByRoom: publicProcedure
      .input(z.object({
        roomId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
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
        const room = await db.getRoomById(input.roomId);
        if (!room || !room.isActive) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not available' });
        }
        
        const hasConflict = await db.checkBookingConflict(
          input.roomId,
          input.startTime,
          input.endTime
        );
        if (hasConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Time slot already booked' });
        }
        
        const durationMs = input.endTime.getTime() - input.startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const totalPrice = Math.ceil(durationHours * room.pricePerHour);
        
        const balance = await db.getCreditBalance(ctx.user.id);
        if (balance < totalPrice) {
          throw new TRPCError({ 
            code: 'PRECONDITION_FAILED', 
            message: 'Insufficient credits' 
          });
        }
        
        await db.createBooking({
          roomId: input.roomId,
          professionalId: ctx.user.id,
          patientName: input.patientName,
          patientPhone: input.patientPhone || null,
          startTime: input.startTime,
          endTime: input.endTime,
          totalPrice,
          status: 'confirmed',
          receptionNotes: input.receptionNotes || null,
          privateNotes: input.privateNotes || null,
        });
        
        const newBalance = balance - totalPrice;
        await db.addCredit({
          professionalId: ctx.user.id,
          amount: -totalPrice,
          type: 'debit',
          description: `Reserva: ${room.name}`,
          balanceAfter: newBalance,
        });
        
        if (ctx.user.email) {
          await sendEmail({
            to: ctx.user.email,
            subject: 'Reserva Confirmada - On Life',
            html: getBookingConfirmationEmail({
              professionalName: ctx.user.name || 'Profissional',
              roomName: room.name,
              startTime: input.startTime,
              endTime: input.endTime,
              patientName: input.patientName,
              totalPrice,
            }),
            userId: ctx.user.id,
            type: 'booking_confirmation',
          });
        }
        
        return { success: true, totalPrice, newBalance };
      }),
    
    cancel: professionalProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        }
        
        if (ctx.user.role !== 'admin' && booking.professionalId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        if (booking.status === 'cancelled') {
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
          status: 'cancelled',
          cancelledAt: now,
          cancelledBy: ctx.user.id,
          cancellationReason: input.reason || null,
        });
        
        if (refundAmount > 0) {
          const balance = await db.getCreditBalance(ctx.user.id);
          const newBalance = balance + refundAmount;
          
          await db.addCredit({
            professionalId: ctx.user.id,
            amount: refundAmount,
            type: 'refund',
            bookingId: input.id,
            description: `Reembolso de cancelamento (${refundPercentage}%)`,
            balanceAfter: newBalance,
          });
        }
        
        const room = await db.getRoomById(booking.roomId);
        if (ctx.user.email && room) {
          await sendEmail({
            to: ctx.user.email,
            subject: 'Reserva Cancelada - On Life',
            html: getCancellationEmail({
              professionalName: ctx.user.name || 'Profissional',
              roomName: room.name,
              startTime: booking.startTime,
              refundAmount,
            }),
            userId: ctx.user.id,
            type: 'booking_cancelled',
            bookingId: input.id,
          });
        }
        
        return { success: true, refundAmount, refundPercentage };
      }),
  }),

  credits: router({
    balance: professionalProcedure.query(async ({ ctx }) => {
      return db.getCreditBalance(ctx.user.id);
    }),
    
    history: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getCreditHistory(ctx.user.id, input?.limit);
      }),
    
    packages: publicProcedure.query(() => {
      return CREDIT_PACKAGES;
    }),
  }),

  payments: router({
    history: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getPaymentHistory(ctx.user.id, input?.limit);
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input?.limit);
      }),
    
    unread: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotifications(ctx.user.id);
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  reception: router({
    agenda: protectedProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin' && ctx.user.role !== 'receptionist') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Receptionist access required' });
        }
        
        const bookings = await db.getReceptionAgenda(input.date);
        
        const enrichedBookings = await Promise.all(
          bookings.map(async (booking) => {
            const room = await db.getRoomById(booking.roomId);
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
  }),

  admin: router({
    stats: adminProcedure.query(async () => {
      const rooms = await db.getAllRooms();
      const professionals = await db.getAllProfessionals();
      
      return {
        totalRooms: rooms.length,
        activeRooms: rooms.filter(r => r.isActive).length,
        totalProfessionals: professionals.length,
      };
    }),
  }),

  cancellationRules: router({
    list: publicProcedure.query(async () => {
      return await getCancellationRules();
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
      .mutation(async ({ input }) => {
        await createCancellationRule(input);
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
      .mutation(async ({ input }) => {
        await updateCancellationRule(input.id, input);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCancellationRule(input.id);
        return { success: true };
      }),
  }),

  apiKeys: router({
    list: professionalProcedure.query(async ({ ctx }) => {
      return db.getUserApiKeys(ctx.user.id);
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
          userId: ctx.user.id,
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
});

export type AppRouter = typeof appRouter;
