import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
interface JwtPayload { 
    userId: number;
    email: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: "Token de autenticação não fornecido." });
    }

    jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
        if (err) {
            console.error('Erro de verificação de token:', err.message);
            return res.status(403).json({ message: "Token de autenticação inválido ou expirado." });
        }

        const jwtPayload = user as JwtPayload;
        req.userId = jwtPayload.userId;
        next();
    });
};