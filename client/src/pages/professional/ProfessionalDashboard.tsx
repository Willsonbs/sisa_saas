import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, CreditCard, Clock, Building2 } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

export default function ProfessionalDashboard() {
  const { data: balance } = trpc.credits.balance.useQuery();
  const { data: upcomingBookings } = trpc.bookings.upcoming.useQuery({ limit: 5 });
  const { data: rooms } = trpc.rooms.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao sistema de gerenciamento de salas</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo de Créditos</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(balance || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Disponível para reservas
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/credits">Comprar Créditos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximas Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Agendamentos futuros
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/bookings">Ver Todas</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Salas Disponíveis</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rooms?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Para reservar agora
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/rooms">Reservar Sala</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Reservas</CardTitle>
            <CardDescription>Seus agendamentos futuros</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Reserva #{booking.id}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(booking.startTime).toLocaleDateString('pt-BR')} •{' '}
                            {new Date(booking.startTime).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(booking.endTime).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/bookings">Detalhes</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma reserva agendada</p>
                <Button className="mt-4" asChild>
                  <Link href="/rooms">Reservar Sala</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button asChild>
              <Link href="/rooms">
                <Building2 className="mr-2 h-4 w-4" />
                Reservar Sala
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/credits">
                <CreditCard className="mr-2 h-4 w-4" />
                Comprar Créditos
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/bookings">
                <Calendar className="mr-2 h-4 w-4" />
                Ver Reservas
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
