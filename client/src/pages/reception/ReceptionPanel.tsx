import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, Clock, MapPin, User, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, XCircle, HelpCircle } from "lucide-react";

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

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function toDateStr(d: Date) {
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

export default function ReceptionPanel() {
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const dateStr = toDateStr(selectedDate);

  const { data: bookings = [], isLoading } = trpc.reception.todayBookings.useQuery(
    { date: dateStr },
    { refetchInterval: 30_000 }
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(
      (b) =>
        (b.professionalName ?? "").toLowerCase().includes(q) ||
        (b.roomName ?? "").toLowerCase().includes(q) ||
        (b.patientName ?? "").toLowerCase().includes(q)
    );
  }, [bookings, search]);

  function prevDay() {
    setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  }
  function nextDay() {
    setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  }
  function goToday() {
    setSelectedDate(new Date());
  }

  const isToday = toDateStr(selectedDate) === toDateStr(new Date());

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-[#7C5C4A]" />
              Painel de Recepção
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Consulte as reservas do dia e oriente os pacientes.</p>
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevDay} className="h-9 w-9 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[160px]">
              <p className="text-sm font-semibold text-gray-800 capitalize">
                {isToday ? "Hoje" : selectedDate.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
              </p>
              <p className="text-xs text-gray-400">{selectedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
            <Button variant="outline" size="sm" onClick={nextDay} className="h-9 w-9 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-9 px-3">
                Hoje
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por profissional, sala ou nome do paciente..."
            className="pl-10 h-11 text-base"
          />
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{filtered.length} reserva{filtered.length !== 1 ? "s" : ""}</span>
          {search && <span>· filtrando por "{search}"</span>}
          <span className="ml-auto text-xs">Atualiza a cada 30s</span>
        </div>

        {/* Booking list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-400">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">
                {search ? "Nenhuma reserva encontrada para esta busca" : "Nenhuma reserva para este dia"}
              </p>
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="mt-2 text-[#7C5C4A]">
                  Limpar busca
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered
              .slice()
              .sort((a, b) => a.startTime - b.startTime)
              .map((b) => {
                const cfg = STATUS_CONFIG[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600", icon: null };
                const isPast = b.endTime < Date.now() && isToday;
                return (
                  <Card
                    key={b.id}
                    className={`border transition-all ${isPast ? "opacity-60" : "hover:shadow-md"}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Time block */}
                        <div className="flex-shrink-0 w-24 text-center bg-[#EDE8E3] rounded-lg py-2 px-3">
                          <p className="text-lg font-bold text-[#7C5C4A]">{formatTime(b.startTime)}</p>
                          <p className="text-xs text-[#9B7B6A]">{formatTime(b.endTime)}</p>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{b.professionalName}</span>
                            {b.professionalSpecialty && (
                              <span className="text-xs text-gray-500">· {b.professionalSpecialty}</span>
                            )}
                            <Badge className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                              {cfg.icon}{cfg.label}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              {b.roomName}
                            </span>
                            {b.patientName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-gray-400" />
                                {b.patientName}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-gray-400">
                              <Clock className="h-3.5 w-3.5" />
                              {Math.round((b.endTime - b.startTime) / 60000)} min
                            </span>
                          </div>

                          {b.receptionNotes && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
                              📌 {b.receptionNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
