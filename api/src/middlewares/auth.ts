import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  
  // Basic token validation (for demonstration/study purposes)
  // In a real scenario with jsonwebtoken: jwt.verify(token, process.env.JWT_SECRET)
  if (token !== process.env.CONECTA_GOV_TOKEN) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }

  next();
}
