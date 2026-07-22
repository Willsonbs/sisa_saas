import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Link, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function ProfessionalSettings() {
  const { user, refetch } = useAuth() as any;
  const [form, setForm] = useState({
    name: "",
    phone: "",
    specialty: "",
    professionalRegistry: "",
    registryType: "",
    bio: "",
    publicProfileSlug: "",
    cpf: "",
    cnpj: "",
    address: "",
    appointmentDurationMinutes: 60,
  });
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    if (user) {
      // Auto-generate slug from name if not set
      const autoSlug = user.publicProfileSlug || 
        (user.name ? user.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '');
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        specialty: user.specialty || "",
        professionalRegistry: user.professionalRegistry || "",
        registryType: user.registryType || "",
        bio: user.bio || "",
        publicProfileSlug: autoSlug,
        cpf: user.cpf || "",
        cnpj: user.cnpj || "",
        address: user.address || "",
        appointmentDurationMinutes: user.appointmentDurationMinutes || 60,
      });
    }
  }, [user]);

  const updateMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      if (refetch) refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const checkSlugMutation = trpc.auth.checkSlug.useMutation({
    onSuccess: (data: any) => {
      setSlugAvailable(data.available);
      setCheckingSlug(false);
    },
    onError: () => {
      setCheckingSlug(false);
    },
  });

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-");
    setForm(p => ({ ...p, publicProfileSlug: sanitized }));
    setSlugAvailable(null);
  };

  const handleCheckSlug = () => {
    if (!form.publicProfileSlug || form.publicProfileSlug.length < 3) {
      toast.error("O slug deve ter pelo menos 3 caracteres");
      return;
    }
    setCheckingSlug(true);
    checkSlugMutation.mutate({ slug: form.publicProfileSlug });
  };

  const copyPortalLink = () => {
    if (!form.publicProfileSlug) {
      toast.error("Configure seu slug primeiro");
      return;
    }
    const url = `${window.location.origin}/p/${form.publicProfileSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateMutation.mutate(form);
  };

  const portalUrl = form.publicProfileSlug
    ? `${window.location.origin}/p/${form.publicProfileSlug}`
    : null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações do Perfil</h1>
          <p className="text-gray-500 mt-1">Gerencie suas informações profissionais e link público.</p>
        </div>

        {/* Portal Link Card */}
        {form.publicProfileSlug && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Link className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 text-sm">Seu link público</p>
                  <p className="text-blue-700 text-sm truncate mt-0.5">{portalUrl}</p>
                  <p className="text-blue-500 text-xs mt-1">
                    Compartilhe este link com seus pacientes para que eles possam entrar na lista de espera.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyPortalLink}
                  className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={form.cpf}
                  onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Profissionais</CardTitle>
            <CardDescription>
              Estas informações serão exibidas no seu perfil público.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Especialidade</Label>
              <Input
                value={form.specialty}
                onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
                placeholder="Ex: Psicologia, Fisioterapia, Odontologia..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de registro</Label>
                <Input
                  value={form.registryType}
                  onChange={e => setForm(p => ({ ...p, registryType: e.target.value }))}
                  placeholder="CRP, CRM, CRO..."
                />
              </div>
              <div className="space-y-2">
                <Label>Número do registro</Label>
                <Input
                  value={form.professionalRegistry}
                  onChange={e => setForm(p => ({ ...p, professionalRegistry: e.target.value }))}
                  placeholder="00/00000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração padrão de atendimento (minutos)</Label>
              <Input
                type="number"
                min={15}
                max={480}
                step={5}
                value={form.appointmentDurationMinutes}
                onChange={e => setForm(p => ({ ...p, appointmentDurationMinutes: Number(e.target.value) || 60 }))}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Usado para dividir automaticamente uma reserva de sala em atendimentos (ex: "Gerar auto" em Minhas Reservas).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Bio / Apresentação</Label>
              <Textarea
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Escreva uma breve apresentação sobre você e sua prática profissional..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Public Profile Slug */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-blue-600" />
              Link Público (Portal do Paciente)
            </CardTitle>
            <CardDescription>
              Configure o endereço personalizado do seu portal público. Pacientes podem entrar na sua lista de espera através deste link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Slug (identificador único)</Label>
              <div className="flex gap-2">
                <div className="flex items-center bg-gray-50 border border-r-0 rounded-l-md px-3 text-sm text-gray-500 whitespace-nowrap">
                  {window.location.origin}/p/
                </div>
                <Input
                  value={form.publicProfileSlug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="seu-nome"
                  className="rounded-l-none flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleCheckSlug}
                  disabled={checkingSlug || !form.publicProfileSlug}
                >
                  {checkingSlug ? "Verificando..." : "Verificar"}
                </Button>
              </div>
              {slugAvailable === true && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Slug disponível!
                </p>
              )}
              {slugAvailable === false && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Este slug já está em uso. Tente outro.
                </p>
              )}
              <p className="text-xs text-gray-400">
                Use apenas letras minúsculas, números e hífens. Mínimo 3 caracteres.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
