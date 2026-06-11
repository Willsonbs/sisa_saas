import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, MapPin, X, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Bookings() {
  const { data: bookings, isLoading, refetch } = trpc.bookings.list.useQuery();
  
  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Reserva cancelada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-700" },
      confirmed: { label: "Confirmada", className: "bg-green-100 text-green-700" },
      cancelled: { label: "Cancelada", className: "bg-red-100 text-red-700" },
      completed: { label: "Concluída", className: "bg-blue-100 text-blue-700" },
    };
    
    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const handleCancel = (bookingId: number) => {
    cancelMutation.mutate({ id: bookingId });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Minhas Reservas</h1>
            <p className="text-muted-foreground">Gerencie seus agendamentos</p>
          </div>
          
          <Button asChild>
            <Link href="/rooms">
              <Plus className="mr-2 h-4 w-4" />
              Nova Reserva
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{booking.room?.name || 'Sala'}</h3>
                          <p className="text-sm text-muted-foreground">
                            Paciente: {booking.patientName}
                          </p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Data
                          </span>
                          <p className="font-medium">
                            {new Date(booking.startTime).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Horário
                          </span>
                          <p className="font-medium">
                            {new Date(booking.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(booking.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Custo</span>
                          <p className="font-medium">{formatCurrency(booking.totalPrice)}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground">Criada em</span>
                          <p className="font-medium">
                            {new Date(booking.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {booking.privateNotes && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Observações:</p>
                          <p className="text-sm">{booking.privateNotes}</p>
                        </div>
                      )}
                    </div>

                    {(booking.status === 'pending_payment' || booking.status === 'confirmed') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground ml-4"
                            disabled={cancelMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar reserva</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja cancelar esta reserva? Dependendo da política da clínica, o reembolso pode não ser possível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Manter reserva</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleCancel(booking.id)}
                            >
                              Cancelar reserva
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma reserva encontrada</p>
              <p className="text-muted-foreground mb-4">
                Você ainda não fez nenhuma reserva
              </p>
              <Button asChild>
                <Link href="/rooms">
                  <Plus className="mr-2 h-4 w-4" />
                  Fazer Primeira Reserva
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
