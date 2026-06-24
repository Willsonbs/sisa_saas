import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Shield, Clock, AlertCircle, Save, Info } from "lucide-react";

const TERRACOTTA = "#7C5C4A";
const FOREST_DARK = "#3D3D2E";

function PolicyField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-[#3D3D2E]">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
          className="w-28 h-9"
        />
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

export default function BookingPolicy() {
  const { data: policy, isLoading, refetch } = trpc.bookingPolicy.get.useQuery();

  const [cancelMinutes, setCancelMinutes] = useState(720);
  const [lateMinutes, setLateMinutes] = useState(15);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (policy) {
      setCancelMinutes(policy.cancellationWindowMinutes ?? 720);
      setLateMinutes(policy.lateArrivalToleranceMinutes ?? 15);
      setDirty(false);
    }
  }, [policy]);

  const updateMutation = trpc.bookingPolicy.update.useMutation({
    onSuccess: () => {
      toast.success("Política atualizada com sucesso!");
      refetch();
      setDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      cancellationWindowMinutes: cancelMinutes,
      lateArrivalToleranceMinutes: lateMinutes,
    });
  };

  const cancelHours = Math.floor(cancelMinutes / 60);
  const cancelMins  = cancelMinutes % 60;
  const cancelLabel = cancelHours > 0
    ? cancelMins > 0 ? `${cancelHours}h ${cancelMins}min` : `${cancelHours}h`
    : `${cancelMinutes}min`;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: FOREST_DARK }}>Políticas de Reserva</h1>
          <p className="text-sm text-muted-foreground">Configure as regras que regem cancelamentos e atendimentos na clínica</p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 text-xs text-[#7C5C4A] bg-[#EDE8E3] rounded-lg px-4 py-3">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            As políticas definidas aqui se aplicam a todos os profissionais do tenant.
            Administradores podem cancelar reservas fora da janela de cancelamento,
            mas o sistema registrará o motivo em log de auditoria.
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cancellation policy */}
            <Card className="border border-[#D8D0C8]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: FOREST_DARK }}>
                  <Shield className="h-4 w-4" style={{ color: TERRACOTTA }} />
                  Política de Cancelamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <PolicyField
                  label="Antecedência mínima para cancelamento"
                  description="Profissionais só podem cancelar reservas com pelo menos esta antecedência. Cancelamentos fora desta janela são bloqueados para profissionais (admins podem sobrescrever)."
                  value={cancelMinutes}
                  onChange={v => { setCancelMinutes(v); setDirty(true); }}
                  min={0}
                  max={10080}
                  unit="minutos"
                />

                {/* Visual feedback */}
                <div className="bg-[#F5F3EF] rounded-lg p-3 text-xs text-[#3D3D2E]">
                  <p className="font-medium mb-1">Resumo da regra atual:</p>
                  <p>
                    Cancelamentos devem ser feitos com pelo menos{" "}
                    <strong>{cancelLabel}</strong> de antecedência.
                    {cancelMinutes === 0 && " (Cancelamento livre a qualquer momento)"}
                  </p>
                </div>

                {/* Quick presets */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Atalhos rápidos:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Livre", value: 0 },
                      { label: "30 min", value: 30 },
                      { label: "1h", value: 60 },
                      { label: "2h", value: 120 },
                      { label: "6h", value: 360 },
                      { label: "12h", value: 720 },
                      { label: "24h", value: 1440 },
                      { label: "48h", value: 2880 },
                    ].map(preset => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        className={`h-7 text-xs ${cancelMinutes === preset.value ? "border-[#7C5C4A] bg-[#EDE8E3]" : ""}`}
                        onClick={() => { setCancelMinutes(preset.value); setDirty(true); }}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance policy */}
            <Card className="border border-[#D8D0C8]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2" style={{ color: FOREST_DARK }}>
                  <Clock className="h-4 w-4" style={{ color: TERRACOTTA }} />
                  Tolerâncias e Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <PolicyField
                  label="Tolerância de atraso"
                  description="Tempo máximo de atraso permitido antes de registrar no-show automaticamente."
                  value={lateMinutes}
                  onChange={v => { setLateMinutes(v); setDirty(true); }}
                  min={0}
                  max={120}
                  unit="minutos"
                />
              </CardContent>
            </Card>

            {/* Save button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!dirty || updateMutation.isPending}
                style={{ backgroundColor: dirty ? TERRACOTTA : undefined, color: dirty ? "white" : undefined }}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Salvando..." : "Salvar Políticas"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
