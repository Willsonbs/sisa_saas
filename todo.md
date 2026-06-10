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
- [ ] Integrar checkout funcional para pagamento com cartão (Stripe)
- [ ] Implementar pagamento via PIX
- [ ] Criar checkout seguro
- [ ] Registrar histórico de pagamentos

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
- [ ] Exportar relatórios (CSV)

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
- [ ] Criar checkout de compra de créditos com Stripe (cartão)
- [ ] Implementar webhook Stripe para confirmar pagamento
- [ ] Criar página de retorno do checkout (/credits/success, /credits/cancel)

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
