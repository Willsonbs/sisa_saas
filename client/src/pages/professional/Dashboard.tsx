import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, CreditCard, Clock, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

export default function ProfessionalDashboard() {
  const { data: balance, isLoading: loadingBalance } = trpc.credits.balance.useQuery();
  const { data: upcomingBookings, isLoading: loadingBookings } = trpc.bookings.upcoming.useQuery({ limit: 5 });
  const { data: unreadNotifications } = trpc.notifications.unread.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel de controle</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo de Créditos</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingBalance ? (
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(balance || 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                <Link href="/credits" className="text-primary hover:underline">
                  Comprar mais créditos
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximas Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">{upcomingBookings?.length || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                <Link href="/bookings" className="text-primary hover:underline">
                  Ver todas
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notificações</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadNotifications?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <Link href="/notifications" className="text-primary hover:underline">
                  Ver todas
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button asChild>
              <Link href="/rooms">
                <Calendar className="mr-2 h-4 w-4" />
                Nova Reserva
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
                Ver Minhas Reservas
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Reservas</CardTitle>
            <CardDescription>Suas reservas agendadas para os próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBookings ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : upcomingBookings && upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{booking.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.startTime).toLocaleString('pt-BR', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/bookings/${booking.id}`}>Ver Detalhes</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma reserva agendada</p>
                <Button className="mt-4" asChild>
                  <Link href="/rooms">Fazer uma Reserva</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
