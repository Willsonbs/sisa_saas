import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Building2, Users, DoorOpen, CalendarCheck, Lock, Unlock } from "lucide-react";

const TERRACOTTA = "#7C5C4A";
const FOREST     = "#3D3D2E";

export default function SisaTenantDetails() {
  const { id } = useParams<{ id: string }>();
  const tenantId = parseInt(id ?? "0");

  const { data, isLoading, refetch } = trpc.superAdmin.getTenant.useQuery({ id: tenantId }, { enabled: tenantId > 0 });

  const toggleMutation = trpc.superAdmin.toggleTenantStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: e => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </SuperAdminLayout>
    );
  }

  if (!data) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-16 text-muted-foreground">Tenant não encontrado</div>
      </SuperAdminLayout>
    );
  }

  const planLabel: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business", enterprise: "Enterprise" };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Back */}
        <Link href="/sisa/tenants">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Tenants
          </Button>
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>{data.name}</h1>
            <p className="text-sm text-muted-foreground">{data.slug}.sisa.com.br</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={data.isActive ? "default" : "secondary"} className={data.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
              {data.isActive ? "Ativo" : "Inativo"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toggleMutation.mutate({ id: data.id, isActive: !data.isActive })}
            >
              {data.isActive ? <><Lock className="h-3.5 w-3.5 text-red-500" /> Bloquear</> : <><Unlock className="h-3.5 w-3.5 text-green-600" /> Ativar</>}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: DoorOpen,       label: "Salas",        value: data.roomCount },
            { icon: Users,          label: "Profissionais", value: data.professionalCount },
            { icon: CalendarCheck,  label: "Reservas",     value: data.bookingCount },
            { icon: Building2,      label: "Plano",        value: planLabel[data.plan] ?? data.plan },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="border border-[#D8D0C8]">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: TERRACOTTA }} />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold" style={{ color: FOREST }}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Details */}
        <Card className="border border-[#D8D0C8]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base" style={{ color: FOREST }}>Informações do Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ["ID", data.id],
                ["Nome", data.name],
                ["Slug", data.slug],
                ["Email", data.email ?? "—"],
                ["Telefone", data.phone ?? "—"],
                ["Plano", planLabel[data.plan] ?? data.plan],
                ["Cadastro", new Date(data.createdAt).toLocaleString("pt-BR")],
                ["Atualizado", new Date(data.updatedAt).toLocaleString("pt-BR")],
                ["Janela Cancelamento", `${data.cancellationWindowMinutes} min`],
                ["Tolerância Atraso", `${data.lateArrivalToleranceMinutes} min`],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-[#3D3D2E]">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Subscription */}
        {data.subscription && (
          <Card className="border border-[#D8D0C8]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base" style={{ color: FOREST }}>Assinatura</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ["Status", data.subscription.status],
                  ["Stripe Customer", data.subscription.stripeCustomerId ?? "—"],
                  ["Stripe Sub ID", data.subscription.stripeSubscriptionId ?? "—"],
                  ["Início do Período", data.subscription.currentPeriodStart ? new Date(data.subscription.currentPeriodStart).toLocaleDateString("pt-BR") : "—"],
                  ["Fim do Período", data.subscription.currentPeriodEnd ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString("pt-BR") : "—"],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-[#3D3D2E]">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  );
}
