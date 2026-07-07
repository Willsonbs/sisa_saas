# SISA - Sistema de Gerenciamento de Salas - TODO

## 1. Infraestrutura e Configuração Base
- [x] Configurar schema do banco de dados com todas as tabelas
- [x] Configurar integração Stripe para pagamentos
- [x] Configurar sistema de upload de imagens S3

## 2. Sistema de Autenticação e RBAC
- [x] Estender tabela users com campos profissionais (CRP/CRM/CRO)
- [x] Implementar controle de acesso por perfil (Admin, Profissional, Recepcionista, Financeiro)
- [x] Criar procedures protegidas por role

## 3. Gerenciamento de Salas
- [x] Criar CRUD de salas com nome, características, capacidade, equipamentos
- [x] Implementar upload de fotos de salas
- [x] Configurar disponibilidade por dia da semana
- [x] Definir preços por hora/turno/diária
- [x] Gerenciar status ativa/inativa

## 4. Sistema de Agenda e Reservas
- [x] Criar visualização de agenda estilo Google Calendar
- [x] Implementar bloqueio automático de horários no pré-agendamento
- [x] Prevenir conflitos de agendamento simultâneo (transações atômicas)
- [x] Criar sistema de reservas com validação de disponibilidade
- [x] Implementar cancelamento de reservas

## 5. Sistema de Créditos
- [x] Criar tabela de créditos por profissional
- [x] Implementar compra de créditos
- [x] Criar débito automático ao reservar sala
- [x] Implementar devolução de créditos por cancelamento (com regras de prazo)
- [x] Criar extrato de movimentação de créditos

## 6. Sistema de Pagamentos
- [x] Integrar checkout funcional para pagamento com cartão (Stripe)
- [x] Criar checkout seguro (Stripe Checkout)
- [x] Registrar histórico de pagamentos
- [x] Implementar pagamento via PIX (suporte via Stripe com fallback automático para cartão quando conta BR não disponível)

## 7. Cancelamentos com Regras
- [x] Implementar regras configuráveis de cancelamento
- [x] Crédito integral até X horas antes
- [x] Crédito parcial ou sem crédito após prazo
- [x] Notificar profissional sobre cancelamento

## 8. Dashboards por Perfil
- [x] Dashboard do Profissional (próximas reservas, créditos, extrato, histórico)
- [x] Dashboard do Administrador (visão geral, ocupação, faturamento)

## 9. Sistema de Notificações
- [x] Enviar email de confirmação de reserva
- [x] Enviar lembrete automático 24h antes do horário agendado (reminderService.ts)
- [x] Enviar lembrete automático 2h antes do horário agendado (reminderService.ts)
- [x] Notificar cancelamento

## 10. Relatórios Gerenciais
- [x] Taxa de ocupação por sala
- [x] Faturamento por profissional
- [x] Horários mais disputados
- [x] Ranking de uso de salas
- [x] Exportar relatórios (CSV)

## 11. Calendário Interativo
- [x] Instalar react-big-calendar e moment
- [x] Criar componente Calendar com visualização de reservas
- [x] Adicionar funcionalidade de criar reserva clicando em slot vazio
- [x] Adicionar filtro por sala

## === NOVAS FUNCIONALIDADES DO PRD ===

## PRD-1: Schema Multi-Tenant e Novas Entidades
- [x] Adicionar tabela tenants (empresa/prédio)
- [x] Adicionar campo tenantId em users, rooms, bookings, credits, payments
- [x] Adicionar tabela roomBlocks (bloqueios de sala: manutenção, reservado gestor)
- [x] Adicionar campos buffer (bufferBefore, bufferAfter) na tabela rooms
- [x] Adicionar campo roomType na tabela rooms
- [x] Adicionar campo minDuration, maxDuration, minAdvanceHours na tabela rooms
- [x] Atualizar status de bookings para máquina de estados completa
- [x] Atualizar status de payments
- [x] Adicionar tabela auditLogs (trilha de auditoria)
- [x] Adicionar tabela waitlistEntries (lista de espera)
- [x] Adicionar tabela consentRecords (consentimento LGPD)
- [x] Adicionar tabela professionalTenants (vínculo profissional-tenant)
- [x] Adicionar campo publicProfileSlug em users para URL pública do profissional
- [x] Migrar schema com SQL direto

## PRD-2: Backend Multi-Tenant e Máquina de Estados
- [x] Criar router tenants (CRUD de tenant, onboarding)
- [x] Implementar isolamento de dados por tenantId em todas as queries
- [x] Implementar máquina de estados para reservas
- [x] Criar procedure para bloqueio manual de sala (manutenção/gestor)
- [x] Criar procedure para registrar no-show (admin only)
- [x] Criar procedure para aprovar/recusar/bloquear profissional (admin only)
- [x] Criar router auditLogs com registro automático de ações críticas
- [x] Criar procedure para lista de espera com consentimento LGPD

## PRD-3: Checkout Funcional de Créditos
- [x] Criar checkout de compra de créditos com Stripe (cartão)
- [x] Implementar webhook Stripe para confirmar pagamento
- [x] Criar página de retorno do checkout (parâmetro ?payment=success/cancelled na página de créditos)

## PRD-4: Portal Público do Paciente
- [x] Criar rota pública /p/:slug para perfil do profissional
- [x] Criar página de perfil público do profissional
- [x] Criar formulário de lista de espera com campos LGPD
- [x] Registrar consentimento LGPD ao entrar na lista de espera

## PRD-5: Lembretes Automáticos
- [x] Implementar job de lembretes 24h antes das reservas
- [x] Implementar job de lembretes 2h antes das reservas
- [x] Configurar agendamento periódico (interval a cada 30 min no startup)
- [x] Deduplicação de lembretes (hasNotificationBeenSent)

## PRD-6: Frontend Atualizado
- [x] Adicionar bloqueio manual de sala no painel admin (/admin/room-blocks)
- [x] Adicionar trilha de auditoria no painel admin (/admin/audit)
- [x] Adicionar configurações da clínica no painel admin (/admin/settings)
- [x] Adicionar Lista de Espera no menu do profissional (/waitlist)
- [x] Melhorar branding: logo SISA no sidebar
- [x] Atualizar menu admin: Bloqueios, Relatórios, Auditoria, Configurações
- [x] Exportar relatórios CSV
- [x] Mostrar link público do profissional no dashboard
- [x] Página de configurações do profissional com slug editável

## Auditoria de Botões e Redesign Estético

### Auditoria de Botões/Gatilhos
- [x] Auditar e corrigir todos os botões de navegação (Editar, Salvar, Cancelar, etc.)
- [x] Verificar rotas do App.tsx e corrigir links quebrados
- [x] Testar fluxo de reserva completo (criar → confirmar → check-in → concluir)
- [x] Testar fluxo de créditos (comprar → checkout → retorno)
- [x] Testar botões do portal do paciente (lista de espera, consentimento)
- [x] Testar botões admin (bloqueios, auditoria, configurações)

### Redesign Estético
- [x] Atualizar index.css com nova paleta: terroso (#7C5C4A), lavanda (#C8C8E8), verde-escuro (#3D3D2E), off-white (#F5F3EF)
- [x] Atualizar tipografia: fonte sans-serif grande e limpa (DM Sans via Google Fonts)
- [x] Redesenhar landing page (Home.tsx) com layout editorial
- [x] Redesenhar DashboardLayout com nova estética

## Correções e Melhorias - Sprint 2
- [x] Corrigir botão de remover salas (update otimista: sala some da lista imediatamente)
- [x] Adicionar opção de pagamento direto via Stripe no fluxo de reserva (sem necessidade de créditos)
- [x] Atualizar webhook Stripe para confirmar reservas pagas diretamente
- [x] Adicionar R$ 500,00 de créditos de teste para willsonbs@gmail.com
- [x] Adicionar R$ 500,00 de créditos de teste para teste@sisa.com

## Correção do Sistema de Login e Cadastro
- [x] Corrigir useAuth hook para redirecionar para /login em vez do OAuth Manus
- [x] Corrigir CTAs "Entrar na rede" e "Já tenho conta" na landing page para usar /login
- [x] Melhorar página de login com credenciais de demonstração e botão "mostrar senha"
- [x] Criar usuário admin@sisa.com com senha admin123 no banco de dados
- [x] Corrigir senha do profissional willsonbs@gmail.com para admin123
- [x] Testar fluxo completo: login admin, login profissional, cadastro novo profissional
- [x] Adicionar opção de pagamento via PIX na tela de reserva (terceira opção além de créditos e cartão)

## Sprint 3 - Melhorias de UX e Funcionalidades
- [x] Calendário de reservas admin: layout semanal/diário com nome do prestador e horário em PT-BR (/admin/calendar)
- [x] Gestão de profissionais: detalhes, editar e excluir com confirmação
- [x] Relatórios: taxa de ocupação, relatório por sala, filtros de data/sala, exportar PDF
- [x] Gerenciar salas: modo card/lista, excluir permanente quando sem movimentação
- [x] Regras de cancelamento: interface intuitiva com explicação clara e tabela de referência

## Sprint 4 - Calendário de Disponibilidade no Menu Salas
- [x] Criar procedure rooms.availability (horários ocupados sem dados sensíveis)
- [x] Reescrever página Salas do profissional com calendário de disponibilidade por sala
- [x] Legenda: Disponível / Ocupado / Manutenção / Reservado pelo gestor
- [x] Clicar em horário livre abre fluxo de reserva
- [x] Horários de outros profissionais aparecem apenas como "Ocupado" (sem nome/paciente)
- [x] Melhorar mensagem de erro de conflito: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário disponível."

## Sprint 6 - Segurança e Conformidade LGPD
- [x] Criar tipo AuthenticatedUser com tenantId garantido (não-nulo) em _core/trpc.ts
- [x] Substituir todos os 21 usos de (ctx.user as any) por ctx.auth tipado
- [x] Adicionar tenantId obrigatório em getRoomById e getBookingById (isolamento de tenant)
- [x] Criar módulo de criptografia AES-256-GCM (_core/encryption.ts)
- [x] Criptografar patientName, patientPhone e privateNotes na escrita (bookings.create)
- [x] Descriptografar dados sensíveis na leitura (bookings.list, bookings.getById, admin.listAllBookings)
- [x] Criar tabela patient_access_logs para trilha de acesso LGPD
- [x] Criar helper logPatientAccess e registrar acesso em bookings.getById
- [x] Sanitizar portal.getAvailableSlots: retorna apenas slots livres (sem nomes/horários/notas)

## Sprint 10 — Painel Super Admin (SISA)
- [x] Role super_admin no schema (enum users)
- [x] Tabelas plans e subscriptions no banco
- [x] Migração db:push aplicada com sucesso
- [x] shared/userContext.ts atualizado com super_admin
- [x] superAdminProcedure no _core/trpc.ts
- [x] db.ts: owner recebe role super_admin automaticamente
- [x] superAdminRouter: dashboard, listTenants, getTenant, toggleTenantStatus, impersonateTenant, listPlans, createPlan, updatePlan, listSubscriptions, billing, listUsers, listAuditLogs
- [x] SuperAdminLayout.tsx com sidebar dedicada
- [x] Login.tsx: redirecionamento automático para /sisa/dashboard
- [x] SisaDashboard.tsx com KPIs e gráficos de crescimento
- [x] SisaTenants.tsx com listagem, filtros e ações
- [x] SisaTenantDetails.tsx com detalhes completos
- [x] SisaPlans.tsx com CRUD de planos
- [x] SisaBilling.tsx com visão financeira
- [x] SisaUsers.tsx com listagem de todos os usuários
- [x] SisaAudit.tsx com log de auditoria expandível
- [x] App.tsx: rotas /sisa/* registradas
- [x] Testes Vitest: 11 testes de controle de acesso passando (32 total)

## Migração MySQL → PostgreSQL/Supabase
- [x] Checkpoint de rollback salvo (8bbf957e) antes da migração
- [x] drizzle/schema.ts reescrito: mysqlTable→pgTable, enums globais, serial(), integer()
- [x] drizzle.config.ts: dialect mysql→postgresql
- [x] server/db.ts: driver mysql2→pg (Pool), onDuplicateKeyUpdate→onConflictDoUpdate, SSL automático para Supabase
- [x] Removido mysql2 das dependências de produção
- [x] Adicionado pg + @types/pg + postgres
- [x] Migrations MySQL antigas movidas para drizzle/mysql_backup/
- [x] Nova migration PostgreSQL gerada: drizzle/0000_lovely_echo.sql
- [x] 19 tabelas criadas no Supabase via drizzle-kit migrate
- [x] 181 registros migrados do MySQL para o Supabase (script scripts/migrate_data.mjs)
- [x] Sequences PostgreSQL atualizadas após migração
- [x] 32/32 testes passando com DATABASE_URL do Supabase
- [x] Plano de rollback documentado em docs/ROLLBACK_PLAN.md
- [x] Atualizar DATABASE_URL no painel Secrets → apontar para Supabase (instrução entregue ao usuário)

## Melhorias no Painel de Profissionais (Admin)
- [x] Formulário de cadastro/edição com campos completos: CPF/CNPJ, telefone, endereço, especialidade, registro profissional (CRP/CRM/CRO), data de nascimento, gênero, bio
- [x] Corrigir coluna "Créditos" na listagem de profissionais (exibir saldo real do banco)
- [x] Backend: procedure admin.listProfessionals deve retornar saldo de créditos de cada profissional
- [x] Backend: procedure admin.updateProfessional deve aceitar e salvar todos os campos cadastrais
