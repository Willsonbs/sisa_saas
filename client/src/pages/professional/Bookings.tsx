import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Calendar, Clock, MapPin, X, Plus, ChevronDown, ChevronUp,
  Users, AlertCircle, CheckCircle2, Info, Zap, Trash2, Edit2, Building2,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";

// ─── Palette ────────────────────────────────────────────────────────────────
const TERRACOTTA = "#7C5C4A";
const FOREST_DARK = "#3D3D2E";
const WARM_BG = "#F5F3EF";

// Colunas da lista de reservas: barra de status, Sala, Data/Horário,
// Paciente, Valor, Status, Atendimentos, Cancelar. Cabeçalho e linhas usam
// exatamente o mesmo template, pra garantir alinhamento entre eles.
// "Atendimentos" e "Cancelar" ficam em colunas próprias (não um flex
// compartilhado) pra não pular de posição quando um dos dois some.
const BOOKING_ROW_COLS = "10px 1fr 1.5fr 1fr 0.8fr 1fr auto auto";

// ─── Status helpers ──────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  draft:              { label: "Rascunho",          className: "bg-gray-100 text-gray-600",   icon: <Info className="h-3 w-3" /> },
  pending_payment:    { label: "Aguard. pagamento", className: "bg-yellow-100 text-yellow-700", icon: <AlertCircle className="h-3 w-3" /> },
  confirmed:          { label: "Confirmada",        className: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3 w-3" /> },
  canceled_with_credit:{ label: "Cancelada c/ crédito", className: "bg-orange-100 text-orange-700", icon: <X className="h-3 w-3" /> },
  no_show:            { label: "No-show",           className: "bg-red-100 text-red-600",     icon: <X className="h-3 w-3" /> },
  completed:          { label: "Concluída",         className: "bg-blue-100 text-blue-700",   icon: <CheckCircle2 className="h-3 w-3" /> },
};

function fmt(d: Date | string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtShortDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR");
}
// Formato compacto de uma linha só, ex: "24/07/2026 12:00–14:00"
function fmtDateTime(start: Date | string, end: Date | string) {
  return `${fmtShortDate(start)} ${fmt(start)}–${fmt(end)}`;
}

// ─── Appointment panel ───────────────────────────────────────────────────────
const BLANK_APPT_FORM = { patientName: "", patientPhone: "", notes: "", startTime: "", endTime: "" };
const BLANK_EDIT_FORM = { patientName: "", patientPhone: "", notes: "" };

// Visão do profissional: aqui não existe status (Agendado/Confirmado/
// Cancelado/No-show) -- isso só faz sentido pra recepção (relação
// profissional x empresa que aluga a sala). O acordo profissional x paciente
// está fora do escopo do sistema. O profissional só precisa ver/editar
// horário e dados do paciente de cada atendimento.
function AppointmentsPanel({ bookingId, bookingStart, bookingEnd }: {
  bookingId: number;
  bookingStart: Date;
  bookingEnd: Date;
}) {
  const utils = trpc.useUtils();
  const { data: appts = [], isLoading } = trpc.appointments.listByBooking.useQuery({ bookingId });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAppt, setNewAppt] = useState(BLANK_APPT_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(BLANK_EDIT_FORM);

  const invalidate = () => utils.appointments.listByBooking.invalidate({ bookingId });

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Atendimento adicionado!");
      invalidate();
      setShowAddForm(false);
      setNewAppt(BLANK_APPT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Atendimento atualizado!");
      invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      toast.success("Atendimento removido!");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const generateMutation = trpc.appointments.generateFromBooking.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.slots} atendimentos gerados automaticamente! Agora é só preencher o paciente de cada um.`);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Sempre abre o formulário de "Adicionar" em branco -- antes, cancelar não
  // limpava o estado, então reabrir mostrava o último horário digitado.
  const openAddForm = () => {
    setNewAppt(BLANK_APPT_FORM);
    setShowAddForm(true);
  };
  const closeAddForm = () => {
    setShowAddForm(false);
    setNewAppt(BLANK_APPT_FORM);
  };

  const openEditForm = (appt: any) => {
    setEditingId(appt.id);
    setEditForm({
      patientName: appt.patientName || "",
      patientPhone: appt.patientPhone || "",
      notes: appt.notes || "",
    });
  };
  const closeEditForm = () => {
    setEditingId(null);
    setEditForm(BLANK_EDIT_FORM);
  };

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

  const handleSaveEdit = (id: number) => {
    updateMutation.mutate({
      id,
      bookingId,
      patientName: editForm.patientName || undefined,
      patientPhone: editForm.patientPhone || undefined,
      notes: editForm.notes || undefined,
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
            onClick={() => (showAddForm ? closeAddForm() : openAddForm())}
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
            <Button variant="outline" size="sm" onClick={closeAddForm}>Cancelar</Button>
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
          {appts.map(appt => (
            <div key={appt.id} className="bg-[#F5F3EF] rounded-md px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#7C5C4A] font-medium">
                    {fmt(appt.startTime)} – {fmt(appt.endTime)}
                  </span>
                  <span className="text-[#3D3D2E]">{appt.patientName || "Sem paciente informado"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => (editingId === appt.id ? closeEditForm() : openEditForm(appt))}>
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => deleteMutation.mutate({ id: appt.id })}>
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>

              {editingId === appt.id && (
                <div className="mt-2 space-y-2 border-t border-[#E5E0D8] pt-2">
                  <Input placeholder="Nome do paciente" className="h-8 text-sm bg-white" value={editForm.patientName}
                    onChange={e => setEditForm(p => ({ ...p, patientName: e.target.value }))} />
                  <Input placeholder="Telefone (opcional)" className="h-8 text-sm bg-white" value={editForm.patientPhone}
                    onChange={e => setEditForm(p => ({ ...p, patientPhone: e.target.value }))} />
                  <Textarea placeholder="Observações" className="text-sm min-h-[60px] bg-white" value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={closeEditForm}>Cancelar</Button>
                    <Button size="sm" onClick={() => handleSaveEdit(appt.id)} disabled={updateMutation.isPending}
                      style={{ backgroundColor: TERRACOTTA, color: "white" }}>
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Bookings() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const { data: bookings, isLoading, refetch } = trpc.bookings.list.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: rooms = [] } = trpc.rooms.list.useQuery({ includeInactive: false });
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

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    if (roomFilter === "all") return bookings;
    return bookings.filter((b) => (b as any).room?.id === Number(roomFilter));
  }, [bookings, roomFilter]);

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

        {/* Filtro de período */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">De</span>
          <Input
            type="date"
            className="h-8 w-auto text-sm"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            className="h-8 w-auto text-sm"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
          <Select value={roomFilter} onValueChange={setRoomFilter}>
            <SelectTrigger className="h-8 w-full sm:w-[180px] text-sm">
              <Building2 className="h-3.5 w-3.5 text-gray-400 mr-1" />
              <SelectValue placeholder="Todas as salas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as salas</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(dateFrom || dateTo || roomFilter !== "all") && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); setRoomFilter("all"); }}>
              Limpar
            </Button>
          )}
        </div>

        {/* Bookings list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="border border-[#D8D0C8] rounded-lg overflow-x-auto">
            {/* Cabeçalho, só em telas maiores. Mesmo template de colunas da linha,
                pra garantir alinhamento exato entre cabeçalho e conteúdo. */}
            <div className="hidden sm:grid gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground bg-[#F5F3EF] border-b border-[#D8D0C8] items-center min-w-[720px]"
              style={{ gridTemplateColumns: BOOKING_ROW_COLS }}>
              <span />
              <span>Sala</span>
              <span>Data / Horário</span>
              <span>Paciente</span>
              <span>Valor</span>
              <span>Status</span>
              <span />
              <span className="text-right">Ações</span>
            </div>
            {filteredBookings.map((booking, idx) => {
              const st = STATUS_MAP[booking.status] ?? STATUS_MAP.draft;
              const isOpen = expanded.has(booking.id);
              const { canCancel, label: blockLabel } = getRefundInfo(booking.startTime);
              const canCancelStatus = booking.status === "pending_payment" || booking.status === "confirmed";

              const barColor = booking.status === "confirmed" ? "#5A8A6A" : booking.status === "completed" ? "#5B8DB8" : booking.status.startsWith("cancel") ? "#B85B5B" : "#A89050";

              return (
                <div key={booking.id} className={idx > 0 ? "border-t border-[#D8D0C8]" : ""}>
                  {/* Linha compacta - mesmo grid do cabeçalho */}
                  <div className="grid gap-3 px-4 py-2.5 items-center text-sm min-w-[720px]"
                    style={{ gridTemplateColumns: BOOKING_ROW_COLS }}>
                    <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: barColor }} />

                    <span className="font-medium text-[#3D3D2E] truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0 sm:hidden" />
                      {(booking as any).room?.name || "Sala"}
                    </span>
                    <span className="text-[#3D3D2E] whitespace-nowrap">
                      {fmtDateTime(booking.startTime, booking.endTime)}
                    </span>
                    <span className="text-[#3D3D2E] truncate">{(booking as any).patientName || "—"}</span>
                    <span className="text-[#3D3D2E]">{formatCurrency(booking.totalPrice)}</span>
                    <Badge className={`text-xs flex items-center gap-1 w-fit ${st.className}`}>
                      {st.icon}{st.label}
                    </Badge>

                    {/* Atendimentos: coluna própria, sempre na mesma posição */}
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 justify-self-end"
                      onClick={() => toggleExpand(booking.id)}>
                      Atendimentos
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>

                    {/* Cancelar: coluna própria também, sempre na mesma posição -
                        vira botão, ícone de motivo (tooltip) ou nada, mas nunca
                        empurra o "Atendimentos" ao lado. */}
                    <div className="justify-self-end">
                      {canCancelStatus && canCancel && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm"
                              className="h-7 text-xs text-red-600 bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-700 px-2"
                              disabled={cancelMutation.isPending}>
                              <X className="h-3 w-3 mr-1" />
                              Cancelar
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
                      )}
                      {canCancelStatus && !canCancel && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex h-7 w-7 items-center justify-center text-orange-500 cursor-default">
                              <AlertCircle className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-[220px]">{blockLabel}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Appointments panel */}
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <AppointmentsPanel
                        bookingId={booking.id}
                        bookingStart={new Date(booking.startTime)}
                        bookingEnd={new Date(booking.endTime)}
                      />
                    </div>
                  )}
                </div>
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
