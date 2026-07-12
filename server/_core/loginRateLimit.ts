/**
 * Rate limiting simples em memória para o endpoint de login.
 *
 * LIMITAÇÃO CONHECIDA: como o estado fica em memória do processo, não é
 * compartilhado entre múltiplas instâncias/réplicas do servidor. Para um
 * ambiente com várias instâncias, o ideal é mover isso para um store
 * compartilhado (ex: Redis). Mesmo assim, isso já fecha a maior parte da
 * superfície de força bruta contra um único processo, que é o cenário atual.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

type Bucket = { count: number; windowStart: number };

const attempts = new Map<string, Bucket>();

function keyFor(email: string, ip: string | undefined): string {
  return `${email.toLowerCase().trim()}::${ip || "unknown"}`;
}

/**
 * Verifica se o login está bloqueado por excesso de tentativas.
 * Retorna o tempo restante em segundos se bloqueado, ou null se pode tentar.
 */
export function checkLoginRateLimit(email: string, ip: string | undefined): number | null {
  const key = keyFor(email, ip);
  const bucket = attempts.get(key);
  if (!bucket) return null;

  const elapsed = Date.now() - bucket.windowStart;
  if (elapsed > WINDOW_MS) {
    attempts.delete(key);
    return null;
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return Math.ceil((WINDOW_MS - elapsed) / 1000);
  }

  return null;
}

/**
 * Registra uma tentativa de login falha.
 */
export function registerFailedLogin(email: string, ip: string | undefined): void {
  const key = keyFor(email, ip);
  const bucket = attempts.get(key);
  const now = Date.now();

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return;
  }

  bucket.count += 1;
}

/**
 * Limpa o contador após um login bem-sucedido.
 */
export function clearLoginRateLimit(email: string, ip: string | undefined): void {
  attempts.delete(keyFor(email, ip));
}
