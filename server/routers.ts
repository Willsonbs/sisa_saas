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
        specialty: z.string().optional(),
        bio: z.string().optional(),
        publicProfileSlug: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.publicProfileSlug) {
          const existing = await db.getUserBySlug(input.publicProfileSlug);
          if (existing && existing.id !== ctx.user.id) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Este slug já está em uso por outro profissional.' });
          }
        }
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    checkSlug: protectedProcedure
      .input(z.object({ slug: z.string().min(3) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserBySlug(input.slug);
        const available = !existing || existing.id === ctx.user.id;
        return { available };
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
      .mutation(async ({ ctx, input }) => {
        const roomData = {
          ...input,
          tenantId: (ctx.user as any).tenantId || 1,
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
        
        const tenantId = room.tenantId || 1;
        
        // Check room block conflicts
        const hasBlockConflict = await db.checkRoomBlockConflict(
          input.roomId,
          input.startTime,
          input.endTime
        );
        if (hasBlockConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Room is blocked during this time' });
        }
        
        // Calculate buffer times
        const bufferStartTime = new Date(input.startTime.getTime() - (room.bufferBefore || 0) * 60000);
        const bufferEndTime = new Date(input.endTime.getTime() + (room.bufferAfter || 0) * 60000);
        
        await db.createBooking({
          roomId: input.roomId,
          tenantId,
          professionalId: ctx.user.id,
          patientName: input.patientName,
          patientPhone: input.patientPhone || null,
          startTime: input.startTime,
          endTime: input.endTime,
          bufferStartTime,
          bufferEndTime,
          totalPrice,
          status: 'confirmed',
          receptionNotes: input.receptionNotes || null,
          privateNotes: input.privateNotes || null,
        });
        
        const newBalance = balance - totalPrice;
        await db.addCredit({
          professionalId: ctx.user.id,
          tenantId,
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
          cancelledBy: ctx.user.id,
          cancellationReason: input.reason || null,
        });
        
        if (refundAmount > 0) {
          const balance = await db.getCreditBalance(ctx.user.id);
          const newBalance = balance + refundAmount;
          
          await db.addCredit({
            professionalId: ctx.user.id,
            tenantId: booking.tenantId || 1,
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
      const tenantId = (ctx.user as any).tenantId || 1;
      return db.getCreditBalance(ctx.user.id, tenantId);
    }),
    
    history: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = (ctx.user as any).tenantId || 1;
        return db.getCreditHistory(ctx.user.id, input?.limit, tenantId);
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
        const tenantId = (ctx.user as any).tenantId || 1;
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
          userId: ctx.user.id,
          userEmail: ctx.user.email,
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
        const tenantId = (ctx.user as any).tenantId || 1;
        return db.getCreditBalance(input.professionalId, tenantId);
      }),
  }),

  payments: router({
    history: professionalProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getPaymentHistory(ctx.user.id, input?.limit);
      }),
    
    // Create Stripe checkout session for credit purchase
    createCheckout: professionalProcedure
      .input(z.object({
        packageId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pkg = getCreditPackageById(input.packageId);
        if (!pkg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pacote não encontrado' });
        
        const stripe = await import('stripe').then(m => new m.default(process.env.STRIPE_SECRET_KEY!));
        const tenantId = (ctx.user as any).tenantId || 1;
        
        // Create payment record first
        const paymentResult = await db.createPayment({
          professionalId: ctx.user.id,
          tenantId,
          amount: pkg.price,
          method: 'credit_card',
          status: 'pending',
          metadata: JSON.stringify({ packageId: pkg.id, credits: pkg.credits }),
        });
        
        const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
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
            professionalId: ctx.user.id.toString(),
            tenantId: tenantId.toString(),
            packageId: pkg.id,
            credits: pkg.credits.toString(),
            paymentRecordId: (paymentResult as any)?.insertId?.toString() || '',
          },
        });

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
        const tenantId = (ctx.user as any).tenantId || 1;
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
    listUsers: adminProcedure.query(async () => {
      return await db.getAllProfessionals();
    }),
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

  // ============= TENANT MANAGEMENT =============
  tenants: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = (ctx.user as any).tenantId || 1;
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
        const tenantId = (ctx.user as any).tenantId || 1;
        await db.updateTenant(tenantId, input);
        await db.createAuditLog({
          tenantId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
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
        const tenantId = (ctx.user as any).tenantId || 1;
        return db.getProfessionalsByTenant(tenantId, input?.status);
      }),
    
    approveProfessional: adminProcedure
      .input(z.object({ linkId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = (ctx.user as any).tenantId || 1;
        await db.updateProfessionalTenantLink(input.linkId, {
          status: 'approved',
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        });
        await db.createAuditLog({
          tenantId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: 'professional.approve',
          entityType: 'professionalTenant',
          entityId: input.linkId,
        });
        return { success: true };
      }),
    
    blockProfessional: adminProcedure
      .input(z.object({ linkId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = (ctx.user as any).tenantId || 1;
        await db.updateProfessionalTenantLink(input.linkId, {
          status: 'blocked',
          rejectionReason: input.reason || null,
        });
        await db.createAuditLog({
          tenantId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
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
    list: adminProcedure
      .input(z.object({
        roomId: z.number().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const tenantId = (ctx.user as any).tenantId || 1;
        if (input.roomId) {
          return db.getRoomBlocks(input.roomId, input.startDate, input.endDate);
        }
        return db.getAllRoomBlocksByTenant(tenantId, input.startDate, input.endDate);
      }),
    
    create: adminProcedure
      .input(z.object({
        roomId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
        reason: z.enum(['maintenance', 'manager_reserve', 'other']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = (ctx.user as any).tenantId || 1;
        
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
          createdBy: ctx.user.id,
        });
        
        await db.createAuditLog({
          tenantId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
          action: 'room.block',
          entityType: 'room',
          entityId: input.roomId,
          after: JSON.stringify(input),
        });
        
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = (ctx.user as any).tenantId || 1;
        await db.deleteRoomBlock(input.id);
        await db.createAuditLog({
          tenantId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
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
        const booking = await db.getBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reserva não encontrada' });
        if (booking.status !== 'confirmed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas reservas confirmadas podem ser marcadas como no-show' });
        }
        
        const tenantId = (ctx.user as any).tenantId || 1;
        const before = JSON.stringify({ status: booking.status });
        
        await db.updateBooking(input.bookingId, {
          status: 'no_show',
          noShowRegisteredAt: new Date(),
          noShowRegisteredBy: ctx.user.id,
        });
        
        await db.createAuditLog({
          tenantId,
          userId: ctx.user.id,
          userEmail: ctx.user.email,
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
        const booking = await db.getBookingById(input.bookingId);
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
      const tenantId = (ctx.user as any).tenantId || 1;
      return db.getWaitlistByProfessional(ctx.user.id, tenantId);
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
      .mutation(async ({ input }) => {
        await db.updateWaitlistEntry(input.id, { status: 'notified' });
        return { success: true };
      }),
    
    convert: professionalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateWaitlistEntry(input.id, { status: 'converted' });
        return { success: true };
      }),
  }),

  // ============= AUDIT LOGS =============
  audit: router({
    list: adminProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const tenantId = (ctx.user as any).tenantId || 1;
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
        
        return { rooms, bookings, blocks };
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
