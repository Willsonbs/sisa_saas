import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Users, DoorOpen, CalendarCheck,
  Lock, Unlock, Pencil, Check, X, Hash, Calendar, Tag,
  FileText, Phone, Mail, MapPin,
} from "lucide-react";

const TERRACOTTA = "#7C5C4A";
const FOREST     = "#3D3D2E";

const planLabel: Record<string, string> = {
  starter: "Starter", pro: "Pro", business: "Business", enterprise: "Enterprise",
};

type TenantData = {
  id: number;
  name: string;
  slug: string;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
  plan: string;
  isActive: boolean;
  cancellationWindowMinutes: number;
  lateArrivalToleranceMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  roomCount: number;
  professionalCount: number;
  bookingCount: number;
  subscription?: {
    status: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodStart?: Date | null;
    currentPeriodEnd?: Date | null;
  } | null;
};

type EditForm = {
  name: string;
  legalName: string;
  document: string;
  email: string;
  phone: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  plan: "starter" | "pro" | "business" | "enterprise";
};

function toForm(data: TenantData): EditForm {
  return {
    name: data.name ?? "",
    legalName: data.legalName ?? "",
    document: data.document ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    addressStreet: data.addressStreet ?? "",
    addressNumber: data.addressNumber ?? "",
    addressComplement: data.addressComplement ?? "",
    addressNeighborhood: data.addressNeighborhood ?? "",
    addressCity: data.addressCity ?? "",
    addressState: data.addressState ?? "",
    addressZip: data.addressZip ?? "",
    plan: (data.plan as EditForm["plan"]) ?? "starter",
  };
}

/** Renders a read-only value or an editable input */
function Field({
  label, value, editing, name, form, setForm, type = "text", maxLength, className = "",
}: {
  label: string;
  value: string;
  editing: boolean;
  name: keyof EditForm;
  form: EditForm;
  setForm: (f: EditForm) => void;
  type?: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      {editing ? (
        <Input
          type={type}
          maxLength={maxLength}
          value={form[name] as string}
          onChange={e => setForm({ ...form, [name]: e.target.value })}
          className="h-8 text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-[#3D3D2E]">
          {value || <span className="text-muted-foreground italic font-normal">—</span>}
        </p>
      )}
    </div>
  );
}

/** Section wrapper with icon */
function Section({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 shrink-0" style={{ color: TERRACOTTA }} />
        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: TERRACOTTA }}>{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {children}
      </div>
    </div>
  );
}

export default function SisaTenantDetails() {
  const { id } = useParams<{ id: string }>();
  const tenantId = parseInt(id ?? "0");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [formInitialized, setFormInitialized] = useState(false);

  const { data, isLoading, refetch } = trpc.superAdmin.getTenant.useQuery(
    { id: tenantId },
    { enabled: tenantId > 0 }
  );

  if (data && !formInitialized) {
    setForm(toForm(data));
    setFormInitialized(true);
  }

  const toggleMutation = trpc.superAdmin.toggleTenantStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const updateMutation = trpc.superAdmin.updateTenant.useMutation({
    onSuccess: () => { toast.success("Cadastro atualizado!"); setEditing(false); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form) return;
    updateMutation.mutate({
      id: tenantId,
      name: form.name || undefined,
      legalName: form.legalName || null,
      document: form.document || null,
      email: form.email || null,
      phone: form.phone || null,
      addressStreet: form.addressStreet || null,
      addressNumber: form.addressNumber || null,
      addressComplement: form.addressComplement || null,
      addressNeighborhood: form.addressNeighborhood || null,
      addressCity: form.addressCity || null,
      addressState: form.addressState || null,
      addressZip: form.addressZip || null,
      plan: form.plan,
    });
  };

  const handleCancelEdit = () => {
    if (data) setForm(toForm(data));
    setEditing(false);
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-4 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </SuperAdminLayout>
    );
  }

  if (!data || !form) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-16 text-muted-foreground">Cliente não encontrado</div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-3xl">

        {/* Back */}
        <Link href="/sisa/tenants">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Clientes
          </Button>
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>{data.name}</h1>
            {data.legalName && (
              <p className="text-sm text-muted-foreground mt-0.5">{data.legalName}</p>
            )}
            <p className="text-xs text-muted-foreground">{data.slug}.sisa.com.br</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={data.isActive ? "default" : "secondary"}
              className={data.isActive ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : ""}
            >
              {data.isActive ? "Ativo" : "Inativo"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => toggleMutation.mutate({ id: data.id, isActive: !data.isActive })}
              disabled={toggleMutation.isPending}
            >
              {data.isActive
                ? <><Lock className="h-3.5 w-3.5 text-red-500" />Bloquear</>
                : <><Unlock className="h-3.5 w-3.5 text-green-600" />Ativar</>}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: DoorOpen,      label: "Salas",         value: data.roomCount },
            { icon: Users,         label: "Profissionais", value: data.professionalCount },
            { icon: CalendarCheck, label: "Reservas",      value: data.bookingCount },
            { icon: Building2,     label: "Plano",         value: planLabel[data.plan] ?? data.plan },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="border border-[#D8D0C8]">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: TERRACOTTA }} />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold" style={{ color: FOREST }}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Dados Cadastrais ── */}
        <Card className="border border-[#D8D0C8]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base" style={{ color: FOREST }}>Dados Cadastrais</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" />Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCancelEdit}>
                    <X className="h-3.5 w-3.5" />Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    style={{ backgroundColor: TERRACOTTA, color: "white" }}
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-7">

            {/* ── Seção: Identificação ── */}
            <Section icon={Hash} title="Identificação">
              {/* ID — somente leitura */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">ID</p>
                <p className="text-sm font-medium text-[#3D3D2E]">{data.id}</p>
              </div>

              {/* Datas — somente leitura */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Cadastro / Atualização</p>
                <p className="text-sm font-medium text-[#3D3D2E]">
                  {new Date(data.createdAt).toLocaleDateString("pt-BR")}
                  <span className="text-muted-foreground text-xs ml-2">
                    Atualizado: {new Date(data.updatedAt).toLocaleString("pt-BR")}
                  </span>
                </p>
              </div>

              <Field label="Nome Fantasia *" value={data.name} editing={editing} name="name" form={form} setForm={setForm} />

              {/* Plano */}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Plano</p>
                {editing ? (
                  <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v as EditForm["plan"] })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium text-[#3D3D2E]">{planLabel[data.plan] ?? data.plan}</p>
                )}
              </div>

              <Field label="Nome/Razão Social" value={data.legalName ?? ""} editing={editing} name="legalName" form={form} setForm={setForm} />
              <Field label="CPF/CNPJ" value={data.document ?? ""} editing={editing} name="document" form={form} setForm={setForm} maxLength={18} />
            </Section>

            <hr className="border-[#E8E2DC]" />

            {/* ── Seção: Contato ── */}
            <Section icon={Phone} title="Contato">
              <Field label="E-mail" value={data.email ?? ""} editing={editing} name="email" form={form} setForm={setForm} type="email" />
              <Field label="Telefone" value={data.phone ?? ""} editing={editing} name="phone" form={form} setForm={setForm} />
            </Section>

            <hr className="border-[#E8E2DC]" />

            {/* ── Seção: Endereço ── */}
            <Section icon={MapPin} title="Endereço">
              <Field label="Logradouro" value={data.addressStreet ?? ""} editing={editing} name="addressStreet" form={form} setForm={setForm} className="col-span-2 grid-cols-none" />

              <Field label="Número" value={data.addressNumber ?? ""} editing={editing} name="addressNumber" form={form} setForm={setForm} />
              <Field label="Complemento" value={data.addressComplement ?? ""} editing={editing} name="addressComplement" form={form} setForm={setForm} />

              <Field label="Bairro" value={data.addressNeighborhood ?? ""} editing={editing} name="addressNeighborhood" form={form} setForm={setForm} />
              <Field label="CEP" value={data.addressZip ?? ""} editing={editing} name="addressZip" form={form} setForm={setForm} maxLength={9} />

              {/* Município + UF na mesma linha */}
              <div className="col-span-2 grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Município</p>
                  {editing ? (
                    <Input
                      value={form.addressCity}
                      onChange={e => setForm({ ...form, addressCity: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-[#3D3D2E]">
                      {data.addressCity || <span className="text-muted-foreground italic font-normal">—</span>}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">UF</p>
                  {editing ? (
                    <Input
                      value={form.addressState}
                      maxLength={2}
                      onChange={e => setForm({ ...form, addressState: e.target.value.toUpperCase() })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-medium text-[#3D3D2E]">
                      {data.addressState || <span className="text-muted-foreground italic font-normal">—</span>}
                    </p>
                  )}
                </div>
              </div>
            </Section>

          </CardContent>
        </Card>

        {/* ── Políticas ── */}
        <Card className="border border-[#D8D0C8]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base" style={{ color: FOREST }}>Políticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Janela de Cancelamento</p>
                <p className="font-medium text-[#3D3D2E]">{data.cancellationWindowMinutes} min</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Tolerância de Atraso</p>
                <p className="font-medium text-[#3D3D2E]">{data.lateArrivalToleranceMinutes} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Assinatura ── */}
        {data.subscription && (
          <Card className="border border-[#D8D0C8]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base" style={{ color: FOREST }}>Assinatura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  ["Status", data.subscription.status],
                  ["Stripe Customer", data.subscription.stripeCustomerId ?? "—"],
                  ["Stripe Sub ID", data.subscription.stripeSubscriptionId ?? "—"],
                  ["Início do Período", data.subscription.currentPeriodStart
                    ? new Date(data.subscription.currentPeriodStart).toLocaleDateString("pt-BR") : "—"],
                  ["Fim do Período", data.subscription.currentPeriodEnd
                    ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString("pt-BR") : "—"],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{k}</p>
                    <p className="font-medium text-[#3D3D2E]">{String(v)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </SuperAdminLayout>
  );
}
