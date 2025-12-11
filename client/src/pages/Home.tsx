import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Calendar, CreditCard, Shield, Clock, BarChart3, Bell } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      window.location.href = '/admin';
    } else if (user.role === 'professional') {
      window.location.href = '/dashboard';
    } else if (user.role === 'receptionist') {
      window.location.href = '/reception';
    } else if (user.role === 'financial') {
      window.location.href = '/financial';
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SISA</h1>
              <p className="text-xs text-muted-foreground">On Life Clínica</p>
            </div>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>Entrar</a>
          </Button>
        </div>
      </header>

      <section className="container py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            Sistema de Gerenciamento de Salas
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Simplifique o agendamento de suas{" "}
            <span className="text-primary">salas clínicas</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para profissionais de saúde reservarem salas de atendimento
            com sistema de créditos, pagamentos automáticos e agenda em tempo real.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Começar Agora</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">Conhecer Recursos</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="features" className="container py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">Recursos Principais</h3>
            <p className="text-muted-foreground text-lg">
              Tudo que você precisa para gerenciar suas reservas de forma eficiente
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Agenda em Tempo Real</CardTitle>
                <CardDescription>
                  Visualize disponibilidade de salas estilo Google Calendar com bloqueio
                  automático e prevenção de conflitos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Sistema de Créditos</CardTitle>
                <CardDescription>
                  Compre créditos antecipadamente, ganhe por cancelamento no prazo e
                  pague automaticamente ao reservar
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Controle de Acesso</CardTitle>
                <CardDescription>
                  Perfis diferenciados para Admin, Profissional, Recepcionista e Financeiro
                  com proteção de dados sensíveis
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Cancelamento Flexível</CardTitle>
                <CardDescription>
                  Regras configuráveis de reembolso baseadas no prazo de cancelamento
                  com devolução automática de créditos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Relatórios Gerenciais</CardTitle>
                <CardDescription>
                  Taxa de ocupação, faturamento por profissional, horários mais disputados
                  e ranking de uso
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Notificações Automáticas</CardTitle>
                <CardDescription>
                  Confirmações, lembretes, alertas de cancelamento e cobranças via email
                  e notificações in-app
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="container py-20">
        <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center space-y-6">
            <h3 className="text-3xl font-bold">Pronto para começar?</h3>
            <p className="text-lg opacity-90">
              Faça login agora e comece a gerenciar suas reservas de forma profissional
            </p>
            <Button size="lg" variant="secondary" asChild>
              <a href={getLoginUrl()}>Acessar Plataforma</a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t bg-card/50 backdrop-blur-sm py-8">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2024 SISA - On Life Clínica. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
