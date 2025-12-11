import type { Request, Response } from 'express';
import * as db from '../db';

export async function getUserFromCookie(req: Request): Promise<any | null> {
  const authToken = req.cookies['auth_token'];
  
  if (!authToken) {
    return null;
  }
  
  try {
    const { verifyToken } = await import('../auth');
    const payload = await verifyToken(authToken);
    
    if (!payload) {
      return null;
    }
    
    // Buscar usuário atualizado do banco
    const user = await db.getUserById(payload.userId);
    return user || null;
  } catch (error) {
    console.error('[Auth] Failed to verify token:', error);
    return null;
  }
}
