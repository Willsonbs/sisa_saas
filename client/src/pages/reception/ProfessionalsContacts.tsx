import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, Pencil, Phone, Mail, Award, Search } from "lucide-react";

// Remove acentos para busca mais tolerante, igual ao Painel de Recepção
function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ProfessionalsContacts() {
  const [search, setSearch] = useState("");
  const [editProf, setEditProf] = useState<{ id: number; name: string; phone: string | null } | null>(null);
  const [phoneInput, setPhoneInput] = useState("");

  const utils = trpc.useUtils();
  const { data: professionals = [], isLoading } = trpc.reception.professionalsContacts.useQuery();

  const updateMutation = trpc.reception.updateProfessionalContact.useMutation({
    onSuccess: () => {
      toast.success("Telefone atualizado.");
      setEditProf(null);
      utils.reception.professionalsContacts.invalidate();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar telefone."),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return professionals;
    const q = normalize(search);
    return professionals.filter(
      (p) => normalize(p.name ?? "").includes(q) || normalize(p.specialty ?? "").includes(q)
    );
  }, [professionals, search]);

  function openEdit(p: { id: number; name: string; phone: string | null }) {
    setEditProf(p);
    setPhoneInput(p.phone ?? "");
  }

  function saveEdit() {
    if (!editProf) return;
    if (phoneInput.trim().length < 8) {
      toast.error("Informe um telefone válido.");
      return;
    }
    updateMutation.mutate({ professionalId: editProf.id, phone: phoneInput.trim() });
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-[#7C5C4A]" />
            Profissionais
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Consulte os profissionais cadastrados e atualize o telefone de contato.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou especialidade..."
            className="pl-10 h-11 text-base"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500">
                {search ? "Nenhum profissional encontrado para esta busca" : "Nenhum profissional cadastrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{p.name}</span>
                      {p.specialty && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Award className="h-3 w-3" /> {p.specialty}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {p.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {p.phone || "Sem telefone cadastrado"}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="self-start sm:self-center">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar telefone
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: editar telefone */}
      <Dialog open={!!editProf} onOpenChange={(v) => !v && setEditProf(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#7C5C4A]" />
              Editar telefone
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone de {editProf?.name}</Label>
            <Input
              id="phone"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditProf(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
