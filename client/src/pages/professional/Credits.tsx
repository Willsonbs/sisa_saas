import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CreditCard, TrendingUp, Check, Sparkles, QrCode, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// Valor mínimo para compra de créditos avulsos (R$ 50,00)
const MIN_CUSTOM_AMOUNT_REAIS = 50;

// Aceita vírgula ou ponto como separador decimal (ex: "55,45" ou "55.45")
function parseCustomAmount(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  // Se o usuário digitou só com ponto como decimal (ex: "55.45"), o replace de
  // milhar acima não deve remover esse ponto decimal. Tenta a forma mais simples primeiro.
  const direct = Number(raw.trim().replace(",", "."));
  const value = !isNaN(direct) ? direct : Number(normalized);
  if (isNaN(value) || value <= 0) return null;
  return Math.round(value * 100); // retorna em centavos
}

export default function CreditsPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const paymentStatus = params.get("payment");

  const { data: balance, isLoading: loadingBalance, refetch: refetchBalance } = trpc.credits.balance.useQuery();
  const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = trpc.credits.history.useQuery({ limit: 10 });
  const { data: packages } = trpc.credits.packages.useQuery();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [customAmount, setCustomAmount] = useState("");

  const checkoutMutation = trpc.payments.createCheckout.useMutation({
    onSuccess: (data: any) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar checkout"),
  });

  function handleBuyCustomAmount() {
    const cents = parseCustomAmount(customAmount);
    if (cents === null || cents < MIN_CUSTOM_AMOUNT_REAIS * 100) {
      toast.error(`Informe um valor válido, mínimo de ${formatCurrency(MIN_CUSTOM_AMOUNT_REAIS * 100)}.`);
      return;
    }
    checkoutMutation.mutate({ customAmountCents: cents, paymentMethod });
  }

  useEffect(() => {
    if (paymentStatus === "success") {
      toast.success("Pagamento confirmado! Seus créditos serão adicionados em instantes.");
      refetchBalance();
      refetchHistory();
    } else if (paymentStatus === "cancelled") {
      toast.info("Pagamento cancelado.");
    }
  }, [paymentStatus]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Meus Créditos</h1>
          <p className="text-muted-foreground">Gerencie seu saldo e compre mais créditos</p>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
          <CardHeader>
            <CardTitle className="text-white/90">Saldo Atual</CardTitle>
            <CardDescription className="text-white/70">
              Disponível para reservas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBalance ? (
              <div className="h-12 w-40 bg-white/20 animate-pulse rounded" />
            ) : (
              <div className="text-5xl font-bold">{formatCurrency(balance || 0)}</div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Cartão de Crédito</span>
              </button>
              <button
                onClick={() => setPaymentMethod('pix')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span className="text-sm font-medium">PIX</span>
                <span className="text-xs text-muted-foreground">(conta BR)</span>
              </button>
            </div>
            {paymentMethod === 'pix' && (
              <p className="text-xs text-amber-600 mt-2">
                PIX requer conta Stripe com pagamentos brasileiros habilitados. Se não disponível, o sistema redirecionará automaticamente para cartão.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Packages */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Pacotes de Créditos</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Card de valor avulso — mesma estética dos demais cards */}
            <Card className="relative hover:border-primary/50 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Avulso
                </CardTitle>
                <CardDescription>
                  Escolha o valor (mínimo {formatCurrency(MIN_CUSTOM_AMOUNT_REAIS * 100)})
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customAmount" className="text-sm text-muted-foreground">
                    Valor em R$
                  </Label>
                  <Input
                    id="customAmount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 51 ou 55,45"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  disabled={checkoutMutation.isPending || !customAmount}
                  onClick={handleBuyCustomAmount}
                >
                  {checkoutMutation.isPending ? "Redirecionando..." : "Comprar Agora"}
                </Button>
              </CardContent>
            </Card>

            {packages?.map((pkg) => (
              <Card
                key={pkg.id}
                className={`relative ${
                  pkg.popular
                    ? 'border-primary shadow-lg scale-105'
                    : 'hover:border-primary/50'
                } transition-all`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold">{formatCurrency(pkg.price)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatCurrency(pkg.credits)} em créditos
                    </p>
                  </div>

                  {pkg.credits > pkg.price && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        Economia de {formatCurrency(pkg.credits - pkg.price)}
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant={pkg.popular ? 'default' : 'outline'}
                    disabled={checkoutMutation.isPending}
                    onClick={() => checkoutMutation.mutate({ packageId: pkg.id, paymentMethod })}
                  >
                    {checkoutMutation.isPending ? "Redirecionando..." : "Comprar Agora"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>Últimas movimentações de créditos</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'purchase' || transaction.type === 'bonus'
                            ? 'bg-green-100 text-green-600'
                            : transaction.type === 'refund'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {transaction.description || 'Transação'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.amount > 0 ? '+' : ''}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Saldo: {formatCurrency(transaction.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transação ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
