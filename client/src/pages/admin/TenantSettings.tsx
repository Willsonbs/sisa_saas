import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function TenantSettings() {
  const { data: tenant, isLoading, refetch } = trpc.tenants.current.useQuery();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    cancellationWindowHours: 12,
    lateArrivalToleranceMinutes: 15,
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        address: tenant.address || "",
        cancellationWindowHours: tenant.cancellationWindowHours ?? 12,
        lateArrivalToleranceMinutes: tenant.lateArrivalToleranceMinutes ?? 15,
      });
    }
  }, [tenant]);

  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações da Clínica</h1>
          <p className="text-gray-500 mt-1">Gerencie as informações e políticas da sua clínica.</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Informações da Clínica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da clínica</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nome da clínica"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="contato@clinica.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Rua, número, bairro, cidade"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Políticas de Cancelamento e Tolerância
                </CardTitle>
                <CardDescription>
                  Configure as regras de cancelamento e tolerância de atraso para sua clínica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Janela de cancelamento (horas antes)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      value={form.cancellationWindowHours}
                      onChange={e => setForm(p => ({ ...p, cancellationWindowHours: parseInt(e.target.value) || 0 }))}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-500">horas antes do início da reserva</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Cancelamentos feitos com menos de {form.cancellationWindowHours}h de antecedência não receberão reembolso.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Tolerância de atraso (minutos)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={60}
                      value={form.lateArrivalToleranceMinutes}
                      onChange={e => setForm(p => ({ ...p, lateArrivalToleranceMinutes: parseInt(e.target.value) || 0 }))}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-500">minutos de tolerância de atraso</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Após {form.lateArrivalToleranceMinutes} minutos sem check-in, a reserva pode ser marcada como no-show.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
