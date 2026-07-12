import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Building2, Clock, Users, Plus, Pencil, Trash2, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Tab = "geral" | "usuarios";

type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  permissions: {
    canViewBookings: boolean;
    canViewProfessionals: boolean;
    canViewRooms: boolean;
    canCheckIn: boolean;
  };
};

const PERM_LABELS: { key: keyof StaffUser["permissions"]; label: string; desc: string }[] = [
  { key: "canViewBookings",       label: "Ver Reservas",         desc: "Consultar agenda e reservas do dia" },
  { key: "canViewProfessionals",  label: "Ver Profissionais",    desc: "Listar profissionais, especialidades e atualizar contato" },
  { key: "canViewRooms",          label: "Ver Salas",            desc: "Consultar salas e disponibilidade" },
  { key: "canCheckIn",            label: "Registrar Check-in",   desc: "Confirmar chegada de pacientes" },
];

const DEFAULT_PERMS: StaffUser["permissions"] = {
  canViewBookings: true,
  canViewProfessionals: true,
  canViewRooms: true,
  canCheckIn: true,
};

export default function TenantSettings() {
  const [tab, setTab] = useState<Tab>("geral");

  // ── General settings ─────────────────────────────────────────────────────────
  const { data: tenant, isLoading, refetch } = trpc.tenants.current.useQuery();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    cancellationWindowHours: 12,
    lateArrivalToleranceMinutes: 15,
  });

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        address: tenant.address || "",
        cancellationWindowHours: tenant.cancellationWindowHours ?? 12,
        lateArrivalToleranceMinutes: tenant.lateArrivalToleranceMinutes ?? 15,
      });
    }
  }, [tenant]);

  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => { toast.success("Configurações salvas!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  // ── Staff management ──────────────────────────────────────────────────────────
  const { data: staffList = [], refetch: refetchStaff } = trpc.staff.list.useQuery();
  const createStaff = trpc.staff.create.useMutation({ onSuccess: () => { toast.success("Usuário criado!"); refetchStaff(); setShowCreate(false); }, onError: (e) => toast.error(e.message) });
  const updateStaff = trpc.staff.update.useMutation({ onSuccess: () => { toast.success("Usuário atualizado!"); refetchStaff(); setEditUser(null); }, onError: (e) => toast.error(e.message) });
  const resetPwd   = trpc.staff.resetPassword.useMutation({ onSuccess: () => { toast.success("Senha redefinida!"); setResetUser(null); }, onError: (e) => toast.error(e.message) });
  const removeStaff = trpc.staff.remove.useMutation({ onSuccess: () => { toast.success("Usuário removido!"); refetchStaff(); setDeleteUser(null); }, onError: (e) => toast.error(e.message) });

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [resetUser, setResetUser] = useState<StaffUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<StaffUser | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "receptionist" as "receptionist" | "financial", permissions: { ...DEFAULT_PERMS } });
  const [editForm, setEditForm] = useState<{ name: string; role: "receptionist" | "financial"; permissions: StaffUser["permissions"] }>({ name: "", role: "receptionist", permissions: { ...DEFAULT_PERMS } });
  const [newPwd, setNewPwd] = useState("");

  function openEdit(u: StaffUser) {
    setEditUser(u);
    setEditForm({ name: u.name, role: u.role as "receptionist" | "financial", permissions: { ...u.permissions } });
  }

  const roleLabel = (r: string) => r === "receptionist" ? "Recepcionista" : "Financeiro";
  const roleColor = (r: string) => r === "receptionist" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 mt-1">Gerencie as informações, políticas e usuários da sua clínica.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {([["geral", "Geral", Settings], ["usuarios", "Usuários Internos", Users]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key as Tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-[#7C5C4A] text-[#7C5C4A]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Geral ─────────────────────────────────────────────────────────── */}
        {tab === "geral" && (
          isLoading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#7C5C4A]" />
                    Informações da Clínica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da clínica</Label>
                    <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da clínica" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contato@clinica.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#7C5C4A]" />
                    Políticas de Cancelamento e Tolerância
                  </CardTitle>
                  <CardDescription>Configure as regras de cancelamento e tolerância de atraso.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Janela de cancelamento (horas antes)</Label>
                    <div className="flex items-center gap-3">
                      <Input type="number" min={0} max={168} value={form.cancellationWindowHours} onChange={e => setForm(p => ({ ...p, cancellationWindowHours: parseInt(e.target.value) || 0 }))} className="w-32" />
                      <span className="text-sm text-gray-500">horas antes do início da reserva</span>
                    </div>
                    <p className="text-xs text-gray-400">Cancelamentos feitos com menos de {form.cancellationWindowHours}h de antecedência não receberão reembolso.</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Tolerância de atraso (minutos)</Label>
                    <div className="flex items-center gap-3">
                      <Input type="number" min={0} max={60} value={form.lateArrivalToleranceMinutes} onChange={e => setForm(p => ({ ...p, lateArrivalToleranceMinutes: parseInt(e.target.value) || 0 }))} className="w-32" />
                      <span className="text-sm text-gray-500">minutos de tolerância de atraso</span>
                    </div>
                    <p className="text-xs text-gray-400">Após {form.lateArrivalToleranceMinutes} minutos sem check-in, a reserva pode ser marcada como no-show.</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="bg-[#7C5C4A] hover:bg-[#6a4e3e] text-white">
                  {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </>
          )
        )}

        {/* ── Tab: Usuários Internos ─────────────────────────────────────────────── */}
        {tab === "usuarios" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Usuários Internos</h2>
                <p className="text-sm text-gray-500">Recepcionistas e equipe financeira com acesso ao sistema.</p>
              </div>
              <Button onClick={() => { setCreateForm({ name: "", email: "", password: "", role: "receptionist", permissions: { ...DEFAULT_PERMS } }); setShowCreate(true); }} className="bg-[#7C5C4A] hover:bg-[#6a4e3e] text-white gap-2">
                <Plus className="h-4 w-4" /> Novo Usuário
              </Button>
            </div>

            {staffList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Nenhum usuário interno cadastrado</p>
                  <p className="text-sm mt-1">Crie recepcionistas ou equipe financeira para acessar o sistema.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(staffList as StaffUser[]).map((u) => (
                  <Card key={u.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{u.name}</span>
                            <Badge className={`text-xs ${roleColor(u.role)}`}>{roleLabel(u.role)}</Badge>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {PERM_LABELS.filter(p => u.permissions[p.key]).map(p => (
                              <span key={p.key} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.label}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setResetUser(u); setNewPwd(""); }} title="Redefinir senha"><KeyRound className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteUser(u)} title="Remover" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Dialog: Criar usuário ─────────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#7C5C4A]" /> Novo Usuário Interno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome completo</Label>
                <Input value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Maria da Silva" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="maria@clinica.com" />
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={createForm.role} onValueChange={v => setCreateForm(p => ({ ...p, role: v as "receptionist" | "financial" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Senha inicial</Label>
                <div className="relative">
                  <Input type={showPwd ? "text" : "password"} value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" className="pr-10" />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Permissões de acesso</p>
              <div className="space-y-3">
                {PERM_LABELS.map(p => (
                  <div key={p.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </div>
                    <Switch checked={createForm.permissions[p.key]} onCheckedChange={v => setCreateForm(prev => ({ ...prev, permissions: { ...prev.permissions, [p.key]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createStaff.mutate(createForm)} disabled={createStaff.isPending} className="bg-[#7C5C4A] hover:bg-[#6a4e3e] text-white">
              {createStaff.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar usuário ────────────────────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-[#7C5C4A]" /> Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome completo</Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Perfil</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v as "receptionist" | "financial" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Permissões de acesso</p>
              <div className="space-y-3">
                {PERM_LABELS.map(p => (
                  <div key={p.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.label}</p>
                      <p className="text-xs text-gray-500">{p.desc}</p>
                    </div>
                    <Switch checked={editForm.permissions[p.key]} onCheckedChange={v => setEditForm(prev => ({ ...prev, permissions: { ...prev.permissions, [p.key]: v } }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={() => editUser && updateStaff.mutate({ id: editUser.id, ...editForm })} disabled={updateStaff.isPending} className="bg-[#7C5C4A] hover:bg-[#6a4e3e] text-white">
              {updateStaff.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Redefinir senha ───────────────────────────────────────────── */}
      <Dialog open={!!resetUser} onOpenChange={v => !v && setResetUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-[#7C5C4A]" /> Redefinir Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">Nova senha para <strong>{resetUser?.name}</strong>:</p>
            <div className="relative">
              <Input type={showPwd ? "text" : "password"} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" className="pr-10" />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>Cancelar</Button>
            <Button onClick={() => resetUser && resetPwd.mutate({ id: resetUser.id, newPassword: newPwd })} disabled={resetPwd.isPending || newPwd.length < 6} className="bg-[#7C5C4A] hover:bg-[#6a4e3e] text-white">
              {resetPwd.isPending ? "Salvando..." : "Redefinir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Remover usuário ──────────────────────────────────────── */}
      <AlertDialog open={!!deleteUser} onOpenChange={v => !v && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário <strong>{deleteUser?.name}</strong> perderá o acesso imediatamente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUser && removeStaff.mutate({ id: deleteUser.id })} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
