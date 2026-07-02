# Plano de Rollback — Migração MySQL → PostgreSQL/Supabase

## Resumo da Migração

| Item | Antes | Depois |
|---|---|---|
| Banco de dados | MySQL 8 (TiDB Cloud) | PostgreSQL 17.6 (Supabase) |
| Driver Drizzle | `drizzle-orm/mysql2` | `drizzle-orm/node-postgres` |
| Pacote de conexão | `mysql2` | `pg` + `postgres` |
| `drizzle.config.ts` | `dialect: "mysql"` | `dialect: "postgresql"` |
| `onDuplicateKeyUpdate` | Usado em `upsertUser` | Substituído por `onConflictDoUpdate` |
| `onUpdateNow()` | Usado em todos os `updatedAt` | Removido (sem equivalente nativo no PG) |
| Enums | `mysqlEnum(...)` inline | `pgEnum(...)` declarados globalmente |
| Auto-increment | `int().autoincrement()` | `serial()` |
| Inteiros | `int()`, `bigint()`, `decimal()` | `integer()` |
| Checkpoint de rollback | `8bbf957e` | — |

---

## Como Fazer Rollback Completo

### Passo 1 — Reverter o código para MySQL

No painel do projeto Manus, acesse **Version History** e faça rollback para o checkpoint `8bbf957e` (salvo antes da migração).

Ou via CLI:
```bash
# No painel de gerenciamento do Manus → Version History → 8bbf957e → Rollback
```

### Passo 2 — Restaurar a DATABASE_URL MySQL

No painel **Settings → Secrets**, restaure a `DATABASE_URL` para a string de conexão MySQL/TiDB original:
```
mysql://[user]:[password]@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/[database]?ssl={"rejectUnauthorized":true}
```

### Passo 3 — Verificar funcionamento

```bash
pnpm test --run
pnpm dev
```

---

## Dados Migrados (Supabase)

Os dados foram migrados com sucesso em **01/07/2026**:

| Tabela | Registros |
|---|---|
| tenants | 1 |
| users | 16 |
| professionalTenants | 15 |
| rooms | 17 |
| roomBlocks | 2 |
| payments | 3 |
| bookings | 23 |
| credits | 48 |
| cancellationRules | 3 |
| notifications | 30 |
| auditLogs | 15 |
| waitlistEntries | 1 |
| consentRecords | 1 |
| settings | 3 |
| plans | 3 |
| **Total** | **181** |

---

## Ação Necessária — Atualizar DATABASE_URL

Para que o servidor de produção use o Supabase, atualize a `DATABASE_URL` no painel:

**Settings → Secrets → DATABASE_URL**

```
postgresql://postgres.wnxbxbukepjpwgfuicqr:[SENHA]@aws-1-sa-east-1.pooler.supabase.com:6543/postgres
```

> **Importante:** O pooler do Supabase (porta 6543) usa SSL automaticamente. O código já está configurado para detectar e ativar SSL quando a URL contém `supabase.com`.

---

## Arquivos Alterados na Migração

```
drizzle/schema.ts              ← Reescrito: mysqlTable → pgTable, enums globais
drizzle.config.ts              ← dialect: "mysql" → "postgresql"
server/db.ts                   ← Driver mysql2 → pg (Pool), onDuplicateKeyUpdate → onConflictDoUpdate
package.json                   ← Removido mysql2, adicionado pg + postgres
drizzle/0000_lovely_echo.sql   ← Nova migration PostgreSQL gerada
drizzle/mysql_backup/          ← Backup das migrations MySQL originais
```

---

## Notas de Compatibilidade PostgreSQL

1. **`updatedAt` sem `onUpdateNow()`** — No PostgreSQL não existe equivalente nativo. Para manter `updatedAt` atualizado automaticamente, crie um trigger no Supabase ou atualize o campo manualmente nas mutations (já feito nos routers).

2. **Enums são tipos de banco** — No PostgreSQL, `pgEnum` cria um TYPE no banco. Se precisar adicionar valores ao enum no futuro, use `ALTER TYPE ... ADD VALUE`.

3. **Sequences** — Os IDs auto-incremento usam `SEQUENCE` no PostgreSQL. As sequences foram atualizadas após a migração para continuar do maior ID existente.

4. **Case-sensitive em nomes de colunas** — O PostgreSQL é case-sensitive para identificadores entre aspas. O Drizzle já gera as queries com aspas duplas, então não há problema.

5. **`LIMIT` sem `OFFSET`** — Válido em ambos os bancos.

6. **JSON** — O campo `text` usado para JSON funciona em ambos. Para melhor performance no PostgreSQL, considere migrar para `jsonb` no futuro.
