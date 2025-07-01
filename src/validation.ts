import { Request, Response, NextFunction } from 'express';
import { z, ZodTypeAny } from 'zod';

export const validateBody = (schema: ZodTypeAny) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await schema.parseAsync(req.body);
            next();
        } catch (error) {
            next(error);
        }
    };

export const validateParams = (schema: ZodTypeAny) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await schema.parseAsync(req.params);
            next();
        } catch (error: any) {
            if (error.errors && Array.isArray(error.errors)) {
                res.status(400).json({
                    message: 'Erros de validação.',
                    errors: error.errors.map((e: any) => ({
                        path: Array.isArray(e.path) ? e.path[e.path.length - 1] : e.path,
                        message: e.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };

export const validateQuery = (schema: ZodTypeAny) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await schema.parseAsync(req.query);
            next();
        } catch (error) {
            next(error);
        }
    };