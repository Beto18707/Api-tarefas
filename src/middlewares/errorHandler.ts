import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Erro capturado pelo errorHandler:', err);

    let statusCode = 500;
    let message = "Erro interno do servidor.";
    let errors: any[] | undefined;

    if (err instanceof ZodError) {
        statusCode = 400;
        message = "Erros de validação.";
        errors = err.errors.map(zodErr => ({
            path: zodErr.path.join('.'),
            message: zodErr.message,
        }));
    } else if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 403;
        message = "Token inválido.";
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = "Token expirado.";
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409;
        message = "O recurso que você está tentando criar já existe (ex: email já cadastrado).";
        if ((err as any).errors && (err as any).errors.length > 0) {
            errors = (err as any).errors.map((e: any) => ({
                path: e.path,
                message: e.message,
                value: e.value
            }));
        }
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = 400;
        message = "Erro de chave estrangeira: Um recurso relacionado não foi encontrado ou é inválido.";
    } else if (err.name === 'SequelizeValidationError') {
        statusCode = 400;
        message = "Erro de validação de dados.";
        if ((err as any).errors && (err as any).errors.length > 0) {
            errors = (err as any).errors.map((e: any) => ({
                path: e.path,
                message: e.message,
                value: e.value
            }));
        }
    } else if (err.name === 'SequelizeDatabaseError' && err.message.includes('ER_NO_SUCH_TABLE')) {
        statusCode = 500;
        message = "Erro de banco de dados: Tabela não encontrada. Verifique suas migrações.";
    }

    if (process.env.NODE_ENV === 'production' && statusCode === 500 && !errors) {
        message = "Ocorreu um erro inesperado no servidor.";
    }

    res.status(statusCode).json({
        message,
        ...(errors && { errors }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};