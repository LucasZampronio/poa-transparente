import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  
  /* istanbul ignore next */
  const tokenToCompare = process.env.CONECTA_GOV_TOKEN || '';

  if (token !== tokenToCompare) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }

  next();
}
