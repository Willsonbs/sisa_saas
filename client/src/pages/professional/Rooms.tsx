import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown } from "lucide-react";
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
const DAY_END_HOUR   = 22;  // até 22:00 (exclusive)

// ─── Paleta SISA ─────────────────────────────────────────────────────────────
const HOUR_COL_BG   = "#EDE8E3";  // off-white quente
const HOUR_COL_TEXT = "#7C5C4A";  // terracotta
const HDR_BG        = "#3D3D2E";  // forest-dark (sidebar)
const HDR_TEXT      = "#C8C4BE";  // texto muted do sidebar
const CELL_FREE_BG  = "#FFFFFF";
const CELL_FREE_HOVER = "#F5F3EF";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(h: number, m: number = 0) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateLabel(d: Date) {
  return `${DIAS_PT[d.getDay()]}, ${d.getDate()} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SlotType = "free" | "booking" | "maintenance" | "admin_block" | "my_booking";

interface OccupiedBlock {
  roomId: number;
  startMins: number;
  endMins: number;
  type: SlotType;
}

function slotBg(type: SlotType): string {
  switch (type) {
    case "free":        return CELL_FREE_BG;
    case "booking":     return "#FFF1F2";
    case "maintenance": return "#FFFBEB";
    case "admin_block": return "#F8FAFC";
    case "my_booking":  return "#EFF6FF";
  }
}
function slotBorder(type: SlotType): string {
  switch (type) {
    case "free":        return "transparent";
    case "booking":     return "#FECDD3";
    case "maintenance": return "#FDE68A";
    case "admin_block": return "#CBD5E1";
    case "my_booking":  return "#BFDBFE";
  }
}
function slotTextColor(type: SlotType): string {
  switch (type) {
    case "free":        return "#6B7280";
    case "booking":     return "#DC2626";
    case "maintenance": return "#B45309";
    case "admin_block": return "#64748B";
    case "my_booking":  return "#1D4ED8";
  }
}
function slotLabel(type: SlotType): string {
  switch (type) {
    case "free":        return "Disponível";
    case "booking":     return "Ocupado";
    case "maintenance": return "Manutenção";
    case "admin_block": return "Bloqueado";
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
        className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
        onClick={() => setOpen((o) => !o)}
        title="Selecionar data"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="capitalize">{dateLabel(date)}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-white border rounded-xl shadow-xl p-2">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) { onChange(d); setOpen(false); }
            }}
            locale={ptBR}
            weekStartsOn={0}
          />
        </div>
      )}
    </div>
  );
}

// ─── Legenda ─────────────────────────────────────────────────────────────────

const LEGEND_ITEMS: { type: SlotType; label: string }[] = [
  { type: "free",        label: "Disponível" },
  { type: "my_booking",  label: "Minha reserva" },
  { type: "booking",     label: "Ocupado" },
  { type: "maintenance", label: "Manutenção" },
  { type: "admin_block", label: "Bloqueado" },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Rooms() {
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
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
  const { data: me } = trpc.auth.me.useQuery();
  const myUserId = (me as any)?.id;

  const rooms = (data?.rooms ?? []) as any[];
  const occupiedSlots = (data?.occupiedSlots ?? []) as any[];
  const blockedSlots  = (data?.blockedSlots  ?? []) as any[];

  // Paginação: 4 salas por página
  const totalPages = Math.max(1, Math.ceil(rooms.length / ROOMS_PER_PAGE));
  const pagedRooms = rooms.slice(roomPage * ROOMS_PER_PAGE, (roomPage + 1) * ROOMS_PER_PAGE);

  // Horas exibidas: 07:00 a 21:00
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => i + DAY_START_HOUR);

  // Converte reservas/bloqueios para blocos de minutos
  function getOccupiedBlocks(roomId: number): OccupiedBlock[] {
    const blocks: OccupiedBlock[] = [];
    const day = currentDate;
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
      const isMyBooking = bk.professionalId === myUserId;
      blocks.push({
        roomId,
        startMins: s.getHours() * 60 + s.getMinutes(),
        endMins:   e.getHours() * 60 + e.getMinutes(),
        type: isMyBooking ? "my_booking" : "booking",
      });
    }

    return blocks;
  }

  function getHourSlotType(roomId: number, hour: number): SlotType {
    const slotStartMins = hour * 60;
    const slotEndMins   = (hour + 1) * 60;
    const blocks = getOccupiedBlocks(roomId);
    for (const b of blocks) {
      if (b.startMins < slotEndMins && b.endMins > slotStartMins) return b.type;
    }
    return "free";
  }

  function handleSlotClick(roomId: number, hour: number) {
    const type = getHourSlotType(roomId, hour);
    if (type !== "free") {
      const msgs: Record<SlotType, string> = {
        free:        "",
        booking:     "Esse horário já está ocupado por outro profissional.",
        my_booking:  "Você já tem uma reserva neste horário.",
        maintenance: "Sala em manutenção neste horário.",
        admin_block: "Horário bloqueado pelo gestor.",
      };
      toast.info(msgs[type]);
      return;
    }
    const start = new Date(currentDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(currentDate);
    end.setHours(hour + 1, 0, 0, 0);
    navigate(`/rooms/${roomId}/book?start=${start.toISOString()}&end=${end.toISOString()}`);
  }

  function navDate(dir: number) {
    setCurrentDate((prev) => addDays(prev, dir));
    setRoomPage(0);
  }

  const isToday = isSameDay(currentDate, new Date());

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Título */}
        <div>
          <h1 className="text-3xl font-bold">Salas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize a disponibilidade das salas e faça sua reserva
          </p>
        </div>

        {/* Barra de navegação */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-semibold tracking-wide"
            onClick={() => { setCurrentDate(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }); setRoomPage(0); }}
          >
            HOJE
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <DatePickerPopover date={currentDate} onChange={(d) => { setCurrentDate(d); setRoomPage(0); }} />
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 text-xs">
          {LEGEND_ITEMS.map(({ type, label }) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm border"
                style={{ background: slotBg(type), borderColor: slotBorder(type) || "#D1D5DB" }}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Grade de calendário */}
        <div className="border rounded-lg overflow-auto shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mr-2 animate-pulse" /> Carregando disponibilidade...
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Nenhuma sala disponível.
            </div>
          ) : (
            <table
              className="w-full border-collapse text-sm"
              style={{ minWidth: `${64 + pagedRooms.length * 160}px` }}
            >
              <thead>
                <tr>
                  {/* Célula do canto superior esquerdo — mesma cor da coluna de horas */}
                  <th
                    className="w-16 border-b border-r sticky left-0 z-20"
                    style={{ background: HOUR_COL_BG }}
                  />
                  {/* Cabeçalhos das salas — apenas o nome, sem preço ou descrição */}
                  {pagedRooms.map((room) => (
                    <th
                      key={room.id}
                      className="border-b border-r py-3 px-2 text-center"
                      style={{ background: HDR_BG, minWidth: "160px" }}
                    >
                      <div
                        className="text-sm font-semibold truncate"
                        style={{ color: HDR_TEXT }}
                        title={room.name}
                      >
                        {room.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {hours.map((hour) => (
                  <tr key={hour} className="h-12">
                    {/* Coluna de horas — off-white, terracotta, 11px */}
                    <td
                      className="border-b border-r text-right pr-2 pt-1 sticky left-0 z-10 align-top select-none w-16"
                      style={{
                        background: HOUR_COL_BG,
                        color: HOUR_COL_TEXT,
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      {fmtTime(hour)}
                    </td>

                    {/* Células das salas */}
                    {pagedRooms.map((room) => {
                      const type = getHourSlotType(room.id, hour);
                      const isFree = type === "free";
                      return (
                        <HourCell
                          key={room.id}
                          type={type}
                          isFree={isFree}
                          onClick={() => handleSlotClick(room.id, hour)}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação — só aparece quando há mais de 4 salas */}
        {rooms.length > ROOMS_PER_PAGE && (
          <div className="flex items-center justify-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={roomPage === 0}
              onClick={() => setRoomPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3 w-3 mr-1" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {roomPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={roomPage === totalPages - 1}
              onClick={() => setRoomPage((p) => p + 1)}
            >
              Próxima <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {!isLoading && rooms.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {isToday ? "Hoje" : dateLabel(currentDate)} — clique em um horário disponível para reservar
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Célula de hora com hover ─────────────────────────────────────────────────

function HourCell({
  type,
  isFree,
  onClick,
}: {
  type: SlotType;
  isFree: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bg = hovered && isFree ? CELL_FREE_HOVER : slotBg(type);

  return (
    <td
      className="border-b border-r align-middle px-1 py-0.5 transition-colors"
      style={{
        background: bg,
        cursor: isFree ? "pointer" : "not-allowed",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isFree ? "Clique para reservar" : slotLabel(type)}
    >
      <div className="flex items-center justify-center h-full">
        <span
          className="text-[10px] font-medium leading-tight text-center"
          style={{ color: slotTextColor(type) }}
        >
          {isFree && hovered ? "Reservar" : slotLabel(type)}
        </span>
      </div>
    </td>
  );
}
