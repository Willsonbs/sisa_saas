import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, X, CheckCircle2, AlertCircle,
  UserX, Info, Clock, Calendar, MapPin, User, Phone, FileText, Users, Edit2
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

// ─── Palette ─────────────────────────────────────────────────────────────────
const HOUR_COL_BG   = "bg-[#EDE8E3]";
const HOUR_COL_TEXT = "text-[#7C5C4A]";
const DAY_HDR_BG    = "bg-[#3D3D2E]";
const DAY_HDR_TEXT  = "text-[#C8C4BE]";
const TERRACOTTA    = "#7C5C4A";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_PT   = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ─── Status ───────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  confirmed:             "bg-[#5A8A6A] text-white",
  completed:             "bg-[#5B8DB8] text-white",
  canceled_with_credit:  "bg-[#C8924A] text-white",
  no_show:               "bg-[#8A8A8A] text-white",
  pending_payment:       "bg-[#A89050] text-white",
  draft:                 "bg-[#B0A898] text-white",
};
const STATUS_LABEL: Record<string, string> = {
  confirmed:             "Confirmada",
  completed:             "Concluída",
  canceled_with_credit:  "Cancelada c/ crédito",
  no_show:               "No-show",
  pending_payment:       "Aguard. pagamento",
  draft:                 "Rascunho",
};

// Status dos atendimentos (sub-registros de paciente dentro de uma reserva).
// Recepção pode alterar apenas o status de cada um; nome/telefone/observações
// do paciente continuam exclusivos do profissional.
const APPT_STATUS_MAP: Record<string, { label: string; className: string }> = {
  scheduled:  { label: "Agendado",   className: "bg-gray-100 text-gray-600" },
  confirmed:  { label: "Confirmado", className: "bg-green-100 text-green-700" },
  completed:  { label: "Concluído",  className: "bg-blue-100 text-blue-700" },
  cancelled:  { label: "Cancelado",  className: "bg-red-100 text-red-600" },
  no_show:    { label: "No-show",    className: "bg-orange-100 text-orange-700" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addDays(d: Date, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmt(d: Date | string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00
const COLS_PER_PAGE = 4;

// ─── Booking chip ─────────────────────────────────────────────────────────────
function BookingChip({ booking, onClick }: { booking: any; onClick: () => void }) {
  const colorClass = STATUS_COLOR[booking.status] ?? "bg-gray-400 text-white";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded px-1.5 py-1 text-[10px] leading-tight ${colorClass} hover:opacity-80 transition-opacity`}
    >
      <div className="font-semibold truncate">{booking.professionalName}</div>
      {booking.patientName && (
        <div className="opacity-90 truncate text-[9px]">Pac: {booking.patientName}</div>
      )}
      <div className="opacity-70 truncate">{fmt(booking.startTime)}-{fmt(booking.endTime)}</div>
    </button>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function BookingDetailDialog({
  booking,
  onClose,
  onRefresh,
  pixKey,
}: {
  booking: any | null;
  onClose: () => void;
  onRefresh: () => void;
  pixKey?: string | null;
}) {
  const utils = trpc.useUtils();
  const [cancelReason, setCancelReason] = useState("");

  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => { toast.success("Reserva cancelada!"); onRefresh(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const noShowMutation = trpc.noShow.register.useMutation({
    onSuccess: () => { toast.success("No-show registrado!"); onRefresh(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const completeMutation = trpc.noShow.complete.useMutation({
    onSuccess: () => { toast.success("Reserva marcada como concluída!"); onRefresh(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const confirmPaymentMutation = trpc.bookings.confirmManualPayment.useMutation({
    onSuccess: () => { toast.success("Pagamento confirmado! Reserva confirmada."); onRefresh(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  // Atendimentos (sub-registros de paciente) da reserva, quando o
  // profissional dividiu a reserva em vários atendimentos. Quando existe
  // pelo menos 1, a recepção vê a lista com status individual em vez do
  // nome único da reserva.
  const { data: appts = [] } = trpc.appointments.listByBooking.useQuery(
    { bookingId: booking?.id ?? 0 },
    { enabled: !!booking }
  );
  const updateApptMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Status do atendimento atualizado!");
      utils.appointments.listByBooking.invalidate({ bookingId: booking?.id });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!booking) return null;

  const st = STATUS_LABEL[booking.status] ?? booking.status;
  const colorClass = STATUS_COLOR[booking.status] ?? "bg-gray-400 text-white";
  const hasAppointments = appts.length > 0;
  const canCancel = booking.status === "confirmed" || booking.status === "pending_payment";
  // Quando a reserva tem atendimentos individuais, o status de cada um é
  // controlado separadamente (abaixo); os botões de concluir/no-show da
  // reserva inteira somem para não conflitar com o status por atendimento.
  const canNoShow = booking.status === "confirmed" && !hasAppointments;
  const canComplete = booking.status === "confirmed" && !hasAppointments;
  const isPendingPayment = booking.status === "pending_payment";

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Reserva #{booking.id}</span>
            <Badge className={`text-xs ${colorClass}`}>{st}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-[#3D3D2E]">{booking.roomName}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-[#3D3D2E]">{booking.professionalName}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-[#3D3D2E]">{fmtDate(booking.startTime)}</p>
              <p className="text-muted-foreground">{fmt(booking.startTime)} – {fmt(booking.endTime)}</p>
            </div>
          </div>
          {hasAppointments ? (
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <p className="text-xs text-muted-foreground">Atendimentos ({appts.length})</p>
                {appts.map(appt => {
                  const ast = APPT_STATUS_MAP[appt.status] ?? APPT_STATUS_MAP.scheduled;
                  return (
                    <div key={appt.id} className="flex items-center justify-between bg-[#F5F3EF] rounded-md px-2 py-1.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[#7C5C4A] font-medium shrink-0">
                          {fmt(appt.startTime)}–{fmt(appt.endTime)}
                        </span>
                        <span className="text-[#3D3D2E] truncate">{appt.patientName || "—"}</span>
                      </div>
                      <Select
                        value={appt.status}
                        onValueChange={v => updateApptMutation.mutate({ id: appt.id, bookingId: booking.id, status: v as any })}
                      >
                        <SelectTrigger className={`h-6 w-auto text-[10px] px-1.5 border-0 gap-1 ${ast.className}`}>
                          <Edit2 className="h-2.5 w-2.5" />
                          {ast.label}
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(APPT_STATUS_MAP).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : booking.patientName && (
            <div className="flex items-start gap-2">
              <UserX className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium text-[#3D3D2E]">{booking.patientName}</p>
                {booking.patientPhone && <p className="text-muted-foreground">{booking.patientPhone}</p>}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="font-medium text-[#3D3D2E]">{formatCurrency(booking.totalPrice)}</p>
            </div>
          </div>
          {isPendingPayment && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-xs">
              <p className="font-semibold text-amber-800">Aguardando pagamento manual (PIX)</p>
              {pixKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded px-2 py-1 truncate">{pixKey}</code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    onClick={() => { navigator.clipboard.writeText(pixKey); toast.success("Chave PIX copiada!"); }}
                  >
                    Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-amber-700">Nenhuma chave PIX cadastrada em Configurações.</p>
              )}
              <p className="text-amber-700">Envie a chave e o valor ({formatCurrency(booking.totalPrice)}) para o profissional. Quando o pagamento cair, confirme abaixo.</p>
            </div>
          )}
          {booking.receptionNotes && (
            <div className="bg-[#F5F3EF] rounded p-2 text-xs text-[#3D3D2E]">
              <span className="font-semibold">Obs. recepção:</span> {booking.receptionNotes}
            </div>
          )}
          {booking.cancellationReason && (
            <div className="bg-red-50 rounded p-2 text-xs text-red-700">
              <span className="font-semibold">Motivo cancelamento:</span> {booking.cancellationReason}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isPendingPayment && (
            <Button size="sm" className="bg-[#5A8A6A] hover:bg-[#4a7658] text-white"
              onClick={() => confirmPaymentMutation.mutate({ bookingId: booking.id })}
              disabled={confirmPaymentMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Marcar como Paga
            </Button>
          )}
          {canComplete && (
            <Button size="sm" className="bg-[#5B8DB8] hover:bg-[#4a7aa5] text-white"
              onClick={() => completeMutation.mutate({ bookingId: booking.id })}
              disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Concluir
            </Button>
          )}
          {canNoShow && (
            <Button size="sm" variant="outline" className="text-gray-600"
              onClick={() => noShowMutation.mutate({ bookingId: booking.id })}
              disabled={noShowMutation.isPending}>
              <UserX className="h-4 w-4 mr-1" />No-show
            </Button>
          )}
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <X className="h-4 w-4 mr-1" />Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar reserva #{booking.id}</AlertDialogTitle>
                  <AlertDialogDescription>
                    O admin pode cancelar qualquer reserva independente da política de antecedência.
                    O reembolso seguirá as regras de cancelamento configuradas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                  <Label className="text-sm">Motivo</Label>
                  <Input className="mt-1" placeholder="Informe o motivo do cancelamento" value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)} />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => cancelMutation.mutate({ id: booking.id, reason: cancelReason || "Cancelado pelo administrador" })}>
                    Confirmar cancelamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create booking for professional (recepção clica numa célula vazia) ───────
type Slot = { roomId: number; roomName: string; pricePerHour: number; startTime: Date; endTime: Date };

function CreateBookingDialog({
  slot,
  onClose,
  onCreated,
  pixKey,
}: {
  slot: Slot | null;
  onClose: () => void;
  onCreated: () => void;
  pixKey?: string | null;
}) {
  const { data: professionals = [] } = trpc.reception.professionals.useQuery();
  const [professionalId, setProfessionalId] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [patientName, setPatientName] = useState("");
  const [result, setResult] = useState<{ bookingId: number; totalPrice: number; professionalName: string } | null>(null);

  useMemo(() => {
    if (slot) {
      setStartTime(toLocalInputValue(slot.startTime));
      setEndTime(toLocalInputValue(new Date(slot.startTime.getTime() + 60 * 60000)));
      setProfessionalId("");
      setPatientName("");
      setResult(null);
    }
  }, [slot]);

  const createMutation = trpc.bookings.createForProfessional.useMutation({
    onSuccess: (data) => {
      toast.success("Reserva criada! Aguardando pagamento.");
      setResult({ bookingId: data.bookingId, totalPrice: data.totalPrice, professionalName: data.professionalName || "" });
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });
  const confirmPaymentMutation = trpc.bookings.confirmManualPayment.useMutation({
    onSuccess: () => { toast.success("Pagamento confirmado! Reserva confirmada."); onCreated(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  if (!slot) return null;
  const currentSlot = slot;

  const durationHours = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);
  const estimatedPrice = durationHours > 0 ? Math.ceil(durationHours * currentSlot.pricePerHour) : 0;

  function handleSubmit() {
    if (!professionalId) { toast.error("Selecione o profissional."); return; }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) { toast.error("O horário final precisa ser depois do inicial."); return; }
    createMutation.mutate({
      professionalId: Number(professionalId),
      roomId: currentSlot.roomId,
      startTime: start,
      endTime: end,
      patientName: patientName.trim() || undefined,
    });
  }

  return (
    <Dialog open={!!slot} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? "Reserva criada" : `Nova reserva — ${slot.roomName}`}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3 text-sm">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                <SelectContent>
                  {professionals.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome do paciente <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Se já souber, informe aqui" />
            </div>
            {estimatedPrice > 0 && (
              <p className="text-xs text-muted-foreground">Valor estimado: <span className="font-medium text-[#3D3D2E]">{formatCurrency(estimatedPrice)}</span></p>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-[#3D3D2E]">
              Reserva de <span className="font-medium">{result.professionalName}</span> criada, aguardando pagamento.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-xs">
              <p className="font-semibold text-amber-800">Envie a chave PIX para o profissional</p>
              {pixKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded px-2 py-1 truncate">{pixKey}</code>
                  <Button
                    type="button" size="sm" variant="outline" className="h-7 text-xs shrink-0"
                    onClick={() => { navigator.clipboard.writeText(pixKey); toast.success("Chave PIX copiada!"); }}
                  >
                    Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-amber-700">Nenhuma chave PIX cadastrada em Configurações.</p>
              )}
              <p className="text-amber-700">Valor: <span className="font-medium">{formatCurrency(result.totalPrice)}</span></p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {!result ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createMutation.isPending} className="bg-[#7C5C4A] hover:bg-[#6a4e3e] text-white">
                Criar reserva
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
              <Button size="sm" className="bg-[#5A8A6A] hover:bg-[#4a7658] text-white"
                onClick={() => confirmPaymentMutation.mutate({ bookingId: result.bookingId })}
                disabled={confirmPaymentMutation.isPending}>
                Já recebi o PIX — Marcar como Paga
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminBookings() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [anchor, setAnchor] = useState(today);
  const [roomPage, setRoomPage] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const { data: tenant } = trpc.tenants.current.useQuery();

  const dayStart = useMemo(() => { const d = new Date(anchor); d.setHours(0,0,0,0); return d; }, [anchor]);
  const dayEnd   = useMemo(() => { const d = new Date(anchor); d.setHours(23,59,59,999); return d; }, [anchor]);

  const { data: bookings = [], isLoading, refetch } = trpc.admin.listAllBookings.useQuery(
    { startDate: dayStart, endDate: dayEnd },
    { refetchOnWindowFocus: false }
  );
  const { data: rooms = [] } = trpc.rooms.list.useQuery({ includeInactive: false });

  const pagedRooms = useMemo(() => {
    const start = roomPage * COLS_PER_PAGE;
    return rooms.slice(start, start + COLS_PER_PAGE);
  }, [rooms, roomPage]);

  const totalPages = Math.ceil(rooms.length / COLS_PER_PAGE);

  const isToday = sameDay(anchor, today);
  const monthLabel = `${MONTHS_PT[anchor.getMonth()]} ${anchor.getFullYear()}`;
  const dayLabel = `${DAYS_PT[anchor.getDay()]}, ${anchor.getDate().toString().padStart(2,"0")}/${(anchor.getMonth()+1).toString().padStart(2,"0")}`;

  // Bookings indexed by roomId → hour
  const bookingMap = useMemo(() => {
    const map: Record<number, Record<number, any[]>> = {};
    for (const b of bookings) {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      if (!sameDay(start, anchor) && !sameDay(end, anchor)) continue;
      const h = start.getHours();
      if (!map[b.roomId]) map[b.roomId] = {};
      if (!map[b.roomId][h]) map[b.roomId][h] = [];
      map[b.roomId][h].push(b);
    }
    return map;
  }, [bookings, anchor]);

  const nowHour = new Date().getHours();

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#3D3D2E]">Gerenciar Reservas</h1>
            <p className="text-sm text-muted-foreground">{monthLabel} · {bookings.length} reserva{bookings.length !== 1 ? "s" : ""} no dia</p>
          </div>
          {/* Date nav */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setAnchor(d => addDays(d, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs px-3"
              onClick={() => setAnchor(today)}>
              Hoje
            </Button>
            <span className="text-sm font-medium text-[#3D3D2E] min-w-[120px] text-center">{dayLabel}</span>
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setAnchor(d => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <span key={k} className={`px-2 py-0.5 rounded-full ${STATUS_COLOR[k]}`}>{v}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="border border-[#D8D0C8] rounded-xl overflow-hidden">
          {/* Column headers */}
          <div className={`grid ${DAY_HDR_BG}`}
            style={{ gridTemplateColumns: `56px repeat(${COLS_PER_PAGE}, 1fr)` }}>
            {/* Hour col header */}
            <div className={`${HOUR_COL_BG} border-r border-[#D8D0C8] flex items-center justify-center py-2`}>
              <Clock className="h-3.5 w-3.5 text-[#7C5C4A]" />
            </div>
            {/* Room headers */}
            {pagedRooms.map(room => (
              <div key={room.id}
                className={`${DAY_HDR_BG} ${DAY_HDR_TEXT} text-center py-3 px-2 border-r border-[#4A4A3A] last:border-r-0`}>
                <p className="text-xs font-semibold truncate">{room.name}</p>
              </div>
            ))}
            {/* Fill empty columns */}
            {Array.from({ length: COLS_PER_PAGE - pagedRooms.length }).map((_, i) => (
              <div key={`empty-hdr-${i}`} className={`${DAY_HDR_BG} border-r border-[#4A4A3A] last:border-r-0`} />
            ))}
          </div>

          {/* Hour rows */}
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Carregando reservas...
            </div>
          ) : (
            HOURS.map(hour => {
              const isPast = isToday && hour < nowHour;
              return (
                <div key={hour}
                  className={`grid border-t border-[#D8D0C8] ${isPast ? "opacity-50" : ""}`}
                  style={{ gridTemplateColumns: `56px repeat(${COLS_PER_PAGE}, 1fr)`, minHeight: 52 }}>
                  {/* Hour label */}
                  <div className={`${HOUR_COL_BG} ${HOUR_COL_TEXT} border-r border-[#D8D0C8] flex items-start justify-center pt-1.5`}>
                    <span className="text-xs font-mono font-medium">{String(hour).padStart(2,"0")}:00</span>
                  </div>
                  {/* Room cells */}
                  {pagedRooms.map(room => {
                    const cellBookings = bookingMap[room.id]?.[hour] ?? [];
                    const isEmpty = cellBookings.length === 0;
                    const canCreate = isEmpty && !isPast;
                    return (
                      <div key={room.id}
                        className={`border-r border-[#D8D0C8] last:border-r-0 p-1 space-y-1 min-h-[52px] ${canCreate ? "cursor-pointer hover:bg-[#F5F3EF] transition-colors" : ""}`}
                        onClick={canCreate ? () => {
                          const startTime = new Date(anchor);
                          startTime.setHours(hour, 0, 0, 0);
                          setSelectedSlot({ roomId: room.id, roomName: room.name, pricePerHour: room.pricePerHour, startTime, endTime: new Date(startTime.getTime() + 60 * 60000) });
                        } : undefined}
                        title={canCreate ? "Clique para criar uma reserva neste horário" : undefined}
                      >
                        {cellBookings.map(b => (
                          <BookingChip key={b.id} booking={b} onClick={() => setSelectedBooking(b)} />
                        ))}
                      </div>
                    );
                  })}
                  {/* Fill empty columns */}
                  {Array.from({ length: COLS_PER_PAGE - pagedRooms.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-[#D8D0C8] last:border-r-0" />
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={roomPage === 0}
              onClick={() => setRoomPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Salas {roomPage * COLS_PER_PAGE + 1}–{Math.min((roomPage + 1) * COLS_PER_PAGE, rooms.length)} de {rooms.length}
            </span>
            <Button variant="outline" size="sm" disabled={roomPage >= totalPages - 1}
              onClick={() => setRoomPage(p => p + 1)}>
              Próximas<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <BookingDetailDialog
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onRefresh={refetch}
        pixKey={tenant?.pixKey}
      />

      {/* Criar reserva em nome de um profissional (célula vazia clicada) */}
      <CreateBookingDialog
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        onCreated={refetch}
        pixKey={tenant?.pixKey}
      />
    </DashboardLayout>
  );
}
