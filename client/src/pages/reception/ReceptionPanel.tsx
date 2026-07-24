import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Search, CalendarDays, Clock, MapPin, User, Phone, FileText,
  CheckCircle2, AlertCircle, XCircle, HelpCircle, X, Building2,
} from "lucide-react";

// Remove acentos para busca mais tolerante (ex: "goncalves" encontra "Gonçalves")
function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  confirmed:              { label: "Confirmada",     color: "bg-green-100 text-green-700",   icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  pending_payment:        { label: "Pend. Pagamento",color: "bg-amber-100 text-amber-700",   icon: <AlertCircle className="h-3.5 w-3.5" /> },
  draft:                  { label: "Rascunho",       color: "bg-gray-100 text-gray-600",     icon: <HelpCircle className="h-3.5 w-3.5" /> },
  no_show:                { label: "Não compareceu", color: "bg-red-100 text-red-700",       icon: <XCircle className="h-3.5 w-3.5" /> },
  completed:              { label: "Concluída",      color: "bg-blue-100 text-blue-700",     icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  canceled_with_credit:   { label: "Cancelada",      color: "bg-gray-100 text-gray-500",     icon: <XCircle className="h-3.5 w-3.5" /> },
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatDateFull(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function toDateStr(d: Date) {
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

type Booking = {
  id: number;
  startTime: number;
  endTime: number;
  status: string;
  receptionNotes: string | null;
  roomId: number;
  roomName: string;
  professionalId: number;
  professionalName: string;
  professionalSpecialty: string | null;
  patientName: string | null;
  patientPhone: string | null;
};

function BookingDetailDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  if (!booking) return null;
  const cfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-600", icon: null };

  return (
    <Dialog open={!!booking} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Reserva #{booking.id}</span>
            <Badge className={`text-xs flex items-center gap-1 ${cfg.color}`}>{cfg.icon}{cfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="font-medium text-gray-900">{booking.roomName}</p>
          </div>
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-gray-900">{booking.professionalName}</p>
              {booking.professionalSpecialty && (
                <p className="text-xs text-muted-foreground">{booking.professionalSpecialty}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-gray-900 capitalize">{formatDateFull(booking.startTime)}</p>
              <p className="text-muted-foreground">{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</p>
            </div>
          </div>
          {booking.patientName && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Paciente</p>
                <p className="font-medium text-gray-900">{booking.patientName}</p>
              </div>
            </div>
          )}
          {booking.patientPhone && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-gray-700">{booking.patientPhone}</p>
            </div>
          )}
          {booking.receptionNotes && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 flex-1">{booking.receptionNotes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReceptionPanel() {
  const [search, setSearch] = useState("");
  const today = toDateStr(new Date());
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [selectedProfessional, setSelectedProfessional] = useState<{ id: number; name: string } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const roomIdFilter = roomFilter === "all" ? undefined : Number(roomFilter);

  const { data: bookings = [], isLoading } = trpc.reception.bookings.useQuery(
    { dateFrom, dateTo, roomId: roomIdFilter },
    { refetchInterval: 30_000 }
  );

  const { data: professionals = [] } = trpc.reception.professionals.useQuery();
  const { data: rooms = [] } = trpc.rooms.list.useQuery({ includeInactive: false });

  // Sugestões de profissionais cadastrados que batem com o texto digitado
  // (busca por substring, sem diferenciar maiúsculas/minúsculas ou acentos —
  // ex: "gonça" encontra "Erika Gonçalves Leitão").
  const suggestions = useMemo(() => {
    if (selectedProfessional || !search.trim()) return [];
    const q = normalize(search);
    return professionals.filter((p) => normalize(p.name ?? "").includes(q)).slice(0, 6);
  }, [professionals, search, selectedProfessional]);

  function selectProfessional(p: { id: number; name: string }) {
    setSelectedProfessional(p);
    setSearch(p.name);
    setShowSuggestions(false);
  }

  function clearProfessionalFilter() {
    setSelectedProfessional(null);
    setSearch("");
  }

  // Fecha a lista de sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    // Profissional selecionado via autocomplete: filtra só as reservas dele
    if (selectedProfessional) {
      return bookings.filter((b) => b.professionalId === selectedProfessional.id);
    }
    // Sem seleção: busca livre por texto (nome do profissional, sala ou paciente)
    if (!search.trim()) return bookings;
    const q = normalize(search);
    return bookings.filter(
      (b) =>
        normalize(b.professionalName ?? "").includes(q) ||
        normalize(b.roomName ?? "").includes(q) ||
        normalize(b.patientName ?? "").includes(q)
    );
  }, [bookings, search, selectedProfessional]);

  // Agrupa as reservas filtradas por sala, ordenadas por nome da sala;
  // dentro de cada sala, ordenadas cronologicamente.
  const groupedByRoom = useMemo(() => {
    const groups = new Map<number, { roomName: string; items: Booking[] }>();
    for (const b of filtered) {
      if (!groups.has(b.roomId)) groups.set(b.roomId, { roomName: b.roomName, items: [] });
      groups.get(b.roomId)!.items.push(b);
    }
    groups.forEach((g) => g.items.sort((a, b) => a.startTime - b.startTime));
    return Array.from(groups.values()).sort((a, b) => a.roomName.localeCompare(b.roomName, "pt-BR"));
  }, [filtered]);

  function resetToToday() {
    setDateFrom(today);
    setDateTo(today);
  }

  // Datas diferentes só importam visualmente quando o intervalo cobre vários dias
  const showDateOnRows = dateFrom !== dateTo;
  const isToday = dateFrom === today && dateTo === today;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#7C5C4A]" />
            Painel de Recepção
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Relatório de reservas por sala, com filtros de período e sala.</p>
        </div>

        {/* Filtros: período (data início/fim) + sala */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">De</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-auto text-sm"
          />
          <span className="text-xs text-gray-500">até</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 w-auto text-sm"
          />
          {!isToday && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetToToday}>
              Hoje
            </Button>
          )}

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
        </div>

        {/* Search + autocomplete de profissional cadastrado */}
        <div className="relative" ref={searchBoxRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSuggestions(true);
              if (selectedProfessional) setSelectedProfessional(null);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar por profissional cadastrado, sala ou nome do paciente..."
            className="pl-10 pr-9 h-11 text-base"
          />
          {(search || selectedProfessional) && (
            <button
              type="button"
              onClick={clearProfessionalFilter}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Limpar"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProfessional({ id: p.id, name: p.name ?? "Profissional sem nome" })}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#EDE8E3] flex items-center gap-2"
                >
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  {p.name ?? "Profissional sem nome"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{filtered.length} reserva{filtered.length !== 1 ? "s" : ""}</span>
          {selectedProfessional && <span>· filtrando por profissional: <strong>{selectedProfessional.name}</strong></span>}
          {!selectedProfessional && search && <span>· filtrando por "{search}"</span>}
          <span className="ml-auto text-xs">Atualiza a cada 30s</span>
        </div>

        {/* Booking list, agrupada por sala */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : groupedByRoom.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-400">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">
                {selectedProfessional
                  ? `Nenhuma reserva de ${selectedProfessional.name} neste filtro`
                  : search
                  ? "Nenhuma reserva encontrada para esta busca"
                  : "Nenhuma reserva encontrada para este filtro"}
              </p>
              {(search || selectedProfessional) && (
                <Button variant="ghost" size="sm" onClick={clearProfessionalFilter} className="mt-2 text-[#7C5C4A]">
                  Limpar busca
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedByRoom.map((group) => (
              <div key={group.roomName} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Building2 className="h-4 w-4 text-[#7C5C4A]" />
                  {group.roomName}
                  <span className="text-xs font-normal text-gray-400">({group.items.length})</span>
                </div>
                <div className="space-y-2">
                  {group.items.map((b) => {
                    const cfg = STATUS_CONFIG[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", icon: null };
                    const isPast = b.endTime < Date.now();
                    return (
                      <div
                        key={b.id}
                        className={`flex items-center gap-3 px-3 py-1.5 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${isPast && isToday ? "opacity-60" : ""}`}
                        onClick={() => setSelectedBooking(b)}
                      >
                        <div className="flex-shrink-0 w-16 text-center">
                          {showDateOnRows && (
                            <p className="text-[9px] font-semibold text-[#9B7B6A] uppercase leading-none">{formatDateShort(b.startTime)}</p>
                          )}
                          <p className="text-sm font-bold text-[#7C5C4A] leading-tight">{formatTime(b.startTime)}</p>
                        </div>

                        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap text-sm">
                          <span className="font-semibold text-gray-900">{b.professionalName}</span>
                          {b.professionalSpecialty && (
                            <span className="text-xs text-gray-500">· {b.professionalSpecialty}</span>
                          )}
                          {b.patientName && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                              {b.patientName}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            {Math.round((b.endTime - b.startTime) / 60000)} min
                          </span>
                          {b.receptionNotes && (
                            <span className="text-xs text-amber-700 truncate max-w-[200px]" title={b.receptionNotes}>
                              📌 {b.receptionNotes}
                            </span>
                          )}
                        </div>

                        <Badge className={`text-xs flex items-center gap-1 shrink-0 ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookingDetailDialog booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
    </DashboardLayout>
  );
}
