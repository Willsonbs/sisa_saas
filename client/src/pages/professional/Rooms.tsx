import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CalendarDays, Info, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import "react-day-picker/dist/style.css";

// ─── Constantes ──────────────────────────────────────────────────────────────

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const ROOMS_PER_PAGE = 4;
const DAY_START_HOUR = 7;   // 07:00
const DAY_END_HOUR   = 21;  // até 21:00

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(h: number, m: number = 0) {
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function dateLabel(d: Date) {
  return `${DIAS_PT[d.getDay()]}, ${d.getDate()} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

// Converte minutos desde meia-noite para string HH:MM
function minsToTime(mins: number) {
  return fmtTime(Math.floor(mins / 60), mins % 60);
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SlotType = "free" | "booking" | "maintenance" | "admin_block" | "my_booking";

interface OccupiedBlock {
  roomId: number;
  startMins: number; // minutos desde meia-noite
  endMins: number;
  type: SlotType;
}

function slotBg(type: SlotType): string {
  switch (type) {
    case "free":        return "#f0fdf4"; // emerald-50
    case "booking":     return "#fff1f2"; // red-50
    case "maintenance": return "#fffbeb"; // amber-50
    case "admin_block": return "#f8fafc"; // slate-50
    case "my_booking":  return "#eff6ff"; // blue-50
  }
}
function slotBorder(type: SlotType): string {
  switch (type) {
    case "free":        return "#bbf7d0";
    case "booking":     return "#fecdd3";
    case "maintenance": return "#fde68a";
    case "admin_block": return "#cbd5e1";
    case "my_booking":  return "#bfdbfe";
  }
}
function slotTextColor(type: SlotType): string {
  switch (type) {
    case "free":        return "#15803d";
    case "booking":     return "#dc2626";
    case "maintenance": return "#b45309";
    case "admin_block": return "#64748b";
    case "my_booking":  return "#1d4ed8";
  }
}
function slotLabel(type: SlotType): string {
  switch (type) {
    case "free":        return "Disponível";
    case "booking":     return "Ocupado";
    case "maintenance": return "Manutenção";
    case "admin_block": return "Reservado pelo gestor";
    case "my_booking":  return "Minha reserva";
  }
}

// ─── DatePicker Popover ───────────────────────────────────────────────────────

function DatePickerPopover({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
        onClick={() => setOpen(o => !o)}
        title="Selecionar data"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span>{dateLabel(date)}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-8 left-0 z-50 bg-white border rounded-xl shadow-xl p-2">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={(d) => { if (d) { onChange(d); setOpen(false); } }}
            locale={ptBR}
            weekStartsOn={0}
          />
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Rooms() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [roomPage, setRoomPage] = useState(0);

  // Estabilizar a data para evitar re-fetches infinitos
  const queryDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(12, 0, 0, 0);
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.toDateString()]);

  const { data, isLoading } = trpc.rooms.availability.useQuery({ date: queryDate });
  const { data: myBookings } = trpc.bookings.list.useQuery();

  // Conjunto de slots que são minhas reservas
  const myBookingSet = useMemo(() => {
    if (!myBookings) return new Set<string>();
    return new Set(
      (myBookings as any[])
        .filter(b => !["cancelled", "canceled_with_credit", "no_show"].includes(b.status))
        .map(b => `${b.roomId}|${new Date(b.startTime).toISOString()}|${new Date(b.endTime).toISOString()}`)
    );
  }, [myBookings]);

  const rooms = (data?.rooms ?? []) as any[];
  const occupiedSlots = (data?.occupiedSlots ?? []) as any[];
  const blockedSlots  = (data?.blockedSlots  ?? []) as any[];

  // Paginação de salas (4 por página) quando "todas"
  const totalPages = Math.ceil(rooms.length / ROOMS_PER_PAGE);
  const pagedRooms = selectedRoom
    ? rooms.filter(r => r.id === selectedRoom)
    : rooms.slice(roomPage * ROOMS_PER_PAGE, (roomPage + 1) * ROOMS_PER_PAGE);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.toDateString()]);

  // Converte reservas/bloqueios para blocos de minutos
  function getOccupiedBlocks(roomId: number, day: Date): OccupiedBlock[] {
    const blocks: OccupiedBlock[] = [];
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    for (const bl of blockedSlots) {
      if (bl.roomId !== roomId) continue;
      const s = new Date(bl.startTime);
      const e = new Date(bl.endTime);
      if (!isSameDay(s, day) && !isSameDay(e, day) && !(s < day && e > dayStart)) continue;
      blocks.push({
        roomId,
        startMins: s.getHours() * 60 + s.getMinutes(),
        endMins:   e.getHours() * 60 + e.getMinutes(),
        type: bl.type === "maintenance" ? "maintenance" : "admin_block",
      });
    }

    for (const bk of occupiedSlots) {
      if (bk.roomId !== roomId) continue;
      const s = new Date(bk.startTime);
      const e = new Date(bk.endTime);
      if (!isSameDay(s, day) && !isSameDay(e, day) && !(s < day && e > dayStart)) continue;
      const key = `${bk.roomId}|${s.toISOString()}|${e.toISOString()}`;
      blocks.push({
        roomId,
        startMins: s.getHours() * 60 + s.getMinutes(),
        endMins:   e.getHours() * 60 + e.getMinutes(),
        type: myBookingSet.has(key) ? "my_booking" : "booking",
      });
    }

    return blocks;
  }

  // Retorna tipo de slot para uma hora inteira (para modo semana)
  function getHourSlotType(roomId: number, day: Date, hour: number): SlotType {
    const slotStartMins = hour * 60;
    const slotEndMins   = (hour + 1) * 60;
    const blocks = getOccupiedBlocks(roomId, day);
    for (const b of blocks) {
      if (b.startMins < slotEndMins && b.endMins > slotStartMins) return b.type;
    }
    return "free";
  }

  function handleFreeSlotClick(roomId: number, day: Date, startMins: number) {
    const start = new Date(day);
    start.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
    const end = new Date(day);
    end.setHours(Math.floor(startMins / 60) + 1, startMins % 60, 0, 0);
    navigate(`/rooms/${roomId}/book?start=${start.toISOString()}&end=${end.toISOString()}`);
  }

  function handleWeekSlotClick(roomId: number, day: Date, hour: number) {
    const type = getHourSlotType(roomId, day, hour);
    if (type !== "free") {
      const msgs: Record<SlotType, string> = {
        free: "",
        booking: "Esse horário já está ocupado por outro profissional.",
        my_booking: "Você já tem uma reserva neste horário.",
        maintenance: "Sala em manutenção neste horário.",
        admin_block: "Horário bloqueado pelo gestor.",
      };
      toast.info(msgs[type]);
      return;
    }
    handleFreeSlotClick(roomId, day, hour * 60);
  }

  function navDate(dir: number) {
    setCurrentDate(prev => addDays(prev, viewMode === "day" ? dir : dir * 7));
  }

  const weekNavLabel = useMemo(() => {
    const s = weekDays[0];
    const e = weekDays[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} a ${e.getDate()} de ${MESES_PT[s.getMonth()]} de ${s.getFullYear()}`;
    }
    return `${s.getDate()} de ${MESES_PT[s.getMonth()]} a ${e.getDate()} de ${MESES_PT[e.getMonth()]} de ${e.getFullYear()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.toDateString()]);

  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">

        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold">Disponibilidade das Salas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em um horário <span className="text-emerald-600 font-medium">disponível</span> para iniciar uma reserva
          </p>
        </div>

        {/* Filtro de salas — select compacto */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground font-medium">Sala:</span>
          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={selectedRoom ?? ""}
            onChange={e => {
              setSelectedRoom(e.target.value === "" ? null : Number(e.target.value));
              setRoomPage(0);
            }}
          >
            <option value="">Todas as salas</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(["free","booking","my_booking","maintenance","admin_block"] as SlotType[]).map(t => (
            <span
              key={t}
              style={{
                background: slotBg(t),
                border: `1px solid ${slotBorder(t)}`,
                color: slotTextColor(t),
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
            >
              {slotLabel(t)}
            </span>
          ))}
        </div>

        {/* Barra de navegação */}
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => navDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs px-3"
                  onClick={() => setCurrentDate(new Date(new Date().setHours(0,0,0,0)))}
                >
                  Hoje
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* DatePicker com ícone de calendário */}
                <div className="ml-2">
                  {viewMode === "day" ? (
                    <DatePickerPopover date={currentDate} onChange={d => {
                      const nd = new Date(d);
                      nd.setHours(0,0,0,0);
                      setCurrentDate(nd);
                    }} />
                  ) : (
                    <span className="text-sm font-medium">{weekNavLabel}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  variant={viewMode === "day" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setViewMode("day")}
                >
                  Dia
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setViewMode("week")}
                >
                  Semana
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <CalendarDays className="h-8 w-8 animate-pulse mr-2" />
            Carregando disponibilidade...
          </div>
        ) : rooms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Info className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-medium">Nenhuma sala disponível</p>
              <p className="text-sm text-muted-foreground mt-1">
                Entre em contato com a administração para mais informações.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "day" ? (
          /* ── MODO DIA ─────────────────────────────────────────────────────── */
          <>
            <div className="space-y-6">
              {pagedRooms.map(room => {
                const blocks = getOccupiedBlocks(room.id, currentDate);
                // Gera lista de períodos livres e ocupados para exibição
                const dayStartMins = DAY_START_HOUR * 60;
                const dayEndMins   = DAY_END_HOUR   * 60;

                // Ordena blocos por início
                const sorted = [...blocks]
                  .filter(b => b.endMins > dayStartMins && b.startMins < dayEndMins)
                  .sort((a, b) => a.startMins - b.startMins);

                // Constrói segmentos intercalados (livre / ocupado)
                type Segment = { startMins: number; endMins: number; type: SlotType };
                const segments: Segment[] = [];
                let cursor = dayStartMins;

                for (const blk of sorted) {
                  const bStart = Math.max(blk.startMins, dayStartMins);
                  const bEnd   = Math.min(blk.endMins,   dayEndMins);
                  if (bStart > cursor) {
                    segments.push({ startMins: cursor, endMins: bStart, type: "free" });
                  }
                  segments.push({ startMins: bStart, endMins: bEnd, type: blk.type });
                  cursor = bEnd;
                }
                if (cursor < dayEndMins) {
                  segments.push({ startMins: cursor, endMins: dayEndMins, type: "free" });
                }

                return (
                  <Card key={room.id} className="overflow-hidden shadow-sm">
                    {/* Cabeçalho da sala */}
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{ background: "#3D3D2E" }}
                    >
                      <div>
                        <span className="font-semibold text-white">{room.name}</span>
                        {room.description && (
                          <span className="ml-2 text-xs text-white/60">{room.description}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-white border-white/30 text-xs">
                        {formatCurrency(room.pricePerHour)}/h
                      </Badge>
                    </div>

                    {/* Segmentos de horário */}
                    <div className="divide-y">
                      {segments.map((seg, i) => {
                        const isFree = seg.type === "free";
                        return (
                          <div
                            key={i}
                            className="flex items-center px-4 py-2.5 transition-colors"
                            style={{
                              background: slotBg(seg.type),
                              borderLeft: `3px solid ${slotBorder(seg.type)}`,
                              cursor: isFree ? "pointer" : "not-allowed",
                            }}
                            onClick={() => {
                              if (!isFree) {
                                toast.info(
                                  seg.type === "booking" ? "Horário ocupado por outro profissional." :
                                  seg.type === "my_booking" ? "Você já tem reserva neste horário." :
                                  seg.type === "maintenance" ? "Sala em manutenção." :
                                  "Horário bloqueado pelo gestor."
                                );
                                return;
                              }
                              handleFreeSlotClick(room.id, currentDate, seg.startMins);
                            }}
                          >
                            {/* Coluna de hora de referência */}
                            <span
                              className="w-28 shrink-0 font-mono"
                              style={{ color: "#7C5C4A", fontSize: "11px" }}
                            >
                              {minsToTime(seg.startMins)} – {minsToTime(seg.endMins)}
                            </span>
                            <span
                              className="ml-4 text-xs font-semibold"
                              style={{ color: slotTextColor(seg.type) }}
                            >
                              {slotLabel(seg.type)}
                            </span>
                            {isFree && (
                              <span className="ml-auto text-xs underline underline-offset-2 opacity-60"
                                style={{ color: slotTextColor(seg.type) }}>
                                Clique para reservar
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Paginação de salas */}
            {!selectedRoom && totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-2 flex-wrap">
                {Array.from({ length: totalPages }, (_, i) => {
                  const start = i * ROOMS_PER_PAGE + 1;
                  const end   = Math.min((i + 1) * ROOMS_PER_PAGE, rooms.length);
                  return (
                    <Button
                      key={i}
                      variant={roomPage === i ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setRoomPage(i)}
                    >
                      {rooms.slice(i * ROOMS_PER_PAGE, (i + 1) * ROOMS_PER_PAGE).map(r => r.name).join(" | ")}
                    </Button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ── MODO SEMANA ──────────────────────────────────────────────────── */
          <>
            <div className="space-y-6">
              {pagedRooms.map(room => (
                <Card key={room.id} className="overflow-hidden shadow-sm">
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ background: "#3D3D2E" }}
                  >
                    <span className="font-semibold text-white">{room.name}</span>
                    <Badge variant="outline" className="text-white border-white/30 text-xs">
                      {formatCurrency(room.pricePerHour)}/h
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[600px]">
                      <thead>
                        <tr>
                          <th
                            className="w-16 border-b border-r px-2 py-2 text-center"
                            style={{ background: "#EDE8E3", color: "#7C5C4A", fontSize: "11px" }}
                          >
                            Hora
                          </th>
                          {weekDays.map(day => {
                            const isToday = isSameDay(day, new Date());
                            return (
                              <th
                                key={day.toISOString()}
                                className="border-b border-r px-2 py-2 text-center font-medium"
                                style={{
                                  background: isToday ? "#C8A882" : "#3D3D2E",
                                  color: "#fff",
                                  minWidth: "80px",
                                  fontSize: "11px",
                                }}
                              >
                                {DIAS_PT[day.getDay()]}<br />
                                <span className="font-normal opacity-80">
                                  {day.getDate()}/{String(day.getMonth()+1).padStart(2,"0")}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {hours.map(h => (
                          <tr key={h}>
                            <td
                              className="border-b border-r px-2 py-1.5 text-center font-mono"
                              style={{ background: "#EDE8E3", color: "#7C5C4A", fontSize: "11px" }}
                            >
                              {fmtTime(h)}
                            </td>
                            {weekDays.map(day => {
                              const type = getHourSlotType(room.id, day, h);
                              return (
                                <td
                                  key={day.toISOString()}
                                  className="border-b border-r px-1 py-1.5 text-center transition-colors"
                                  style={{
                                    background: slotBg(type),
                                    cursor: type === "free" ? "pointer" : "not-allowed",
                                  }}
                                  onClick={() => handleWeekSlotClick(room.id, day, h)}
                                  title={type === "free" ? "Clique para reservar" : slotLabel(type)}
                                >
                                  <span
                                    className="text-[10px] font-medium leading-tight"
                                    style={{ color: slotTextColor(type) }}
                                  >
                                    {slotLabel(type)}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>

            {/* Paginação de salas (modo semana) */}
            {!selectedRoom && totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-2 flex-wrap">
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    variant={roomPage === i ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setRoomPage(i)}
                  >
                    {rooms.slice(i * ROOMS_PER_PAGE, (i + 1) * ROOMS_PER_PAGE).map(r => r.name).join(" | ")}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
