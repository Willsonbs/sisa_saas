import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

// ─── PT-BR locale helpers ────────────────────────────────────────────────────
const DAYS_PT_SHORT  = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT_FULL = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function startOfWeek(d: Date) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function addDays(d: Date, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function fmtDatetime(d: Date) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${fmtTime(d)}`;
}

// ─── Status colours (SISA palette) ───────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  confirmed:            "bg-[#5B8DB8] text-white",
  completed:            "bg-[#5A8A6A] text-white",
  cancelled:            "bg-[#B85B5B] text-white",
  canceled_with_credit: "bg-[#C8924A] text-white",
  no_show:              "bg-[#8A8A8A] text-white",
  pending_payment:      "bg-[#A89050] text-white",
};
const STATUS_LABEL: Record<string, string> = {
  confirmed:            "Confirmada",
  completed:            "Concluída",
  cancelled:            "Cancelada",
  canceled_with_credit: "Cancelada c/ crédito",
  no_show:              "No-show",
  pending_payment:      "Aguardando pagamento",
};

// ─── Palette tokens (matching AdminCalendar) ──────────────────────────────────
const HOUR_COL_BG   = "bg-[#EDE8E3]";
const HOUR_COL_TEXT = "text-[#7C5C4A]";
const DAY_HDR_BG    = "bg-[#3D3D2E]";
const DAY_HDR_TEXT  = "text-[#C8C4BE]";
const DAY_HDR_TODAY = "text-[#F5F3EF]";
const TODAY_CELL_BG = "bg-[#7C5C4A]/5";

export default function CalendarPage() {
  const [view, setView]     = useState<"week"|"day">("week");
  const [anchor, setAnchor] = useState(() => { const d=new Date(); d.setHours(0,0,0,0); return d; });

  // Dialog: new booking from slot click
  const [slotDialog, setSlotDialog]   = useState<{day:Date; hour:number}|null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [patientName, setPatientName]       = useState("");
  const [privateNotes, setPrivateNotes]     = useState("");

  // Dialog: booking detail on block click
  const [detailBooking, setDetailBooking] = useState<any>(null);

  const { data: rooms = [] } = trpc.rooms.list.useQuery({ includeInactive: false });
  const { data: bookings = [], refetch } = trpc.bookings.list.useQuery();

  const createMutation = trpc.bookings.create.useMutation({
    onSuccess: () => {
      toast.success("Reserva criada com sucesso!");
      setSlotDialog(null);
      setSelectedRoomId("");
      setPatientName("");
      setPrivateNotes("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Reserva cancelada!");
      setDetailBooking(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Navigation ────────────────────────────────────────────────────────────
  function navigate(dir: -1|1) { setAnchor(prev => addDays(prev, dir*(view==="week"?7:1))); }
  function goToday() { const d=new Date(); d.setHours(0,0,0,0); setAnchor(d); }

  const days  = view==="week"
    ? Array.from({length:7},(_,i)=>addDays(startOfWeek(anchor),i))
    : [new Date(anchor)];
  const hours = Array.from({length:15},(_,i)=>i+7); // 07:00–21:00

  // ─── Header label ──────────────────────────────────────────────────────────
  const ws = startOfWeek(anchor);
  const headerLabel = view==="week"
    ? (() => {
        const s=ws, e=addDays(ws,6);
        const sm=MONTHS_PT_FULL[s.getMonth()], em=MONTHS_PT_FULL[e.getMonth()];
        return sm===em
          ? `${s.getDate()} a ${e.getDate()} de ${sm} de ${e.getFullYear()}`
          : `${s.getDate()} de ${sm} a ${e.getDate()} de ${em} de ${e.getFullYear()}`;
      })()
    : `${DAYS_PT_SHORT[anchor.getDay()]}, ${anchor.getDate()} de ${MONTHS_PT_FULL[anchor.getMonth()]} de ${anchor.getFullYear()}`;

  // ─── Map bookings by day+hour ───────────────────────────────────────────────
  const bookingsByDayHour = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    for (const b of bookings) {
      const start = new Date(b.startTime);
      const key   = `${start.toDateString()}_${start.getHours()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return map;
  }, [bookings]);

  const today = new Date(); today.setHours(0,0,0,0);

  // ─── Create booking from slot ───────────────────────────────────────────────
  function handleCreateBooking() {
    if (!slotDialog || !selectedRoomId || !patientName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const start = new Date(slotDialog.day);
    start.setHours(slotDialog.hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(slotDialog.hour + 1, 0, 0, 0);
    createMutation.mutate({ roomId: parseInt(selectedRoomId), startTime: start, endTime: end, patientName, privateNotes });
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Calendário de Reservas</h1>
          <p className="text-muted-foreground mt-1">Visualize e gerencie suas reservas. Clique em um horário vazio para criar uma nova reserva.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} className="font-semibold tracking-wide">HOJE</Button>
          <Button variant="ghost" size="icon" onClick={()=>navigate(-1)}><ChevronLeft className="h-4 w-4"/></Button>
          <Button variant="ghost" size="icon" onClick={()=>navigate(1)}><ChevronRight className="h-4 w-4"/></Button>
          <span className="text-sm font-medium min-w-[260px] capitalize">{headerLabel}</span>
          <div className="ml-auto flex border rounded-md overflow-hidden">
            {(["day","week"] as const).map(v=>(
              <button key={v} onClick={()=>setView(v)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  view===v ? "bg-[#3D3D2E] text-[#F5F3EF]" : "bg-background text-foreground hover:bg-muted"
                }`}>
                {v==="day"?"DIA":"SEMANA"}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_LABEL).map(([k,v])=>(
            <div key={k} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_COLOR[k]?.split(" ")[0]}`}/>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="border rounded-lg overflow-auto shadow-sm">
          <table className="w-full border-collapse text-sm" style={{minWidth: view==="week"?900:400}}>
            <thead>
              <tr>
                {/* Corner */}
                <th className={`w-16 border-b border-r ${HOUR_COL_BG} sticky left-0 z-20`}/>
                {/* Day headers */}
                {days.map(day=>{
                  const isToday=sameDay(day,today);
                  return (
                    <th key={day.toISOString()} className={`border-b border-r py-2 px-1 text-center ${DAY_HDR_BG}`}>
                      <div className={`text-[10px] uppercase tracking-widest font-medium ${isToday?DAY_HDR_TODAY:DAY_HDR_TEXT}`}>
                        {DAYS_PT_SHORT[day.getDay()]}
                      </div>
                      <div className={`text-base font-bold mt-0.5 ${isToday?"text-[#C8A882]":DAY_HDR_TEXT}`}>
                        {day.getDate()}/{String(day.getMonth()+1).padStart(2,"0")}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map(hour=>(
                <tr key={hour} className="h-14">
                  {/* Hour label */}
                  <td className={`border-b border-r ${HOUR_COL_BG} ${HOUR_COL_TEXT} text-[11px] font-medium
                                  text-right pr-2 pt-1 sticky left-0 z-10 align-top w-16 select-none`}>
                    {String(hour).padStart(2,"0")}:00
                  </td>
                  {/* Day cells */}
                  {days.map(day=>{
                    const key   = `${day.toDateString()}_${hour}`;
                    const slots = bookingsByDayHour[key] || [];
                    const isToday = sameDay(day,today);
                    return (
                      <td key={day.toISOString()}
                        className={`border-b border-r align-top p-0.5 cursor-pointer ${isToday?TODAY_CELL_BG:"bg-white"} hover:bg-[#7C5C4A]/5 transition-colors`}
                        onClick={()=>{ if(slots.length===0) setSlotDialog({day,hour}); }}>
                        {slots.map(b=>{
                          const colorClass = STATUS_COLOR[b.status]||"bg-[#5B8DB8] text-white";
                          return (
                            <div key={b.id}
                              className={`${colorClass} rounded px-1.5 py-0.5 mb-0.5 text-xs leading-tight cursor-pointer`}
                              onClick={e=>{ e.stopPropagation(); setDetailBooking(b); }}
                              title={`${b.room?.name}\n${fmtTime(new Date(b.startTime))} – ${fmtTime(new Date(b.endTime))}\n${STATUS_LABEL[b.status]||b.status}`}>
                              <div className="font-semibold truncate">{b.room?.name}</div>
                              <div className="opacity-90 truncate">{fmtTime(new Date(b.startTime))} – {fmtTime(new Date(b.endTime))}</div>
                              {b.patientName && <div className="opacity-80 truncate text-[10px]">{b.patientName}</div>}
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground text-right">
          {bookings.filter(b=>b.status==="confirmed").length} reserva(s) confirmada(s) no período
        </p>
      </div>

      {/* ── Dialog: nova reserva ─────────────────────────────────────────────── */}
      <Dialog open={!!slotDialog} onOpenChange={open=>!open&&setSlotDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Reserva</DialogTitle>
            <DialogDescription>
              {slotDialog && (
                <>
                  {DAYS_PT_SHORT[slotDialog.day.getDay()]}, {slotDialog.day.getDate()} de {MONTHS_PT_FULL[slotDialog.day.getMonth()]} — {String(slotDialog.hour).padStart(2,"0")}:00 às {String(slotDialog.hour+1).padStart(2,"0")}:00
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sala *</Label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma sala"/></SelectTrigger>
                <SelectContent>
                  {rooms.map(r=>(
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} — {formatCurrency(r.pricePerHour)}/h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Paciente *</Label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={patientName}
                onChange={e=>setPatientName(e.target.value)}
                placeholder="Nome completo do paciente"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações Privadas</Label>
              <Textarea value={privateNotes} onChange={e=>setPrivateNotes(e.target.value)}
                placeholder="Notas visíveis apenas para você" rows={3}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setSlotDialog(null)}>Cancelar</Button>
            <Button onClick={handleCreateBooking} disabled={createMutation.isPending}>
              {createMutation.isPending?"Criando...":"Criar Reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: detalhes da reserva ──────────────────────────────────────── */}
      <Dialog open={!!detailBooking} onOpenChange={open=>!open&&setDetailBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
          </DialogHeader>
          {detailBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Sala</span>
                  <p className="font-medium">{detailBooking.room?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium">{STATUS_LABEL[detailBooking.status]||detailBooking.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Início</span>
                  <p className="font-medium">{fmtDatetime(new Date(detailBooking.startTime))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Término</span>
                  <p className="font-medium">{fmtDatetime(new Date(detailBooking.endTime))}</p>
                </div>
                {detailBooking.patientName && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Paciente</span>
                    <p className="font-medium">{detailBooking.patientName}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Valor Total</span>
                  <p className="font-medium">{formatCurrency(detailBooking.totalPrice)}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setDetailBooking(null)}>Fechar</Button>
                {detailBooking.status==="confirmed" && (
                  <Button variant="destructive" onClick={()=>cancelMutation.mutate({id:detailBooking.id})}
                    disabled={cancelMutation.isPending}>
                    {cancelMutation.isPending?"Cancelando...":"Cancelar Reserva"}
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
