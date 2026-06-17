import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
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
/** Format time as "HH:MM" (24-hour, no AM/PM) */
function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ─── Status colours (SISA palette-aligned) ───────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  confirmed:            "bg-[#5B8DB8] text-white",   // steel-blue
  completed:            "bg-[#5A8A6A] text-white",   // forest-green
  cancelled:            "bg-[#B85B5B] text-white",   // muted-red
  canceled_with_credit: "bg-[#C8924A] text-white",   // warm-amber
  no_show:              "bg-[#8A8A8A] text-white",   // grey
  pending_payment:      "bg-[#A89050] text-white",   // golden
};
const STATUS_LABEL: Record<string, string> = {
  confirmed:            "Confirmada",
  completed:            "Concluída",
  cancelled:            "Cancelada",
  canceled_with_credit: "Cancelada c/ crédito",
  no_show:              "No-show",
  pending_payment:      "Aguardando pagamento",
};

// ─── Palette tokens (matching SISA sidebar) ───────────────────────────────────
// Hour column:    warm off-white background + terracotta text
// Day header row: forest-dark background + light text (same as sidebar)
const HOUR_COL_BG   = "bg-[#EDE8E3]";       // warm off-white
const HOUR_COL_TEXT = "text-[#7C5C4A]";      // terracotta
const DAY_HDR_BG    = "bg-[#3D3D2E]";        // forest-dark (sidebar bg)
const DAY_HDR_TEXT  = "text-[#C8C4BE]";      // sidebar muted text
const DAY_HDR_TODAY = "text-[#F5F3EF]";      // sidebar foreground
const TODAY_CELL_BG = "bg-[#7C5C4A]/5";      // very subtle terracotta tint

export default function AdminCalendar() {
  const [view, setView]         = useState<"week"|"day">("week");
  const [anchor, setAnchor]     = useState(() => { const d=new Date(); d.setHours(0,0,0,0); return d; });
  const [filterRoom, setFilterRoom] = useState<string>("all");

  const { weekStart, weekEnd } = useMemo(() => {
    if (view === "week") {
      const ws = startOfWeek(anchor);
      return { weekStart: ws, weekEnd: addDays(ws, 7) };
    }
    const d = new Date(anchor); d.setHours(0,0,0,0);
    return { weekStart: d, weekEnd: addDays(d, 1) };
  }, [anchor, view]);

  const { data: bookings = [], isLoading } = trpc.admin.listAllBookings.useQuery(
    { startDate: weekStart, endDate: weekEnd, roomId: filterRoom !== "all" ? parseInt(filterRoom) : undefined },
    { refetchOnWindowFocus: false }
  );
  const { data: rooms = [] } = trpc.rooms.list.useQuery({ includeInactive: false });

  const days  = view === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i))
    : [new Date(anchor)];
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 – 21:00

  function navigate(dir: -1 | 1) { setAnchor(prev => addDays(prev, dir * (view === "week" ? 7 : 1))); }
  function goToday() { const d = new Date(); d.setHours(0,0,0,0); setAnchor(d); }

  const bookingsByDay = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    for (const b of bookings) {
      const key = new Date(b.startTime).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(b);
    }
    return map;
  }, [bookings]);

  const today = new Date(); today.setHours(0,0,0,0);
  const ws = startOfWeek(anchor);

  // Header label: "14/06 a 20/06 — Junho 2025"
  const headerLabel = view === "week"
    ? (() => {
        const s = ws, e = addDays(ws, 6);
        const sm = MONTHS_PT_FULL[s.getMonth()], em = MONTHS_PT_FULL[e.getMonth()];
        const label = sm === em
          ? `${s.getDate()} a ${e.getDate()} de ${sm} de ${e.getFullYear()}`
          : `${s.getDate()} de ${sm} a ${e.getDate()} de ${em} de ${e.getFullYear()}`;
        return label;
      })()
    : `${DAYS_PT_SHORT[anchor.getDay()]}, ${anchor.getDate()} de ${MONTHS_PT_FULL[anchor.getMonth()]} de ${anchor.getFullYear()}`;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Calendário de Reservas</h1>
          <p className="text-muted-foreground mt-1">Visualize todas as reservas por prestador e sala</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} className="font-semibold tracking-wide">
            HOJE
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4"/>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4"/>
          </Button>
          <span className="text-sm font-medium min-w-[260px] capitalize">{headerLabel}</span>

          <div className="ml-auto flex items-center gap-2">
            <Select value={filterRoom} onValueChange={setFilterRoom}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Todas as salas"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as salas</SelectItem>
                {rooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex border rounded-md overflow-hidden">
              {(["day","week"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    view === v
                      ? "bg-[#3D3D2E] text-[#F5F3EF]"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}>
                  {v === "day" ? "DIA" : "SEMANA"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_COLOR[k]?.split(" ")[0]}`}/>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="border rounded-lg overflow-auto shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mr-2 animate-pulse"/> Carregando reservas...
            </div>
          ) : (
            <table className="w-full border-collapse text-sm" style={{ minWidth: view === "week" ? 900 : 400 }}>
              <thead>
                <tr>
                  {/* Top-left corner cell — same colour as hour column */}
                  <th className={`w-16 border-b border-r ${HOUR_COL_BG} sticky left-0 z-20`}/>

                  {/* Day header cells */}
                  {days.map(day => {
                    const isToday = sameDay(day, today);
                    return (
                      <th key={day.toISOString()}
                        className={`border-b border-r py-2 px-1 text-center ${DAY_HDR_BG}`}>
                        <div className={`text-[10px] uppercase tracking-widest font-medium ${isToday ? DAY_HDR_TODAY : DAY_HDR_TEXT}`}>
                          {DAYS_PT_SHORT[day.getDay()]}
                        </div>
                        <div className={`text-base font-bold mt-0.5 ${isToday ? "text-[#C8A882]" : DAY_HDR_TEXT}`}>
                          {day.getDate()}/{String(day.getMonth()+1).padStart(2,"0")}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {hours.map(hour => (
                  <tr key={hour} className="h-14">
                    {/* Hour label column — warm off-white, terracotta text, smaller font */}
                    <td className={`border-b border-r ${HOUR_COL_BG} ${HOUR_COL_TEXT} text-[11px] font-medium
                                    text-right pr-2 pt-1 sticky left-0 z-10 align-top w-16 select-none`}>
                      {String(hour).padStart(2,"0")}:00
                    </td>

                    {/* Day cells */}
                    {days.map(day => {
                      const dayKey      = day.toDateString();
                      const dayBookings = (bookingsByDay[dayKey] || []).filter(
                        b => new Date(b.startTime).getHours() === hour
                      );
                      const isToday = sameDay(day, today);
                      return (
                        <td key={day.toISOString()}
                          className={`border-b border-r align-top p-0.5 ${isToday ? TODAY_CELL_BG : "bg-white"}`}>
                          {dayBookings.map(b => {
                            const colorClass = STATUS_COLOR[b.status] || "bg-[#5B8DB8] text-white";
                            const start      = fmtTime(new Date(b.startTime));
                            const end        = fmtTime(new Date(b.endTime));
                            return (
                              <div key={b.id}
                                className={`${colorClass} rounded px-1.5 py-0.5 mb-0.5 text-xs leading-tight cursor-default`}
                                title={`${(b as any).professionalName}\n${(b as any).roomName}\n${start} – ${end}\n${STATUS_LABEL[b.status] || b.status}`}>
                                <div className="font-semibold truncate">{(b as any).professionalName}</div>
                                <div className="opacity-90 truncate">{start} – {end}</div>
                                {view === "day" && (
                                  <div className="opacity-80 truncate text-[10px]">{(b as any).roomName}</div>
                                )}
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
          )}
        </div>

        {!isLoading && (
          <p className="text-xs text-muted-foreground text-right">
            {bookings.filter(b => b.status === "confirmed").length} reserva(s) confirmada(s) no período
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
