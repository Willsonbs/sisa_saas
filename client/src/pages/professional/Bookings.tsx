import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Calendar, Clock, MapPin, X, Plus, ChevronDown, ChevronUp,
  Users, AlertCircle, CheckCircle2, Info, Zap, Trash2, Edit2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

// ─── Palette ────────────────────────────────────────────────────────────────
const TERRACOTTA = "#7C5C4A";
const FOREST_DARK = "#3D3D2E";
const WARM_BG = "#F5F3EF";

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  draft:              { label: "Rascunho",          className: "bg-gray-100 text-gray-600",   icon: <Info className="h-3 w-3" /> },
  pending_payment:    { label: "Aguard. pagamento", className: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  confirmed:          { label: "Confirmada",        className: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3 w-3" /> },
  canceled_with_credit:{ label: "Cancelada c/ crédito", className: "bg-orange-100 text-orange-700", icon: <X className="h-3 w-3" /> },
  no_show:            { label: "No-show",           className: "bg-red-100 text-red-600",     icon: <X className="h-3 w-3" /> },
  completed:          { label: "Concluída",         className: "bg-blue-100 text-blue-700",   icon: <CheckCircle2 className="h-3 w-3" /> },
};

const APPT_STATUS_MAP: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado",  className: "bg-gray-100 text-gray-600" },
  confirmed:  { label: "Confirmado", className: "bg-green-100 text-green-700" },
  completed:  { label: "Concluído",  className: "bg-blue-100 text-blue-700" },
  cancelled:  { label: "Cancelado",  className: "bg-red-100 text-red-600" },
  no_show:    { label: "No-show",    className: "bg-orange-100 text-orange-700" },
};

function fmt(d: Date | string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

// ─── Appointment panel ───────────────────────────────────────────────────────
function AppointmentsPanel({ bookingId, bookingStart, bookingEnd }: {
  bookingId: number;
  bookingStart: Date;
  bookingEnd: Date;
}) {
  const utils = trpc.useUtils();
  const { data: appts = [], isLoading } = trpc.appointments.listByBooking.useQuery({ bookingId });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAppt, setNewAppt] = useState({ patientName: "", patientPhone: "", notes: "", startTime: "", endTime: "" });

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Atendimento adicionado!");
      utils.appointments.listByBooking.invalidate({ bookingId });
      setShowAddForm(false);
      setNewAppt({ patientName: "", patientPhone: "", notes: "", startTime: "", endTime: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Atendimento atualizado!");
      utils.appointments.listByBooking.invalidate({ bookingId });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Atendimento removido!");
      utils.appointments.listByBooking.invalidate({ bookingId });
    },
    onError: (e) => toast.error(e.message),
  });

  const generateMutation = trpc.appointments.generateFromBooking.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.slots} atendimentos gerados automaticamente!`);
      utils.appointments.listByBooking.invalidate({ bookingId });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!newAppt.startTime || !newAppt.endTime) {
      toast.error("Informe o horário de início e fim");
      return;
    }
    const start = new Date(`${new Date(bookingStart).toISOString().slice(0, 10)}T${newAppt.startTime}:00`);
    const end = new Date(`${new Date(bookingStart).toISOString().slice(0, 10)}T${newAppt.endTime}:00`);
    createMutation.mutate({
      bookingId,
      startTime: start,
      endTime: end,
      patientName: newAppt.patientName || undefined,
      patientPhone: newAppt.patientPhone || undefined,
      notes: newAppt.notes || undefined,
    });
  };

  if (isLoading) return <div className="h-8 bg-muted animate-pulse rounded mt-2" />;

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[#3D3D2E] flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          Atendimentos ({appts.length})
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => generateMutation.mutate({ bookingId })}
            disabled={generateMutation.isPending}
          >
            <Zap className="h-3 w-3 mr-1" />
            Gerar auto
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-[#F5F3EF] rounded-lg p-3 mb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="time" className="h-8 text-sm" value={newAppt.startTime}
                onChange={e => setNewAppt(p => ({ ...p, startTime: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="time" className="h-8 text-sm" value={newAppt.endTime}
                onChange={e => setNewAppt(p => ({ ...p, endTime: e.target.value }))} />
            </div>
          </div>
          <Input placeholder="Nome do paciente (opcional)" className="h-8 text-sm" value={newAppt.patientName}
            onChange={e => setNewAppt(p => ({ ...p, patientName: e.target.value }))} />
          <Input placeholder="Telefone (opcional)" className="h-8 text-sm" value={newAppt.patientPhone}
            onChange={e => setNewAppt(p => ({ ...p, patientPhone: e.target.value }))} />
          <Textarea placeholder="Observações" className="text-sm min-h-[60px]" value={newAppt.notes}
            onChange={e => setNewAppt(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}
              style={{ backgroundColor: TERRACOTTA, color: "white" }}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {appts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhum atendimento registrado. Use "Gerar auto" para criar automaticamente.</p>
      ) : (
        <div className="space-y-1.5">
          {appts.map(appt => {
            const st = APPT_STATUS_MAP[appt.status] ?? APPT_STATUS_MAP.scheduled;
            return (
              <div key={appt.id} className="flex items-center justify-between bg-[#F5F3EF] rounded-md px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#7C5C4A] font-medium">
                    {fmt(appt.startTime)} – {fmt(appt.endTime)}
                  </span>
                  <span className="text-[#3D3D2E]">{appt.patientName || "—"}</span>
                  <Badge className={`text-xs px-1.5 py-0 ${st.className}`}>{st.label}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Select
                    value={appt.status}
                    onValueChange={v => updateMutation.mutate({ id: appt.id, bookingId, status: v as any })}
                  >
                    <SelectTrigger className="h-6 w-28 text-xs border-0 bg-transparent p-0 focus:ring-0">
                      <Edit2 className="h-3 w-3 text-muted-foreground" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPT_STATUS_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => deleteMutation.mutate({ id: appt.id })}>
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Bookings() {
  const { data: bookings, isLoading, refetch } = trpc.bookings.list.useQuery();
  const { data: policy } = trpc.bookingPolicy.get.useQuery();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [cancelReason, setCancelReason] = useState("");

  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Reserva cancelada com sucesso!");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Compute cancellation eligibility for each booking
  const cancellationWindowMs = (policy?.cancellationWindowMinutes ?? 720) * 60 * 1000;

  const getRefundInfo = (startTime: Date | string) => {
    const now = Date.now();
    const start = new Date(startTime).getTime();
    const msUntil = start - now;
    const windowMs = cancellationWindowMs;
    if (msUntil <= 0) return { canCancel: false, label: "Reserva já iniciada" };
    if (msUntil < windowMs) {
      const hoursLeft = Math.floor(msUntil / 3600000);
      const minWindow = Math.floor(windowMs / 3600000);
      return { canCancel: false, label: `Cancelamento bloqueado (mín. ${minWindow}h de antecedência, faltam ${hoursLeft}h)` };
    }
    return { canCancel: true, label: null };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: FOREST_DARK }}>Minhas Reservas</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus agendamentos e atendimentos</p>
          </div>
          <Button asChild style={{ backgroundColor: TERRACOTTA, color: "white" }}>
            <Link href="/rooms">
              <Plus className="mr-2 h-4 w-4" />
              Nova Reserva
            </Link>
          </Button>
        </div>

        {/* Policy banner */}
        {policy && (
          <div className="flex items-start gap-2 text-xs text-[#7C5C4A] bg-[#EDE8E3] rounded-lg px-4 py-3">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Política de cancelamento:</strong> cancelamentos devem ser feitos com pelo menos{" "}
              <strong>{policy.cancellationWindowMinutes >= 60
                ? `${Math.floor(policy.cancellationWindowMinutes / 60)}h`
                : `${policy.cancellationWindowMinutes}min`}</strong>{" "}
              de antecedência. Tolerância de atraso: <strong>{policy.lateArrivalToleranceMinutes} min</strong>.
            </span>
          </div>
        )}

        {/* Bookings list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map(booking => {
              const st = STATUS_MAP[booking.status] ?? STATUS_MAP.draft;
              const isOpen = expanded.has(booking.id);
              const { canCancel, label: blockLabel } = getRefundInfo(booking.startTime);
              const canCancelStatus = booking.status === "pending_payment" || booking.status === "confirmed";

              return (
                <Card key={booking.id} className="overflow-hidden border border-[#D8D0C8]">
                  <CardContent className="p-0">
                    {/* Main row */}
                    <div className="flex items-start gap-4 p-5">
                      {/* Color bar */}
                      <div className="w-1 self-stretch rounded-full shrink-0"
                        style={{ backgroundColor: booking.status === "confirmed" ? "#5A8A6A" : booking.status === "completed" ? "#5B8DB8" : booking.status.startsWith("cancel") ? "#B85B5B" : "#A89050" }} />

                      <div className="flex-1 min-w-0">
                        {/* Room + status */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-[#3D3D2E]">{(booking as any).room?.name || "Sala"}</span>
                          <Badge className={`text-xs flex items-center gap-1 ${st.className}`}>
                            {st.icon}{st.label}
                          </Badge>
                        </div>

                        {/* Date + time + price */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Data</p>
                            <p className="font-medium text-[#3D3D2E]">{fmtDate(booking.startTime)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Horário</p>
                            <p className="font-medium text-[#3D3D2E]">{fmt(booking.startTime)} – {fmt(booking.endTime)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Valor</p>
                            <p className="font-medium text-[#3D3D2E]">{formatCurrency(booking.totalPrice)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Paciente</p>
                            <p className="font-medium text-[#3D3D2E] truncate">{(booking as any).patientName || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                          onClick={() => toggleExpand(booking.id)}>
                          Atendimentos
                          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>

                        {canCancelStatus && (
                          canCancel ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm"
                                  className="h-7 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  disabled={cancelMutation.isPending}>
                                  <X className="h-3 w-3 mr-1" />Cancelar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza? Dependendo das regras de reembolso, um crédito pode ser gerado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-2">
                                  <Label className="text-sm">Motivo (opcional)</Label>
                                  <Input className="mt-1" placeholder="Ex: Paciente desmarcou" value={cancelReason}
                                    onChange={e => setCancelReason(e.target.value)} />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Manter</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => cancelMutation.mutate({ id: booking.id, reason: cancelReason || undefined })}>
                                    Cancelar reserva
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <div className="text-xs text-muted-foreground text-right max-w-[160px] leading-tight">
                              <AlertCircle className="h-3 w-3 inline mr-1 text-orange-500" />
                              {blockLabel}
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Appointments panel */}
                    {isOpen && (
                      <div className="px-5 pb-5">
                        <AppointmentsPanel
                          bookingId={booking.id}
                          bookingStart={new Date(booking.startTime)}
                          bookingEnd={new Date(booking.endTime)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma reserva encontrada</p>
              <p className="text-muted-foreground mb-4">Você ainda não fez nenhuma reserva</p>
              <Button asChild style={{ backgroundColor: TERRACOTTA, color: "white" }}>
                <Link href="/rooms">
                  <Plus className="mr-2 h-4 w-4" />
                  Fazer Primeira Reserva
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
