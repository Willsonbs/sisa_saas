import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === 'super_admin') setLocation('/sisa/dashboard');
      else if (user.role === 'admin') setLocation('/admin');
      else if (user.role === 'receptionist' || user.role === 'financial') setLocation('/reception');
      else setLocation('/dashboard');
    }
  }, [isAuthenticated, user, loading, setLocation]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success("Login realizado com sucesso!");
      setTimeout(() => {
        if (data.user.role === 'super_admin') {
          window.location.href = '/sisa/dashboard';
        } else if (data.user.role === 'admin') {
          window.location.href = '/admin';
        } else if (data.user.role === 'receptionist' || data.user.role === 'financial') {
          window.location.href = '/reception';
        } else {
          window.location.href = '/dashboard';
        }
      }, 500);
    },
    onError: (error) => {
      toast.error(error.message || "Email ou senha inválidos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  const fillDemo = (email: string, password: string) => {
    setFormData({ email, password });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#7C5C4A] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F3EF] p-4"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Back to home */}
      <div className="w-full max-w-md mb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#6B6560] hover:text-[#3D3D2E] transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-lg bg-[#7C5C4A] flex items-center justify-center">
            <Building2 className="h-7 w-7 text-[#F5F3EF]" />
          </div>
          <h1 className="font-bold text-2xl text-[#3D3D2E]">SISA</h1>
        </div>
        <p className="text-[#6B6560]">Sistema de Gerenciamento de Salas</p>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-[#3D3D2E]">Entrar no Sistema</CardTitle>
          <CardDescription>
            Digite seu email e senha para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#3D3D2E]">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="seu@email.com"
                autoComplete="email"
                className="border-[#E8E4DF] focus:border-[#7C5C4A]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#3D3D2E]">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="border-[#E8E4DF] focus:border-[#7C5C4A] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6560] hover:text-[#3D3D2E]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#7C5C4A] hover:bg-[#5A3F30] text-[#F5F3EF]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8E4DF]" />
            </div>
            <div className="relative flex justify-center text-xs text-[#6B6560] bg-white px-2">
              ou
            </div>
          </div>

          {/* Register link */}
          <div className="text-center">
            <p className="text-sm text-[#6B6560] mb-2">Ainda não tem uma conta?</p>
            <Link href="/#register">
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#7C5C4A] text-[#7C5C4A] hover:bg-[#7C5C4A]/10"
                onClick={() => {
                  setLocation('/');
                  setTimeout(() => {
                    const el = document.getElementById('register-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              >
                Criar conta de profissional
              </Button>
            </Link>
          </div>

          {/* Demo credentials */}
          <div className="rounded-lg bg-[#C8C8E8]/30 border border-[#C8C8E8] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#3D3D2E] uppercase tracking-wide">Acesso de demonstração</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fillDemo('empresa@example.com', 'admin@123')}
                className="w-full text-left rounded-md bg-white border border-[#E8E4DF] px-3 py-2 hover:border-[#7C5C4A] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#3D3D2E]">Empresa</p>
                    <p className="text-xs text-[#6B6560]">empresa@example.com · admin@123</p>
                  </div>
                  <span className="text-xs text-[#7C5C4A] opacity-0 group-hover:opacity-100 transition-opacity">Usar →</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('profissional@example.com', 'Mudar@123')}
                className="w-full text-left rounded-md bg-white border border-[#E8E4DF] px-3 py-2 hover:border-[#7C5C4A] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#3D3D2E]">Profissional</p>
                    <p className="text-xs text-[#6B6560]">profissional@example.com · Mudar@123</p>
                  </div>
                  <span className="text-xs text-[#7C5C4A] opacity-0 group-hover:opacity-100 transition-opacity">Usar →</span>
                </div>
              </button>
            </div>
            <p className="text-xs text-[#6B6560]">Clique em uma opção para preencher automaticamente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
