import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Calendar, CreditCard, Clock, Plus, Link as LinkIcon, Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

export default function ProfessionalDashboard() {
  const { user } = useAuth();
  const { data: balance, isLoading: loadingBalance } = trpc.credits.balance.useQuery();
  const { data: upcomingBookings, isLoading: loadingBookings } = trpc.bookings.upcoming.useQuery({ limit: 5 });
  const { data: unreadNotifications } = trpc.notifications.unread.useQuery();

  const portalUrl = (user as any)?.publicProfileSlug
    ? `${window.location.origin}/p/${(user as any).publicProfileSlug}`
    : null;

  const copyPortalLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success("Link copiado!");
  };

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
                <Link href="/bookings" className="text-primary hover:underline">
                  Ver notificações
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Public Profile Link */}
        {portalUrl ? (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 text-sm">Seu portal público está ativo</p>
                  <p className="text-blue-700 text-sm truncate">{portalUrl}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={copyPortalLink} className="border-blue-300 text-blue-700 hover:bg-blue-100">
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copiar
                  </Button>
                  <Button size="sm" variant="outline" asChild className="border-blue-300 text-blue-700 hover:bg-blue-100">
                    <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Abrir
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900 text-sm">Configure seu portal público</p>
                  <p className="text-amber-700 text-xs mt-0.5">Crie um link personalizado para seus pacientes entrarem na lista de espera.</p>
                </div>
                <Button size="sm" variant="outline" asChild className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0">
                  <Link href="/settings">Configurar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                      <Link href="/bookings">Ver Detalhes</Link>
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
