import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// SECURITY: nunca usar um valor padrao aqui. Um fallback fixo neste repositorio
// publico permitiria forjar tokens JWT validos (inclusive de super_admin) para
// qualquer ambiente que suba sem configurar a variavel corretamente.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET nao esta configurado. Defina essa variavel de ambiente antes de iniciar o servidor - nao ha valor padrao por seguranca.'
  );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(userId: number, email: string, role: string): Promise<string> {
  const token = await new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
  
  return token;
}

export async function verifyToken(token: string): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch (error) {
    return null;
  }
}
