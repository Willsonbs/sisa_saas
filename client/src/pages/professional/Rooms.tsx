import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CalendarDays, Info } from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ────────────────────────────────────────────────────────────────

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmt24(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function dateLabel(d: Date) {
  return `${DIAS_PT[d.getDay()]}, ${d.getDate()} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
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

type SlotType = "free" | "booking" | "maintenance" | "admin_block" | "my_booking";

function slotStyle(type: SlotType): string {
  switch (type) {
    case "free":        return "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 cursor-pointer";
    case "booking":     return "bg-red-50 border border-red-200 text-red-600 cursor-not-allowed";
    case "maintenance": return "bg-amber-50 border border-amber-200 text-amber-700 cursor-not-allowed";
    case "admin_block": return "bg-slate-100 border border-slate-300 text-slate-500 cursor-not-allowed";
    case "my_booking":  return "bg-blue-50 border border-blue-300 text-blue-700 cursor-not-allowed";
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

// ─── Component ──────────────────────────────────────────────────────────────

export default function Rooms() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);

  // Estabilizar a data para evitar re-fetches infinitos
  const queryDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setHours(12, 0, 0, 0); // meio-dia para evitar problemas de timezone
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
  const blockedSlots = (data?.blockedSlots ?? []) as any[];

  const visibleRooms = selectedRoom ? rooms.filter(r => r.id === selectedRoom) : rooms;

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.toDateString()]);

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00

  function getSlotType(roomId: number, day: Date, hour: number): SlotType {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(day);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    const overlaps = (start: any, end: any) => {
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      return s < slotEnd.getTime() && e > slotStart.getTime();
    };

    for (const bl of blockedSlots) {
      if (bl.roomId === roomId && overlaps(bl.startTime, bl.endTime)) {
        return bl.type === "maintenance" ? "maintenance" : "admin_block";
      }
    }

    for (const bk of occupiedSlots) {
      if (bk.roomId === roomId && overlaps(bk.startTime, bk.endTime)) {
        const key = `${bk.roomId}|${new Date(bk.startTime).toISOString()}|${new Date(bk.endTime).toISOString()}`;
        return myBookingSet.has(key) ? "my_booking" : "booking";
      }
    }

    return "free";
  }

  function handleSlotClick(roomId: number, day: Date, hour: number) {
    const type = getSlotType(roomId, day, hour);
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

    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(day);
    end.setHours(hour + 1, 0, 0, 0);

    navigate(`/rooms/${roomId}/book?start=${start.toISOString()}&end=${end.toISOString()}`);
  }

  function navDate(dir: number) {
    setCurrentDate(prev => addDays(prev, viewMode === "day" ? dir : dir * 7));
  }

  const navLabel = useMemo(() => {
    if (viewMode === "day") return dateLabel(currentDate);
    const s = weekDays[0];
    const e = weekDays[6];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} a ${e.getDate()} de ${MESES_PT[s.getMonth()]} de ${s.getFullYear()}`;
    }
    return `${s.getDate()} de ${MESES_PT[s.getMonth()]} a ${e.getDate()} de ${MESES_PT[e.getMonth()]} de ${e.getFullYear()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentDate.toDateString()]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Disponibilidade das Salas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em um horário <span className="text-emerald-600 font-medium">disponível</span> para iniciar uma reserva
            </p>
          </div>

          {/* Filtro de sala */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedRoom === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRoom(null)}
            >
              Todas as salas
            </Button>
            {rooms.map(r => (
              <Button
                key={r.id}
                variant={selectedRoom === r.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoom(r.id)}
              >
                {r.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 text-xs">
          {(["free","booking","my_booking","maintenance","admin_block"] as SlotType[]).map(t => (
            <span key={t} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${slotStyle(t)}`}>
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
                <span className="ml-2 text-sm font-medium">{navLabel}</span>
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
        ) : visibleRooms.length === 0 ? (
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
          /* ── MODO DIA ── */
          <div className="space-y-6">
            {visibleRooms.map(room => (
              <Card key={room.id} className="overflow-hidden shadow-sm">
                {/* Cabeçalho da sala */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ background: "#3D3D2E" }}>
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

                {/* Grade de horários */}
                <div className="divide-y">
                  {hours.map(h => {
                    const type = getSlotType(room.id, currentDate, h);
                    return (
                      <div
                        key={h}
                        className={`flex items-center px-4 py-2.5 transition-colors ${slotStyle(type)}`}
                        onClick={() => handleSlotClick(room.id, currentDate, h)}
                      >
                        <span
                          className="w-24 shrink-0 font-mono"
                          style={{ color: "#7C5C4A", fontSize: "11px" }}
                        >
                          {fmt24(h)} – {fmt24(h + 1)}
                        </span>
                        <span className="ml-4 text-xs font-medium">{slotLabel(type)}</span>
                        {type === "free" && (
                          <span className="ml-auto text-xs underline underline-offset-2 opacity-60">
                            Clique para reservar
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* ── MODO SEMANA ── */
          <div className="space-y-6">
            {visibleRooms.map(room => (
              <Card key={room.id} className="overflow-hidden shadow-sm">
                {/* Cabeçalho da sala */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ background: "#3D3D2E" }}>
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
                          className="w-16 border-b border-r px-2 py-2 text-left"
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
                                minWidth: "88px",
                                fontSize: "11px",
                              }}
                            >
                              {DIAS_PT[day.getDay()]}<br />
                              <span className="font-normal opacity-80">
                                {day.getDate()}/{String(day.getMonth() + 1).padStart(2,"0")}
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
                            {fmt24(h)}
                          </td>
                          {weekDays.map(day => {
                            const type = getSlotType(room.id, day, h);
                            return (
                              <td
                                key={day.toISOString()}
                                className={`border-b border-r px-1 py-1.5 text-center transition-colors ${slotStyle(type)}`}
                                onClick={() => handleSlotClick(room.id, day, h)}
                                title={type === "free" ? "Clique para reservar" : slotLabel(type)}
                              >
                                <span className="text-[10px] font-medium leading-tight">
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
        )}
      </div>
    </DashboardLayout>
  );
}
