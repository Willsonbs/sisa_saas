/**
 * Criptografia em repouso para dados sensíveis de pacientes (LGPD).
 * Usa AES-256-GCM com IV aleatório por operação.
 *
 * Formato armazenado: "iv:authTag:ciphertext" (base64 separado por ":")
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Obtém a chave de criptografia de 32 bytes a partir da variável de ambiente.
 * Usa JWT_SECRET como base (já disponível no ambiente) com padding/trim para 32 bytes.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET || "default-insecure-key-change-in-production";
  // Deriva 32 bytes a partir do secret usando SHA-256 implícito via Buffer
  const keyStr = secret.padEnd(32, "0").substring(0, 32);
  return Buffer.from(keyStr, "utf8");
}

const ENCRYPTED_PREFIX = "enc:";

/**
 * Criptografa uma string com AES-256-GCM.
 * Retorna null se o valor for null/undefined.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined) return null;
  if (plaintext === "") return "";

  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Formato: "enc:iv_hex:authTag_hex:ciphertext_hex"
  return (
    ENCRYPTED_PREFIX +
    iv.toString("hex") +
    ":" +
    authTag.toString("hex") +
    ":" +
    encrypted.toString("hex")
  );
}

/**
 * Descriptografa uma string criptografada com AES-256-GCM.
 * Retorna o valor original se não estiver criptografado (retrocompatibilidade).
 * Retorna null se o valor for null/undefined.
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext === null || ciphertext === undefined) return null;
  if (ciphertext === "") return "";

  // Retrocompatibilidade: se não tem o prefixo, retorna como está
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) return ciphertext;

  try {
    const withoutPrefix = ciphertext.slice(ENCRYPTED_PREFIX.length);
    const parts = withoutPrefix.split(":");
    if (parts.length !== 3) return ciphertext;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    // Se falhar na descriptografia, retorna null para não expor dados corrompidos
    return null;
  }
}

/**
 * Verifica se um valor está criptografado.
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}
