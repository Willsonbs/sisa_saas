import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CreditCard, ArrowLeft, Wallet, BadgeCheck, AlertCircle, QrCode } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type PaymentMode = "credits" | "stripe" | "pix";

export default function BookRoom() {
  const [, params] = useRoute("/rooms/:id/book");
  const [, setLocation] = useLocation();
  const roomId = params?.id ? parseInt(params.id) : 0;

  // Pré-preencher data/hora a partir dos query params ?start=...&end=...
  const [date, setDate] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("start");
    if (s) {
      const d = new Date(s);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
  });
  const [startTime, setStartTime] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get("start");
    if (s) {
      const d = new Date(s);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "";
  });
  const [endTime, setEndTime] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    const e = p.get("end");
    if (e) {
      const d = new Date(e);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "";
  });
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("credits");

  const { data: room, isLoading } = trpc.rooms.getById.useQuery({ id: roomId });
  const { data: balance } = trpc.credits.balance.useQuery();

  // Show toast if returning from cancelled payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "cancelled") {
      toast.error("Pagamento cancelado. Tente novamente.");
    }
  }, []);

  const createBookingMutation = trpc.bookings.create.useMutation({
    onSuccess: () => {
      toast.success("Reserva criada com sucesso!");
      setLocation("/bookings");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createWithPaymentMutation = trpc.bookings.createWithPayment.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const calculateCost = () => {
    if (!date || !startTime || !endTime || !room) return 0;
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (end <= start) return 0;
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.ceil(room.pricePerHour * hours);
  };

  const cost = calculateCost();
  const hasEnoughCredits = balance !== undefined && balance >= cost && cost > 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const dateVal = formData.get("date") as string;
    const startVal = formData.get("startTime") as string;
    const endVal = formData.get("endTime") as string;

    const startDateTime = new Date(`${dateVal}T${startVal}`);
    const endDateTime = new Date(`${dateVal}T${endVal}`);

    if (startDateTime <= new Date()) {
      toast.error("Não é possível reservar em data ou horário no passado. Escolha um horário a partir de agora.");
      return;
    }

    if (endDateTime <= startDateTime) {
      toast.error("Horário de término deve ser após o horário de início");
      return;
    }

    const payload = {
      roomId,
      startTime: startDateTime,
      endTime: endDateTime,
      patientName: formData.get("patientName") as string,
      privateNotes: (formData.get("notes") as string) || undefined,
    };

    if (paymentMode === "credits") {
      createBookingMutation.mutate(payload);
    } else {
      createWithPaymentMutation.mutate({
        ...payload,
        paymentMethod: paymentMode === "pix" ? "pix" : "card",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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

  const isPending = createBookingMutation.isPending || createWithPaymentMutation.isPending;

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
                  <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2">{room.name}</h3>
                <p className="text-sm text-muted-foreground">{room.description || "Sala de atendimento profissional"}</p>
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
                  <p className="text-sm text-muted-foreground mt-1">{room.equipment.join(", ")}</p>
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
                    min={new Date().toISOString().split("T")[0]}
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
                  <Input id="patientName" name="patientName" required placeholder="Nome completo" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" name="notes" rows={2} placeholder="Informações adicionais (opcional)" />
                </div>

                {/* Cost Summary */}
                {cost > 0 && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Custo estimado:</span>
                      <span className="text-lg font-bold">{formatCurrency(cost)}</span>
                    </div>

                    {/* Payment Mode Selection */}
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Forma de pagamento</p>

                      {/* Option 1: Credits */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode("credits")}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                          paymentMode === "credits"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Wallet className={`h-5 w-5 flex-shrink-0 ${paymentMode === "credits" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Usar créditos</p>
                          <p className="text-xs text-muted-foreground">
                            Saldo disponível:{" "}
                            <span className={balance !== undefined && balance < cost ? "text-destructive font-semibold" : "font-semibold"}>
                              {formatCurrency(balance || 0)}
                            </span>
                          </p>
                        </div>
                        {hasEnoughCredits ? (
                          <BadgeCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                      </button>

                      {/* Option 2: Card */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode("stripe")}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                          paymentMode === "stripe"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <CreditCard className={`h-5 w-5 flex-shrink-0 ${paymentMode === "stripe" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Cartão de crédito</p>
                          <p className="text-xs text-muted-foreground">Checkout seguro via Stripe</p>
                        </div>
                      </button>

                      {/* Option 3: PIX */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode("pix")}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                          paymentMode === "pix"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <QrCode className={`h-5 w-5 flex-shrink-0 ${paymentMode === "pix" ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">PIX</p>
                          <p className="text-xs text-muted-foreground">Pagamento instantâneo via QR Code</p>
                        </div>
                      </button>
                    </div>

                    {paymentMode === "credits" && !hasEnoughCredits && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Saldo insuficiente. Você precisa de mais {formatCurrency(cost - (balance || 0))} em créditos, ou escolha pagar agora.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isPending ||
                    cost === 0 ||
                    (paymentMode === "credits" && !hasEnoughCredits)
                  }
                >
                  {isPending
                    ? "Processando..."
                    : paymentMode === "stripe"
                    ? `Pagar com cartão · ${formatCurrency(cost)}`
                    : paymentMode === "pix"
                    ? `Pagar com PIX · ${formatCurrency(cost)}`
                    : `Confirmar com créditos · ${formatCurrency(cost)}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
