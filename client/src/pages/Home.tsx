import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Calendar, CreditCard, Shield, Bell, TrendingUp, Zap, Building2, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    professionalRegistry: "",
    registryType: "CRP" as "CRP" | "CRM" | "CRO" | "CREFITO" | "COREN" | "Outro",
    cpf: "",
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowRegisterForm(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        professionalRegistry: "",
        registryType: "CRP",
        cpf: "",
      });
      // Redirecionar para login
      setTimeout(() => {
        setLocation('/login');
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  // Se já estiver autenticado, redirecionar baseado no role
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SISA</h1>
            </div>
          </div>
          <Button onClick={() => setLocation('/login')}>Entrar</Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container max-w-6xl mx-auto text-center">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Sistema de Gerenciamento de Salas
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Simplifique o agendamento de suas{" "}
              <span className="text-primary">salas clínicas</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Plataforma completa para profissionais de saúde reservarem salas de atendimento com sistema de créditos, pagamentos automáticos e agenda em tempo real.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" onClick={() => setShowRegisterForm(true)}>
                Começar Agora
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Conhecer Recursos
              </Button>
            </div>
          </div>
        </section>

        {/* Registration Form Section */}
        {showRegisterForm && (
          <section className="py-12 px-4 bg-accent/30" id="register">
            <div className="container max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Cadastro de Profissional
                  </CardTitle>
                  <CardDescription>
                    Preencha seus dados para começar a usar o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="seu@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        placeholder="M\u00ednimo 6 caracteres"
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="registryType">Tipo de Registro *</Label>
                        <Select
                          value={formData.registryType}
                          onValueChange={(value: any) => setFormData({ ...formData, registryType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRP">CRP - Psicólogo</SelectItem>
                            <SelectItem value="CRM">CRM - Médico</SelectItem>
                            <SelectItem value="CRO">CRO - Dentista</SelectItem>
                            <SelectItem value="CREFITO">CREFITO - Fisioterapeuta</SelectItem>
                            <SelectItem value="COREN">COREN - Enfermeiro</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="professionalRegistry">Número do Registro *</Label>
                        <Input
                          id="professionalRegistry"
                          value={formData.professionalRegistry}
                          onChange={(e) => setFormData({ ...formData, professionalRegistry: e.target.value })}
                          required
                          placeholder="123456"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF (opcional)</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="submit" className="flex-1" disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowRegisterForm(false)}
                        disabled={registerMutation.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                      Após o cadastro, você receberá um email de confirmação e poderá fazer login no sistema.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-20 px-4 bg-accent/30" id="features">
          <div className="container max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Recursos Principais</h2>
              <p className="text-muted-foreground">
                Tudo que você precisa para gerenciar suas reservas de forma eficiente
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Calendar className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Agenda em Tempo Real</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Visualize disponibilidade de salas estilo Google Calendar com bloqueio automático e prevenção de conflitos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CreditCard className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Sistema de Créditos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Compre créditos antecipadamente, ganhe por cancelamento no prazo e pague automaticamente ao reservar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Controle de Acesso</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Perfis diferenciados para Admin, Profissional, Recepcionista e Financeiro com proteção de dados sensíveis
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Cancelamento Flexível</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Regras configuráveis de reembolso baseadas no prazo de cancelamento com devolução automática de créditos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Relatórios Gerenciais</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Taxa de ocupação, faturamento por profissional, horários mais disputados e ranking de uso
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Bell className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Notificações Automáticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Confirmações, lembretes, alertas de cancelamento e cobranças via email e notificações in-app
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Faça login agora e comece a gerenciar suas reservas de forma profissional
            </p>
            <Button size="lg" onClick={() => setLocation('/login')}>
              Acessar Plataforma
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 SISA - Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
