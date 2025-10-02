import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // MITIGACION: usar variable de entorno para el secreto JWT
    // Esto centraliza la configuración y evita secretos hardcodeados en el código fuente.
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error(" JWT_SECRET no está configurado en el entorno.");
      return res.status(500).json({ message: 'Server misconfiguration: missing JWT secret' });
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

export default authenticateJWT;
