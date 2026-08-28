// Máscara progressiva de telefone: formato brasileiro por padrão
// ("(11) 98765-4321" / "(11) 3456-7890"), e formato internacional livre
// (agrupado em blocos de 3 dígitos) quando o usuário começa digitando "+".
// Usado em todo campo de telefone do sistema (paciente, profissional,
// clínica) — não tenta validar o número, só formatar enquanto digita e
// evitar que texto qualquer (ex: um nome) seja confundido com telefone.
export function formatPhoneInput(raw: string): string {
  if (raw.trimStart().startsWith("+")) {
    const digits = raw.replace(/\D/g, "").slice(0, 15);
    const groups = digits.match(/.{1,3}/g) ?? [];
    return "+" + groups.join(" ");
  }

  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
