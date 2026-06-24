import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Check, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const TERRACOTTA = "#7C5C4A";
const FOREST     = "#3D3D2E";

type PlanForm = {
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  maxRooms: string;
  maxProfessionals: string;
  features: string;
  isActive: boolean;
};

const emptyForm = (): PlanForm => ({
  name: "", description: "", priceMonthly: "0", priceYearly: "0",
  maxRooms: "5", maxProfessionals: "10", features: "", isActive: true,
});

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SisaPlans() {
  const { data, isLoading, refetch } = trpc.superAdmin.listPlans.useQuery();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm());

  const createMutation = trpc.superAdmin.createPlan.useMutation({
    onSuccess: () => { toast.success("Plano criado!"); refetch(); setOpen(false); },
    onError: e => toast.error(e.message),
  });
  const updateMutation = trpc.superAdmin.updatePlan.useMutation({
    onSuccess: () => { toast.success("Plano atualizado!"); refetch(); setOpen(false); },
    onError: e => toast.error(e.message),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (plan: NonNullable<typeof data>[number]) => {
    setEditId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      priceMonthly: String(plan.priceMonthly),
      priceYearly: String(plan.priceYearly ?? 0),
      maxRooms: String(plan.maxRooms),
      maxProfessionals: String(plan.maxProfessionals),
      features: plan.features ? JSON.parse(plan.features).join(", ") : "",
      isActive: plan.isActive,
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      priceMonthly: Math.round(parseFloat(form.priceMonthly) * 100),
      priceYearly: form.priceYearly ? Math.round(parseFloat(form.priceYearly) * 100) : undefined,
      maxRooms: parseInt(form.maxRooms),
      maxProfessionals: parseInt(form.maxProfessionals),
      features: form.features ? form.features.split(",").map(s => s.trim()).filter(Boolean) : [],
      isActive: form.isActive,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SuperAdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>Planos</h1>
            <p className="text-sm text-muted-foreground">Gerencie os planos de assinatura da plataforma</p>
          </div>
          <Button onClick={openCreate} style={{ backgroundColor: TERRACOTTA, color: "white" }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data?.map(plan => (
              <Card key={plan.id} className="border border-[#D8D0C8]">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base" style={{ color: FOREST }}>{plan.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant={plan.isActive ? "default" : "secondary"} className={plan.isActive ? "bg-green-100 text-green-700 hover:bg-green-100 text-xs" : "text-xs"}>
                        {plan.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: TERRACOTTA }}>{fmt(plan.priceMonthly)}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                    {plan.priceYearly && <p className="text-xs text-muted-foreground">{fmt(plan.priceYearly)}/ano</p>}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Até <strong>{plan.maxRooms}</strong> salas</p>
                    <p>Até <strong>{plan.maxProfessionals}</strong> profissionais</p>
                  </div>
                  {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                  {plan.features && (
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(plan.features).map((f: string) => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDE8E3] text-[#7C5C4A]">{f}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { label: "Nome *", key: "name", type: "text" },
              { label: "Preço Mensal (R$) *", key: "priceMonthly", type: "number" },
              { label: "Preço Anual (R$)", key: "priceYearly", type: "number" },
              { label: "Máx. Salas *", key: "maxRooms", type: "number" },
              { label: "Máx. Profissionais *", key: "maxProfessionals", type: "number" },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  type={type}
                  value={form[key as keyof PlanForm] as string}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 h-8 text-sm"
                />
              </div>
            ))}
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 text-sm"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Funcionalidades (separadas por vírgula)</Label>
              <Input
                value={form.features}
                onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                placeholder="Relatórios, API, Suporte prioritário"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              />
              <Label htmlFor="isActive" className="text-xs">Plano ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!form.name || isPending}
              style={{ backgroundColor: TERRACOTTA, color: "white" }}
              onClick={handleSubmit}
            >
              {isPending ? "Salvando..." : editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
