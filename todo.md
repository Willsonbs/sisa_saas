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

## Correção Urgente - Rota /some-path
- [x] Encontrar e remover referências à rota /some-path
- [x] Verificar se há outras rotas antigas no código

## Correção Urgente - Erro de Sintaxe
- [x] Corrigir erro de sintaxe no server/routers.ts linha 457
- [x] Verificar estrutura do router cancellationRules

## Correção Urgente - Erro de Hooks no BookRoom
- [x] Corrigir erro "Rendered more hooks than during the previous render" no BookRoom.tsx
- [x] Garantir que hooks não sejam chamados condicionalmente

## Reestruturação Urgente - Separação de Áreas
- [x] Criar landing page pública com opções de login separadas (Admin / Profissional)
- [x] Implementar sistema de cadastro de profissionais
- [x] Separar completamente área administrativa da área de profissionais
- [x] Remover botão Admin do menu de profissionais
- [x] Criar rotas separadas /admin/* e /professional/*
- [x] Ajustar DashboardLayout para mostrar menus diferentes por perfil
- [x] Garantir que admin não veja opções de reserva
- [x] Garantir que profissionais não vejam opções administrativas

## Funcionalidade Urgente - Cadastro de Profissionais
- [x] Adicionar formulário de cadastro na landing page
- [x] Criar procedure tRPC para registrar novos profissionais
- [x] Implementar validação de dados cadastrais (nome, email, telefone, CRP/CRM/CRO)
- [x] Criar fluxo de cadastro com confirmação
- [x] Redirecionar para dashboard após cadastro bem-sucedido

## Urgente - Sistema de Autenticação Próprio
- [x] Adicionar campo de senha no schema do banco de dados
- [x] Adicionar campo de senha no formulário de cadastro
- [x] Implementar hash de senha com bcrypt
- [x] Criar página de login própria (/login) com email e senha
- [x] Implementar procedure de login que valida email/senha
- [x] Gerar JWT token próprio após login bem-sucedido
- [x] Criar middleware de autenticação JWT
- [x] Substituir OAuth Manus por autenticação própria
- [x] Atualizar useAuth para usar sistema próprio
- [ ] Adicionar botão "Esqueci minha senha" (opcional)

## Urgente - Atualizar Senha do Usuário Erika
- [x] Buscar usuário erika@ no banco de dados
- [x] Gerar hash da senha 59ek6bj76p
- [x] Atualizar campo password no banco de dados
- [x] Testar login com as novas credenciais

## Urgente - Corrigir Erro Após Login
- [x] Verificar logs do servidor para identificar erro
- [x] Verificar se cookie auth_token está sendo setado corretamente
- [x] Verificar se contexto de autenticação está funcionando
- [x] Corrigir redirecionamento após login
- [x] Testar fluxo completo de login e acesso ao dashboard
- [x] Adicionar cookie-parser middleware no servidor Express
- [x] Validar autenticação JWT funcionando corretamente

## Correção Urgente - Página de Profissionais
- [x] Criar página /admin/professionals para listar profissionais
- [x] Adicionar rota /admin/professionals no App.tsx
- [x] Testar navegação e funcionalidade

## Correção Urgente - Erro setState durante Render
- [x] Identificar chamada de navegação durante render no Home.tsx linha 66
- [x] Mover navegação para useEffect
- [x] Testar correção

## Correção Urgente - Páginas com Erro 404
- [x] Criar página de edição de salas (/admin/rooms/:id/edit)
- [x] Adicionar rota de edição no App.tsx
- [x] Criar página de relatórios (/admin/reports)
- [x] Adicionar rota de relatórios no App.tsx
- [x] Testar navegação de todas as páginas

## Correção Urgente - Botão Editar Salas
- [x] Corrigir link do botão Editar em RoomsManagement.tsx para /admin/rooms/:id/edit

## Nova Funcionalidade - Calendário Interativo
- [x] Instalar react-big-calendar e moment
- [x] Criar componente Calendar com visualização de reservas
- [x] Adicionar rota /calendar no App.tsx
- [x] Adicionar link no menu de navegação
- [x] Adicionar funcionalidade de criar reserva clicando em slot vazio
- [x] Adicionar visualização de detalhes ao clicar em reserva existente
- [x] Adicionar filtro por sala
- [x] Testar navegação e funcionalidades do calendário
