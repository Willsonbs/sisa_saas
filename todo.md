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
- [ ] Criar visualização de agenda estilo Google Calendar
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
- [ ] Integrar Stripe para pagamento com cartão
- [ ] Implementar pagamento via PIX
- [ ] Criar checkout seguro
- [ ] Gerar nota fiscal automática para cada transação
- [ ] Registrar histórico de pagamentos

## 7. Cancelamentos com Regras
- [x] Implementar regras configuráveis de cancelamento
- [x] Crédito integral até X horas antes
- [x] Crédito parcial ou sem crédito após prazo
- [x] Notificar profissional sobre cancelamento

## 8. Dashboards por Perfil
- [ ] Dashboard do Profissional (próximas reservas, créditos, extrato, histórico)
- [ ] Dashboard do Administrador (visão geral, ocupação, faturamento)
- [ ] Agenda da Recepção (nome profissional, paciente, sala, horário - sem dados sensíveis)
- [ ] Dashboard Financeiro (relatórios, faturamento)

## 9. Sistema de Notificações
- [x] Enviar email de confirmação de reserva
- [ ] Enviar lembrete antes do horário agendado
- [x] Notificar cancelamento
- [ ] Alertar sobre cobrança automática
- [x] Notificações in-app

## 10. Relatórios Gerenciais
- [ ] Taxa de ocupação por sala
- [ ] Faturamento por profissional
- [ ] Horários mais disputados
- [ ] Ranking de uso de salas
- [ ] Exportar relatórios

## 11. API REST Pública
- [ ] Criar endpoints REST documentados
- [ ] Implementar autenticação via API key
- [ ] Endpoint para consultar disponibilidade
- [ ] Endpoint para criar reserva
- [ ] Endpoint para cancelar reserva
- [ ] Documentação Swagger/OpenAPI

## 12. Integração com Site On Life
- [ ] Criar widget embedável (iframe)
- [ ] Gerar link direto para agendamento
- [ ] Documentar integração

## 13. Testes e Qualidade
- [ ] Escrever testes vitest para procedures críticas
- [ ] Testar fluxo completo de reserva
- [ ] Testar sistema de créditos
- [ ] Testar integração Stripe
- [ ] Validar controle de acesso RBAC

## 14. Design e UX
- [x] Definir paleta de cores elegante
- [x] Criar componentes UI consistentes
- [x] Implementar tema profissional
- [x] Garantir responsividade mobile
- [ ] Adicionar micro-interações

## Correções Urgentes
- [x] Criar página /admin para administradores
- [x] Adicionar rota /admin no App.tsx

## Funcionalidades Pendentes - Urgente
- [x] Criar página de gerenciamento de salas (/admin/rooms)
- [x] Criar formulário de criação/edição de salas
- [x] Implementar upload de fotos de salas
- [x] Criar página de gerenciamento de regras de cancelamento
- [x] Criar página de agendamento/reserva de salas
- [x] Implementar visualização de agenda com disponibilidade
- [x] Criar formulário de nova reserva
- [x] Implementar listagem de reservas do profissional
- [x] Criar página de detalhes da reserva com cancelamento

## Correção Urgente - Page 2
- [x] Investigar qual rota está configurada como Page 2 no DashboardLayout
- [x] Criar página correspondente ou ajustar navegação
