# Relatório de Auditoria de Segurança Multi-Tenant — SISA SaaS

**Data:** 2026-07-09  
**Versão auditada:** pré-`b7c28991` → corrigida em `(checkpoint pendente)`  
**Escopo:** Isolamento de dados entre tenants, exposição de dados sensíveis, controle de acesso por role.

---

## Resumo Executivo

A varredura identificou **8 vulnerabilidades** de isolamento multi-tenant e exposição de dados sensíveis. Todas foram corrigidas nesta sprint. O sistema agora garante que cada tenant veja apenas seus próprios dados em todas as áreas.

---

## Vulnerabilidades Encontradas e Corrigidas

### VULN-1 — `rooms.list` usava `publicProcedure` sem filtro de tenant
- **Risco:** Qualquer usuário não autenticado podia listar salas de todos os tenants.
- **Correção:** Trocado para `protectedProcedure`; `getAllRooms` agora recebe `ctx.auth.tenantId`.
- **Arquivo:** `server/routers.ts` linha ~199

### VULN-2 — `admin.stats` não filtrava profissionais e salas por tenant
- **Risco:** O card "Profissionais" no dashboard mostrava contagem global (18) em vez do tenant (11).
- **Correção:** `getAllRooms` e `getAllProfessionals` agora recebem `ctx.auth.tenantId`.
- **Arquivo:** `server/routers.ts` linha ~1070

### VULN-3 — `cancellationRules.list` era `publicProcedure` sem filtro de tenant
- **Risco:** Regras de cancelamento de todos os tenants eram expostas publicamente.
- **Correção:** Trocado para `protectedProcedure` com `ctx.auth.tenantId`; `create/update/delete` agora verificam que a regra pertence ao tenant antes de modificar.
- **Arquivo:** `server/routers.ts` linhas ~1197-1238; `server/db.ts` linhas ~719-737

### VULN-4 — `bookings.getByRoom` era `publicProcedure` sem verificação de tenant
- **Risco:** Qualquer usuário não autenticado podia consultar reservas (incluindo nomes de pacientes criptografados) de qualquer sala.
- **Correção:** Trocado para `protectedProcedure`; verifica que a sala pertence ao tenant via `getRoomById(roomId, tenantId)`.
- **Arquivo:** `server/routers.ts` linha ~446

### VULN-5 — `admin.reportByRoom` usava `getAllRooms()` sem tenantId
- **Risco:** Relatório financeiro incluía salas de outros tenants no cálculo.
- **Correção:** `getAllRooms(false, tenantId)` agora filtra pelo tenant do admin.
- **Arquivo:** `server/routers.ts` linha ~1186

### VULN-6 — `notifications.markAsRead` não verificava dono da notificação
- **Risco:** Um usuário autenticado podia marcar notificações de outros usuários como lidas, passando qualquer `id`.
- **Correção:** `markNotificationAsRead(id, userId)` agora verifica `AND notifications.userId = userId`.
- **Arquivo:** `server/db.ts` linha ~849; `server/routers.ts` linha ~943

### VULN-7 — `waitlist.notify` e `waitlist.convert` não verificavam dono da entrada
- **Risco:** Um profissional autenticado podia alterar status de entradas da lista de espera de outros profissionais.
- **Correção:** `updateWaitlistEntry(id, data, professionalId)` verifica `AND waitlistEntries.professionalId = professionalId`.
- **Arquivo:** `server/db.ts` linha ~795; `server/routers.ts` linhas ~1520-1534

### VULN-8 CRÍTICA — `auth.me` expunha `passwordHash` e `password` ao frontend
- **Risco:** O hash bcrypt da senha do usuário era enviado em toda resposta de autenticação para o frontend (visível em DevTools → Network).
- **Correção:** `auth.me` agora remove `password`, `passwordHash`, `cpf` e `cnpj` antes de retornar ao cliente.
- **Arquivo:** `server/routers.ts` linha ~60

---

## Constraint de Banco Adicionada

| Constraint | Tabela | Colunas | Propósito |
|---|---|---|---|
| `uq_professional_tenant` | `professionalTenants` | `(professionalId, tenantId)` | Impede vínculos duplicados de um profissional ao mesmo tenant |

---

## Áreas Verificadas e Aprovadas (sem vulnerabilidades)

| Área | Procedure | Status |
|---|---|---|
| Salas — criar/editar/deletar | `rooms.create/update/delete` | ✅ Já filtrava por `tenantId` |
| Bloqueios de sala | `rooms.createBlock/deleteBlock` | ✅ Já filtrava por `tenantId` |
| Reservas — criar/cancelar | `bookings.create/cancel` | ✅ Já verificava `tenantId` |
| Reservas — listar (admin) | `admin.listAllBookings` | ✅ Já filtrava por `tenantId` |
| Recepção | `reception.agenda/todayBookings` | ✅ Já filtrava por `tenantId` |
| Pagamentos | `payments.listByTenant` | ✅ Já filtrava por `tenantId` |
| Auditoria | `audit.list` | ✅ Já filtrava por `tenantId` |
| Configurações do tenant | `tenants.update` | ✅ Usa `ctx.auth.tenantId` |
| Portal público | `portal.getAvailableSlots` | ✅ Nunca expõe dados de pacientes |
| Profissionais — listar | `admin.listUsers` | ✅ Corrigido em sprint anterior |
| Créditos | `credits.*` | ✅ Filtrado por `professionalId` do usuário logado |
| Notificações — listar | `notifications.list/unread` | ✅ Filtrado por `userId` |

---

## Dados Sensíveis — Política de Exposição

| Campo | Onde armazenado | Retornado ao frontend? | Observação |
|---|---|---|---|
| `passwordHash` | `users.passwordHash` | ❌ Nunca (removido em `auth.me`) | Corrigido nesta sprint |
| `password` | `users.password` | ❌ Nunca (removido em `auth.me`) | Corrigido nesta sprint |
| `cpf` | `users.cpf` | Apenas para admin do próprio tenant | Via `admin.listUsers` (adminProcedure) |
| `cnpj` | `users.cnpj` | Apenas para admin do próprio tenant | Via `admin.listUsers` (adminProcedure) |
| `patientName` | `bookings.patientName` | Criptografado em repouso; descriptografado apenas para usuários autorizados do tenant | AES-256 via `encrypt/decrypt` |
| `patientPhone` | `bookings.patientPhone` | Idem | AES-256 via `encrypt/decrypt` |
| `privateNotes` | `bookings.privateNotes` | Apenas para o próprio profissional | Criptografado em repouso |

---

## Recomendações Futuras

1. **Row Level Security (RLS) no Supabase** — Habilitar RLS nas tabelas `bookings`, `users`, `credits` e `professionalTenants` como segunda camada de defesa, impedindo acesso direto via API pública do Supabase.
2. **Rate limiting na API** — Adicionar `express-rate-limit` nas rotas `/api/trpc` para prevenir força bruta e enumeração de IDs.
3. **Auditoria de acesso a dados sensíveis** — Registrar no `auditLogs` toda vez que CPF/CNPJ são acessados via painel admin.
4. **Expiração de sessão** — Implementar expiração automática do token JWT após inatividade (atualmente sem expiração configurada).
