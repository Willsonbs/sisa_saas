# SISA — Sistema de Gerenciamento de Salas

> **SaaS multi-tenant** para clínicas e consultórios gerenciarem salas de atendimento, profissionais, reservas e pagamentos em uma plataforma unificada.

[![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-11-blueviolet)](https://trpc.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

---

## Visão Geral

O **SISA** é uma plataforma SaaS voltada para clínicas de saúde mental, psicologia, fisioterapia e demais especialidades que precisam gerenciar a locação de salas de atendimento para profissionais autônomos. A plataforma oferece três níveis de acesso distintos, cada um com painel dedicado:

| Perfil | Acesso | Descrição |
|---|---|---|
| **Super Admin** | `/sisa/*` | Proprietário da plataforma — gerencia clientes, planos, financeiro e auditoria |
| **Administrador** | `/admin/*` | Gestor da clínica — gerencia salas, profissionais, reservas e configurações |
| **Profissional** | `/professional/*` | Profissional de saúde — visualiza salas disponíveis, faz reservas e gerencia atendimentos |

---

## Funcionalidades Principais

### Painel do Profissional
- **Grade de Salas** com estética de calendário: coluna de horas à esquerda, 4 salas por visualização, navegação por data
- Bloqueio automático de horários retroativos (passado não é clicável)
- Fluxo completo de reserva com seleção de horário, pagamento e confirmação
- **Minhas Reservas** com política de cancelamento exibida, status visual e painel de atendimentos expansível
- Registro de atendimentos por reserva (geração automática ou manual)

### Painel do Administrador
- **Gerenciar Salas** — CRUD completo com fotos, capacidade, valor/hora e disponibilidade
- **Gerenciar Reservas** — grade estilo calendário com chips de status, drawer de detalhes e ações (concluir, no-show, cancelar)
- **Gerenciar Profissionais** — listagem com créditos, especialidade e histórico
- **Políticas de Reserva** — janela de cancelamento configurável, tolerância de atraso
- **Bloqueios de Sala** — bloquear períodos específicos por sala
- **Relatórios** e **Trilha de Auditoria**

### Painel de Gestão SISA (Super Admin)
- **Dashboard** com KPIs da plataforma: empresas, profissionais, salas ativas, reservas, receita
- **Clientes** — listagem com filtros, detalhes completos, edição de cadastro (razão social, CNPJ, endereço) e ações de ativar/bloquear
- **Planos** — CRUD de planos de assinatura (Starter, Pro, Business, Enterprise)
- **Financeiro** — visão de receita, pagamentos e assinaturas
- **Usuários** — listagem de todos os usuários da plataforma
- **Auditoria** — log expandível de ações administrativas

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS 4, shadcn/ui, Wouter |
| **Backend** | Node.js 22, Express 4, tRPC 11, Superjson |
| **Banco de Dados** | MySQL / TiDB via Drizzle ORM |
| **Autenticação** | Manus OAuth 2.0 + JWT (cookie-based sessions) |
| **Pagamentos** | Stripe (checkout, webhooks, reembolso) |
| **Armazenamento** | S3-compatible (fotos de salas, assets) |
| **Testes** | Vitest |
| **Linguagem** | TypeScript (end-to-end, full-stack) |

---

## Estrutura do Projeto

```
sisa_saas/
├── client/
│   └── src/
│       ├── components/          # Componentes reutilizáveis (DashboardLayout, SuperAdminLayout, etc.)
│       ├── pages/
│       │   ├── admin/           # Painel do administrador da clínica
│       │   ├── professional/    # Painel do profissional de saúde
│       │   └── sisa/            # Painel de gestão SISA (super admin)
│       ├── hooks/               # Custom hooks (useAuth, etc.)
│       └── lib/trpc.ts          # Cliente tRPC
├── server/
│   ├── routers.ts               # Procedures tRPC principais
│   ├── routers/
│   │   └── superAdmin.ts        # Router do Super Admin
│   ├── db.ts                    # Query helpers (Drizzle)
│   └── _core/                   # Infraestrutura: OAuth, contexto, LLM, notificações
├── drizzle/
│   └── schema.ts                # Schema do banco de dados
└── shared/                      # Tipos e constantes compartilhados
```

---

## Modelo de Dados

```
tenants          → Clientes (clínicas) da plataforma
users            → Usuários (super_admin | admin | professional)
rooms            → Salas de atendimento por tenant
bookings         → Reservas de salas
appointments     → Atendimentos vinculados a reservas
plans            → Planos de assinatura disponíveis
subscriptions    → Assinaturas ativas por tenant
credits          → Saldo de créditos por profissional
payments         → Histórico de pagamentos
auditLogs        → Trilha de auditoria de ações
roomBlocks       → Bloqueios de disponibilidade de sala
```

---

## Perfis de Demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Super Admin | willsonbs@gmail.com | *(privado)* |
| Empresa (Admin) | empresa@example.com | admin@123 |
| Profissional | profissional@example.com | Mudar@123 |

> O cliente de demonstração é a **On Life Clínica – Saúde Mental** (Evda Soluções em Gestão Ltda), com 12 profissionais, 17 salas e 13 reservas cadastradas.

---

## Regras de Negócio

- **Reservas retroativas** são bloqueadas em três camadas: UI (grade), formulário (validação) e servidor (procedure).
- **Política de cancelamento** configurável por tenant (janela em minutos). Profissionais fora da janela não podem cancelar; administradores podem sobrescrever com registro em auditoria.
- **Atendimentos** são independentes de reservas — podem ser gerados automaticamente pela duração padrão do profissional ou adicionados manualmente.
- **Controle de acesso por role**: `super_admin` → plataforma inteira; `admin` → tenant próprio; `professional` → dados próprios.

---

## Instalação Local

```bash
# Clone o repositório
git clone https://github.com/Willsonbs/sisa_saas.git
cd sisa_saas

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (DATABASE_URL, JWT_SECRET, etc.)

# Aplique o schema no banco
pnpm db:push

# Inicie o servidor de desenvolvimento
pnpm dev
```

---

## Testes

```bash
pnpm test
```

Os testes cobrem: autenticação (login/logout), reservas (criação, cancelamento, validação de horário passado), atendimentos, políticas de reserva e procedures do Super Admin.

---

## Licença

Projeto privado — todos os direitos reservados © 2026 Wilson Bernardes / SISA.
