import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, CreditCard, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

export default function BookRoom() {
  const [, params] = useRoute("/rooms/:id/book");
  const [, setLocation] = useLocation();
  const roomId = params?.id ? parseInt(params.id) : 0;
  
  // Hooks devem ser chamados antes de qualquer return condicional
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const { data: room, isLoading } = trpc.rooms.getById.useQuery({ id: roomId });
  const { data: balance } = trpc.credits.balance.useQuery();
  
  const createBookingMutation = trpc.bookings.create.useMutation({
    onSuccess: () => {
      toast.success("Reserva criada com sucesso!");
      setLocation("/bookings");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const date = formData.get("date") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);
    
    if (endDateTime <= startDateTime) {
      toast.error("Horário de término deve ser após o horário de início");
      return;
    }
    
    const hours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    const cost = room ? Math.round(room.pricePerHour * hours) : 0;
    
    if (balance !== undefined && cost > balance) {
      toast.error("Saldo de créditos insuficiente");
      return;
    }
    
    createBookingMutation.mutate({
      roomId,
      startTime: startDateTime,
      endTime: endDateTime,
      patientName: formData.get("patientName") as string,
      privateNotes: formData.get("notes") as string || undefined,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-lg font-medium mb-4">Sala não encontrada</p>
            <Button onClick={() => setLocation("/rooms")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Salas
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  
  const calculateCost = () => {
    if (!date || !startTime || !endTime || !room) return 0;
    
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    
    if (end <= start) return 0;
    
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(room.pricePerHour * hours);
  };

  const cost = calculateCost();

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/rooms")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold mt-4">Reservar Sala</h1>
          <p className="text-muted-foreground">{room.name}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Room Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Sala</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {room.photos && room.photos.length > 0 && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={room.photos[0]}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div>
                <h3 className="font-semibold mb-2">{room.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {room.description || "Sala de atendimento profissional"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Capacidade:</span>
                  <p className="font-medium">{room.capacity} pessoas</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Preço/hora:</span>
                  <p className="font-medium">{formatCurrency(room.pricePerHour)}</p>
                </div>
              </div>

              {room.equipment && room.equipment.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Equipamentos:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {room.equipment.join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Reserva</CardTitle>
              <CardDescription>Preencha os detalhes do agendamento</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Início *</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">Término *</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientName">Nome do Paciente *</Label>
                  <Input
                    id="patientName"
                    name="patientName"
                    required
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Informações adicionais (opcional)"
                  />
                </div>

                {/* Cost Summary */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo estimado:</span>
                    <span className="font-bold text-lg">{formatCurrency(cost)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Seu saldo:</span>
                    <span className={balance !== undefined && cost > balance ? "text-destructive font-medium" : "font-medium"}>
                      {formatCurrency(balance || 0)}
                    </span>
                  </div>

                  {balance !== undefined && cost > balance && (
                    <p className="text-sm text-destructive">
                      Saldo insuficiente. Você precisa de mais {formatCurrency(cost - balance)}.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createBookingMutation.isPending || (balance !== undefined && cost > balance) || cost === 0}
                >
                  {createBookingMutation.isPending ? "Reservando..." : "Confirmar Reserva"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
