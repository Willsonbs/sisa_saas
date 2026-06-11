import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar as BigCalendar, momentLocalizer, SlotInfo, Event } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

moment.locale("pt-br");
const localizer = momentLocalizer(moment);

interface BookingEvent extends Event {
  id: number;
  roomId: number;
  roomName: string;
  status: string;
  totalPrice: number;
}

export default function Calendar() {
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");

  const { data: rooms } = trpc.rooms.list.useQuery({ includeInactive: false });
  const { data: bookings, refetch } = trpc.bookings.list.useQuery();
  const createMutation = trpc.bookings.create.useMutation({
    onSuccess: () => {
      toast.success("Reserva criada com sucesso!");
      setSelectedSlot(null);
      setSelectedRoomId("");
      setPatientName("");
      setPrivateNotes("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Reserva cancelada com sucesso!");
      setSelectedEvent(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Converter reservas para eventos do calendário
  const events: BookingEvent[] = (bookings || []).filter(b => b.room).map((booking) => ({
    id: booking.id,
    title: `${booking.room!.name} - ${booking.patientName}`,
    start: new Date(booking.startTime),
    end: new Date(booking.endTime),
    roomId: booking.roomId,
    roomName: booking.room!.name,
    status: booking.status,
    totalPrice: booking.totalPrice,
  }));

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot(slotInfo);
  };

  const handleSelectEvent = (event: BookingEvent) => {
    setSelectedEvent(event);
  };

  const handleCreateBooking = () => {
    if (!selectedSlot || !selectedRoomId || !patientName) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const startDate = selectedSlot.start instanceof Date ? selectedSlot.start : new Date(selectedSlot.start);
    const endDate = selectedSlot.end instanceof Date ? selectedSlot.end : new Date(selectedSlot.end);
    
    createMutation.mutate({
      roomId: parseInt(selectedRoomId),
      startTime: startDate,
      endTime: endDate,
      patientName,
      privateNotes,
    });
  };

  const handleCancelBooking = () => {
    if (!selectedEvent) return;
    cancelMutation.mutate({ id: selectedEvent.id });
  };

  const eventStyleGetter = (event: BookingEvent) => {
    let backgroundColor = "#3b82f6"; // blue
    if (event.status === "cancelled") {
      backgroundColor = "#ef4444"; // red
    } else if (event.status === "completed") {
      backgroundColor = "#10b981"; // green
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Calendário de Reservas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie suas reservas em formato de calendário
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Agenda
            </CardTitle>
            <CardDescription>
              Clique em um horário vazio para criar uma nova reserva ou em uma reserva existente para ver detalhes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: "600px" }}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Agenda",
                  date: "Data",
                  time: "Hora",
                  event: "Evento",
                  noEventsInRange: "Não há reservas neste período",
                  showMore: (total) => `+ ${total} mais`,
                }}
                views={["month", "week", "day", "agenda"]}
                defaultView="week"
                step={60}
                timeslots={1}
                min={new Date(2024, 0, 1, 7, 0, 0)}
                max={new Date(2024, 0, 1, 22, 0, 0)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dialog para criar nova reserva */}
        <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Reserva</DialogTitle>
              <DialogDescription>
                {selectedSlot && (
                  <>
                    De {moment(selectedSlot.start).format("DD/MM/YYYY HH:mm")} até{" "}
                    {moment(selectedSlot.end).format("DD/MM/YYYY HH:mm")}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room">Sala *</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        {room.name} - {formatCurrency(room.pricePerHour)}/h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientName">Nome do Paciente *</Label>
                <input
                  id="patientName"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nome completo do paciente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privateNotes">Observações Privadas</Label>
                <Textarea
                  id="privateNotes"
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Notas visíveis apenas para você"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSlot(null)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateBooking} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Reserva"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para ver detalhes da reserva */}
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Reserva</DialogTitle>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Sala</span>
                    <p className="font-medium">{selectedEvent.roomName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status</span>
                    <p className="font-medium capitalize">{selectedEvent.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Início</span>
                    <p className="font-medium">{moment(selectedEvent.start).format("DD/MM/YYYY HH:mm")}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Término</span>
                    <p className="font-medium">{moment(selectedEvent.end).format("DD/MM/YYYY HH:mm")}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Valor Total</span>
                    <p className="font-medium">{formatCurrency(selectedEvent.totalPrice)}</p>
                  </div>
                </div>

                {selectedEvent.status === "confirmed" && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                      Fechar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelBooking}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? "Cancelando..." : "Cancelar Reserva"}
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
