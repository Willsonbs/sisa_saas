import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Circle, Calendar, CreditCard, Shield, Bell, TrendingUp, Zap, Building2, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";

const features = [
  { title: "Reservas em tempo real", description: "Verifique disponibilidade e reserve salas instantaneamente, sem conflitos de agenda ou ligações desnecessárias." },
  { title: "Sistema de créditos flexível", description: "Compre pacotes de créditos e use conforme sua demanda. Sem mensalidades fixas, pague apenas pelo que usar." },
  { title: "Lembretes automáticos", description: "Receba notificações 24h e 2h antes de cada reserva. Reduza faltas e maximize o aproveitamento das salas." },
  { title: "Portal do paciente", description: "Compartilhe seu link personalizado para que pacientes entrem na sua lista de espera com consentimento LGPD." },
  { title: "Relatórios e auditoria", description: "Acompanhe ocupação, faturamento e histórico de ações com relatórios exportáveis e trilha de auditoria completa." },
];

const sectors = [
  {
    title: "Psicologia e\nPsicanálise",
    description: "Salas climatizadas com isolamento acústico, mobiliário confortável e privacidade total para atendimentos clínicos.",
    bg: "bg-[#C8C8E8]",
    text: "text-[#3D3D2E]",
    dot: "bg-[#3D3D2E]",
    divider: "border-[#3D3D2E]/20",
  },
  {
    title: "Fisioterapia e\nReabilitação",
    description: "Espaços amplos com equipamentos disponíveis e estrutura adaptada para diferentes modalidades de tratamento.",
    bg: "bg-white",
    text: "text-[#3D3D2E]",
    dot: "bg-[#3D3D2E]",
    divider: "border-[#3D3D2E]/20",
  },
  {
    title: "Nutrição e\nConsultoria",
    description: "Ambientes profissionais e discretos para consultas, avaliações e acompanhamento nutricional personalizado.",
    bg: "bg-[#7C5C4A]",
    text: "text-[#F5F3EF]",
    dot: "bg-[#3D3D2E]",
    divider: "border-white/20",
  },
];

const testimonials = [
  { quote: "O SISA transformou minha rotina. Reservo salas em segundos e nunca mais tive conflito de agenda.", author: "Dra. Ana Lima", role: "Psicóloga" },
  { quote: "O sistema de créditos é perfeito para quem tem demanda variável. Pago só pelo que uso.", author: "Dr. Carlos Melo", role: "Fisioterapeuta" },
  { quote: "O portal do paciente facilitou muito a lista de espera. Meus pacientes adoraram.", author: "Dra. Beatriz Santos", role: "Nutricionista" },
];

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", phone: "",
    professionalRegistry: "",
    registryType: "CRP" as "CRP" | "CRM" | "CRO" | "CREFITO" | "COREN" | "Outro",
    cpf: "",
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowRegisterForm(false);
      setFormData({ name: "", email: "", password: "", phone: "", professionalRegistry: "", registryType: "CRP", cpf: "" });
      setTimeout(() => setLocation('/login'), 2000);
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation(user.role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#7C5C4A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E8E4DF]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="bg-[#7C5C4A] text-[#F5F3EF] px-4 py-1.5 text-sm font-medium rounded-sm tracking-wide">
            SISA
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#6B6560]">
            <a href="#sobre" className="hover:text-[#3D3D2E] transition-colors">Sobre</a>
            <a href="#funcionalidades" className="hover:text-[#3D3D2E] transition-colors">Funcionalidades</a>
            <a href="#setores" className="hover:text-[#3D3D2E] transition-colors">Especialidades</a>
            <a href="#contato" className="hover:text-[#3D3D2E] transition-colors">Contato</a>
          </div>
          {user ? (
            <Link href={user.role === "admin" ? "/admin" : "/dashboard"}
              className="text-sm underline underline-offset-4 text-[#7C5C4A] hover:text-[#5A3F30] transition-colors">
              Ir para o painel →
            </Link>
          ) : (
            <Link href="/login"
              className="text-sm underline underline-offset-4 text-[#7C5C4A] hover:text-[#5A3F30] transition-colors">
              Entrar na rede
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative bg-[#3D3D2E] text-white overflow-hidden" style={{ minHeight: "88vh" }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 15% 60%, rgba(200,200,232,0.15) 0%, transparent 50%),
                         radial-gradient(circle at 85% 20%, rgba(124,92,74,0.25) 0%, transparent 40%)`,
          }} />
        <div className="relative max-w-7xl mx-auto px-6 flex flex-col justify-between" style={{ minHeight: "88vh", paddingTop: "6rem", paddingBottom: "4rem" }}>
          <div className="flex items-start justify-between">
            <span className="text-[#C8C8E8] text-sm tracking-wide">Junte-se à nossa rede</span>
            <button
              onClick={() => document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 bg-white text-[#3D3D2E] rounded-full px-5 py-2 text-sm font-medium hover:bg-[#F5F3EF] transition-colors">
              <Circle className="h-2 w-2 fill-current" />
              Saiba mais
            </button>
          </div>
          <div className="mt-auto pt-16">
            <h1 className="text-[clamp(3.5rem,10vw,8rem)] font-light leading-none tracking-tight">
              Simplifique
              <br />
              <span className="text-[#C8C8E8]">suas salas</span>
              <br />
              clínicas
            </h1>
            <p className="mt-8 text-[#A8A49E] text-lg max-w-lg font-light leading-relaxed">
              Plataforma completa para profissionais de saúde reservarem salas de atendimento com sistema de créditos, pagamentos automáticos e agenda em tempo real.
            </p>
            <div className="mt-10 flex gap-4 flex-wrap">
              <button
                onClick={() => setShowRegisterForm(true)}
                className="flex items-center gap-2 bg-[#7C5C4A] text-[#F5F3EF] rounded-full px-6 py-3 text-sm font-medium hover:bg-[#5A3F30] transition-colors">
                <Circle className="h-2 w-2 fill-current" />
                Começar agora
              </button>
              <Link href="/login"
                className="flex items-center gap-2 border border-white/30 text-white rounded-full px-6 py-3 text-sm font-medium hover:border-white/60 transition-colors">
                Já tenho conta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Register Form ──────────────────────────────────────────── */}
      {showRegisterForm && (
        <section className="py-16 px-6 bg-[#C8C8E8]/30 border-b border-[#C8C8E8]" id="register">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#3D3D2E]">
                  <UserPlus className="h-5 w-5 text-[#7C5C4A]" />
                  Cadastro de Profissional
                </CardTitle>
                <CardDescription>Preencha seus dados para começar a usar o sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Seu nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="seu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="Mínimo 6 caracteres" minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required placeholder="(00) 00000-0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registryType">Tipo de Registro *</Label>
                      <Select value={formData.registryType} onValueChange={(value: any) => setFormData({ ...formData, registryType: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Input id="professionalRegistry" value={formData.professionalRegistry} onChange={(e) => setFormData({ ...formData, professionalRegistry: e.target.value })} required placeholder="123456" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF (opcional)</Label>
                    <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1 bg-[#7C5C4A] hover:bg-[#5A3F30] text-white rounded-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowRegisterForm(false)} disabled={registerMutation.isPending} className="rounded-full">
                      Cancelar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">Após o cadastro, você receberá um email de confirmação e poderá fazer login no sistema.</p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── About ──────────────────────────────────────────────────── */}
      <section id="sobre" className="bg-white py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-xs text-[#6B6560] mb-3 tracking-widest uppercase">Nossa missão</p>
            <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-light leading-tight text-[#3D3D2E]">Sobre</h2>
            <p className="mt-6 text-[#6B6560] text-lg leading-relaxed font-light">
              O SISA é uma plataforma de gestão de salas clínicas dedicada a transformar a forma como profissionais de saúde organizam seus atendimentos. Nos destacamos pela abordagem centrada no profissional e compromisso com resultados mensuráveis.
            </p>
            <button
              onClick={() => setShowRegisterForm(true)}
              className="mt-10 flex items-center gap-2 bg-[#3D3D2E] text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-[#2A2A1E] transition-colors">
              <Circle className="h-2 w-2 fill-current" />
              Saiba mais
            </button>
          </div>
          <div className="flex justify-end">
            <div className="w-full max-w-sm aspect-[4/3] rounded-xl flex items-center justify-center bg-[#C8C8E8]">
              <div className="text-center p-8">
                <div className="text-5xl font-light text-[#3D3D2E] mb-1">+200</div>
                <div className="text-sm text-[#5A5A4A] mb-6">profissionais ativos</div>
                <div className="text-4xl font-light text-[#3D3D2E] mb-1">98%</div>
                <div className="text-sm text-[#5A5A4A]">satisfação dos usuários</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features (editorial rows) ──────────────────────────────── */}
      <section id="funcionalidades" className="bg-[#C8C8E8] py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-light text-[#3D3D2E] mb-12">Funcionalidades principais</h2>
          <div className="divide-y divide-[#A8A8C8]">
            {features.map((f, i) => (
              <div key={i} className="flex items-center justify-between py-6 gap-8">
                <h3 className="text-xl font-light text-[#3D3D2E] w-64 shrink-0">{f.title}</h3>
                <p className="text-[#5A5A4A] text-sm leading-relaxed flex-1 hidden md:block">{f.description}</p>
                <div className="h-5 w-5 rounded-full bg-[#3D3D2E] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sectors ────────────────────────────────────────────────── */}
      <section id="setores" className="bg-[#3D3D2E] py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-light text-white mb-12">Nosso foco setorial</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {sectors.map((s, i) => (
              <div key={i} className={`${s.bg} ${s.text} rounded-xl p-8 flex flex-col justify-between min-h-64`}>
                <div className="flex items-start justify-between">
                  <h3 className="text-2xl font-light leading-tight whitespace-pre-line">{s.title}</h3>
                  <div className={`h-5 w-5 rounded-full ${s.dot} shrink-0 mt-1`} />
                </div>
                <div>
                  <div className={`border-t ${s.divider} my-4`} />
                  <p className="text-sm leading-relaxed opacity-80">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-light text-[#3D3D2E] leading-tight mb-16">
            O que os profissionais<br />dizem sobre nós
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-[#7C5C4A] text-[#F5F3EF] rounded-xl p-8 flex flex-col justify-between min-h-56">
                <p className="text-sm leading-relaxed font-light">"{t.quote}"</p>
                <p className="mt-6 text-xs text-[#C8C8E8] text-right">{t.author}, {t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section id="contato" className="bg-[#F5F3EF] py-24 px-6 border-t border-[#E8E4DF]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-light text-[#3D3D2E]">Pronto para começar?</h2>
          <div className="flex gap-4 flex-wrap">
            {user ? (
              <Link href={user.role === "admin" ? "/admin" : "/dashboard"}
                className="flex items-center gap-2 bg-[#3D3D2E] text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-[#2A2A1E] transition-colors">
                Ir para o painel <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="flex items-center gap-2 bg-[#3D3D2E] text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-[#2A2A1E] transition-colors">
                  <Circle className="h-2 w-2 fill-current" />
                  Criar conta gratuita
                </button>
                <Link href="/login"
                  className="flex items-center gap-2 border border-[#3D3D2E] text-[#3D3D2E] rounded-full px-6 py-3 text-sm font-medium hover:bg-[#3D3D2E] hover:text-white transition-colors">
                  Já tenho conta
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-[#3D3D2E] text-[#A8A49E] py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm flex-wrap gap-4">
          <div className="bg-[#7C5C4A] text-[#F5F3EF] px-3 py-1 text-xs font-medium rounded-sm tracking-wide">SISA</div>
          <p>© 2026 SISA — Sistema de Gerenciamento de Salas</p>
          <p>Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
