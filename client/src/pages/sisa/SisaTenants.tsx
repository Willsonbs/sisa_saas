import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Eye, Lock, Unlock, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const TERRACOTTA = "#7C5C4A";
const FOREST     = "#3D3D2E";

export default function SisaTenants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [impersonateId, setImpersonateId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, refetch } = trpc.superAdmin.listTenants.useQuery({ search, status: statusFilter });

  const toggleMutation = trpc.superAdmin.toggleTenantStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const impersonateMutation = trpc.superAdmin.impersonateTenant.useMutation({
    onSuccess: (data) => {
      toast.success("Acesso registrado em auditoria. Redirecionando...");
      setImpersonateId(null);
      setReason("");
      // Redirect to admin panel of that tenant (same app, just navigate)
      window.location.href = "/admin";
    },
    onError: e => toast.error(e.message),
  });

  const planLabel = (plan: string) => {
    const map: Record<string, string> = { starter: "Starter", pro: "Pro", business: "Business", enterprise: "Enterprise" };
    return map[plan] ?? plan;
  };

  const planColor = (plan: string) => {
    const map: Record<string, string> = { starter: "bg-gray-100 text-gray-700", pro: "bg-blue-100 text-blue-700", business: "bg-purple-100 text-purple-700", enterprise: "bg-amber-100 text-amber-700" };
    return map[plan] ?? "bg-gray-100 text-gray-700";
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>Gestão de Tenants</h1>
          <p className="text-sm text-muted-foreground">Empresas clientes cadastradas na plataforma</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou slug..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map(s => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className={statusFilter === s ? "border-[#7C5C4A] bg-[#EDE8E3]" : ""}
                onClick={() => setStatusFilter(s)}
              >
                {{ all: "Todos", active: "Ativos", inactive: "Inativos" }[s]}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-[#D8D0C8] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E3DC]" style={{ background: "#F5F3EF" }}>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Plano</th>
                  <th className="text-center px-4 py-3 font-medium text-[#3D3D2E]">Salas</th>
                  <th className="text-center px-4 py-3 font-medium text-[#3D3D2E]">Profissionais</th>
                  <th className="text-center px-4 py-3 font-medium text-[#3D3D2E]">Reservas</th>
                  <th className="text-center px-4 py-3 font-medium text-[#3D3D2E]">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Cadastro</th>
                  <th className="text-center px-4 py-3 font-medium text-[#3D3D2E]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#E8E3DC]">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum tenant encontrado</td>
                  </tr>
                ) : data?.map(t => (
                  <tr key={t.id} className="border-b border-[#E8E3DC] hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[#3D3D2E]">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.email ?? t.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor(t.plan)}`}>
                        {planLabel(t.plan)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{t.roomCount}</td>
                    <td className="px-4 py-3 text-center">{t.professionalCount}</td>
                    <td className="px-4 py-3 text-center">{t.bookingCount}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={t.isActive ? "default" : "secondary"} className={t.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                        {t.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/sisa/tenants/${t.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver detalhes">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={t.isActive ? "Bloquear" : "Ativar"}
                          onClick={() => toggleMutation.mutate({ id: t.id, isActive: !t.isActive })}
                        >
                          {t.isActive ? <Lock className="h-3.5 w-3.5 text-red-500" /> : <Unlock className="h-3.5 w-3.5 text-green-600" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Acessar painel do tenant"
                          onClick={() => setImpersonateId(t.id)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" style={{ color: TERRACOTTA }} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Impersonate dialog */}
      <Dialog open={impersonateId !== null} onOpenChange={() => { setImpersonateId(null); setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acessar Painel do Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Você está prestes a acessar o painel de um cliente. Esta ação será registrada em auditoria.
            </p>
            <div>
              <Label className="text-sm">Motivo do acesso *</Label>
              <Textarea
                placeholder="Ex: Suporte técnico solicitado pelo cliente..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImpersonateId(null); setReason(""); }}>Cancelar</Button>
            <Button
              disabled={reason.trim().length < 5 || impersonateMutation.isPending}
              style={{ backgroundColor: TERRACOTTA, color: "white" }}
              onClick={() => impersonateId && impersonateMutation.mutate({ tenantId: impersonateId, reason })}
            >
              {impersonateMutation.isPending ? "Registrando..." : "Confirmar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
