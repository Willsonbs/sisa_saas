/**
 * Stripe Products Configuration
 * Define credit packages available for purchase
 */

export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number; // Amount in cents
  price: number; // Price in cents (BRL)
  stripePriceId?: string; // Will be set when creating in Stripe
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_500",
    name: "Pacote Inicial",
    description: "500 créditos para começar",
    credits: 50000, // R$ 500 in cents
    price: 50000, // R$ 500 (sem bônus)
    popular: false,
  },
  {
    id: "credits_800",
    name: "Pacote Profissional",
    description: "840 créditos com desconto",
    credits: 84000, // R$ 840 in cents
    price: 80000, // R$ 800 (5% de bônus em créditos)
    popular: true,
  },
  {
    id: "credits_1000",
    name: "Pacote Premium",
    description: "1.100 créditos com máximo desconto",
    credits: 110000, // R$ 1.100 in cents
    price: 100000, // R$ 1.000 (10% de bônus em créditos)
    popular: false,
  },
];

// Valor mínimo para compra de créditos avulsos (em centavos) — R$ 50,00
export const MIN_CUSTOM_CREDIT_AMOUNT_CENTS = 5000;

export function getCreditPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.id === id);
}

/**
 * Monta um "pacote" avulso a partir de um valor livre em centavos, sem bônus
 * (crédito = valor pago, 1:1). Usado quando o profissional escolhe comprar um
 * valor específico em vez de um dos pacotes fixos.
 */
export function buildCustomCreditPackage(amountCents: number): CreditPackage {
  return {
    id: "custom",
    name: "Créditos Avulsos",
    description: `${formatCurrency(amountCents)} em créditos`,
    credits: amountCents,
    price: amountCents,
    popular: false,
  };
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}
