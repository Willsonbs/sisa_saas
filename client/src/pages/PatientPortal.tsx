import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { User, Phone, Mail, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const LGPD_CONSENT_TEXT = `Ao preencher este formulário, você consente com o tratamento dos seus dados pessoais (nome e contato) pela clínica para fins de contato sobre disponibilidade de horários. Seus dados serão utilizados exclusivamente para este fim, conforme a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato com a clínica.`;

export default function PatientPortal() {
  const { slug } = useParams<{ slug: string }>();
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [formData, setFormData] = useState({
    patientName: "",
    patientContact: "",
    contactType: "email" as "email" | "phone" | "whatsapp",
    preferredDays: [] as string[],
    preferredTimeStart: "",
    preferredTimeEnd: "",
    notes: "",
    consentGiven: false,
  });

  const { data: professional, isLoading, error } = trpc.portal.getProfessionalBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const addToWaitlist = trpc.waitlist.add.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada! Entraremos em contato quando houver disponibilidade.");
      setShowWaitlistForm(false);
      setFormData({
        patientName: "",
        patientContact: "",
        contactType: "email",
        preferredDays: [],
        preferredTimeStart: "",
        preferredTimeEnd: "",
        notes: "",
        consentGiven: false,
      });
    },
    onError: (err) => {
      toast.error(`Erro ao enviar solicitação: ${err.message}`);
    },
  });

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const handleSubmit = () => {
    if (!formData.patientName || !formData.patientContact) {
      toast.error("Preencha nome e contato");
      return;
    }
    if (!formData.consentGiven) {
      toast.error("Aceite o termo de consentimento LGPD");
      return;
    }
    if (!professional) return;

    addToWaitlist.mutate({
      tenantId: professional.tenantId || 1,
      professionalId: professional.id,
      patientName: formData.patientName,
      patientContact: formData.patientContact,
      contactType: formData.contactType,
      preferredDays: formData.preferredDays,
      preferredTimeStart: formData.preferredTimeStart || undefined,
      preferredTimeEnd: formData.preferredTimeEnd || undefined,
      notes: formData.notes || undefined,
      consentGiven: formData.consentGiven,
      consentText: LGPD_CONSENT_TEXT,
    });
  };

  const DAYS_OF_WEEK = [
    { value: "monday", label: "Seg" },
    { value: "tuesday", label: "Ter" },
    { value: "wednesday", label: "Qua" },
    { value: "thursday", label: "Qui" },
    { value: "friday", label: "Sex" },
    { value: "saturday", label: "Sáb" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profissional não encontrado</h2>
            <p className="text-gray-500">O perfil que você está procurando não existe ou foi removido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">SISA</h1>
            <p className="text-xs text-gray-500">Sistema de Gerenciamento de Salas</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Professional Profile Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-24"></div>
          <CardContent className="pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-8">
              <div className="w-16 h-16 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1 pb-1">
                <h2 className="text-2xl font-bold text-gray-900">{professional.name}</h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  {professional.specialty && (
                    <Badge variant="secondary">{professional.specialty}</Badge>
                  )}
                  {professional.registryType && professional.professionalRegistry && (
                    <Badge variant="outline">
                      {professional.registryType} {professional.professionalRegistry}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {professional.bio && (
              <div className="mt-4">
                <p className="text-gray-600 leading-relaxed">{professional.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waitlist Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Lista de Espera
            </CardTitle>
            <CardDescription>
              Não encontrou um horário disponível? Cadastre-se na lista de espera e entraremos em contato quando houver disponibilidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showWaitlistForm ? (
              <div className="text-center py-4">
                <Calendar className="h-12 w-12 text-blue-200 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">
                  Clique no botão abaixo para se cadastrar na lista de espera deste profissional.
                </p>
                <Button onClick={() => setShowWaitlistForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Calendar className="h-4 w-4 mr-2" />
                  Entrar na Lista de Espera
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientName">Nome completo *</Label>
                    <Input
                      id="patientName"
                      placeholder="Seu nome"
                      value={formData.patientName}
                      onChange={e => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientContact">Contato *</Label>
                    <Input
                      id="patientContact"
                      placeholder="Email ou telefone"
                      value={formData.patientContact}
                      onChange={e => setFormData(prev => ({ ...prev, patientContact: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de contato preferido</Label>
                  <Select
                    value={formData.contactType}
                    onValueChange={v => setFormData(prev => ({ ...prev, contactType: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> E-mail</span>
                      </SelectItem>
                      <SelectItem value="phone">
                        <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> Telefone</span>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> WhatsApp</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dias preferidos (opcional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayToggle(day.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          formData.preferredDays.includes(day.value)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeStart">Horário preferido (início)</Label>
                    <Input
                      id="timeStart"
                      type="time"
                      value={formData.preferredTimeStart}
                      onChange={e => setFormData(prev => ({ ...prev, preferredTimeStart: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeEnd">Horário preferido (fim)</Label>
                    <Input
                      id="timeEnd"
                      type="time"
                      value={formData.preferredTimeEnd}
                      onChange={e => setFormData(prev => ({ ...prev, preferredTimeEnd: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Alguma informação adicional que queira compartilhar..."
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Separator />

                {/* LGPD Consent */}
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Consentimento LGPD
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{LGPD_CONSENT_TEXT}</p>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={formData.consentGiven}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, consentGiven: !!checked }))}
                    />
                    <Label htmlFor="consent" className="text-sm font-medium cursor-pointer">
                      Li e concordo com o tratamento dos meus dados conforme descrito acima.
                    </Label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowWaitlistForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={addToWaitlist.isPending || !formData.consentGiven}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {addToWaitlist.isPending ? "Enviando..." : "Entrar na Lista de Espera"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 pb-4">
          <p>Powered by <strong>SISA</strong> — Sistema de Gerenciamento de Salas</p>
          <p className="mt-1">Seus dados são protegidos pela LGPD (Lei nº 13.709/2018)</p>
        </div>
      </main>
    </div>
  );
}
