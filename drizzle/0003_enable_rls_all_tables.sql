-- Segurança: habilita Row-Level Security em todas as tabelas públicas.
-- O Supabase expõe automaticamente qualquer tabela do schema "public" via
-- API REST (PostgREST) para os papéis anon/authenticated. Sem RLS habilitado
-- e sem policies, qualquer pessoa com a URL do projeto podia ler/editar/
-- apagar esses dados direto pela API, sem passar pelo backend.
-- A conexão do app usa o papel "postgres" (dono das tabelas), que ignora
-- RLS por padrão - nenhuma query da aplicação é afetada por esta mudança.
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "professionalTenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roomBlocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cancellationRules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auditLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waitlistEntries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consentRecords" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "apiKeys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patientAccessLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
