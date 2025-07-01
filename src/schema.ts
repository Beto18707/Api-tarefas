import { z } from 'zod';

export const registerUserSchema = z.object({
    name: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres." }).max(100, { message: "Nome deve ter no máximo 100 caracteres." }),
    email: z.string().email({ message: "Formato de e-mail inválido." }).max(255, { message: "E-mail deve ter no máximo 255 caracteres." }),
    password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres." }).max(255, { message: "Senha deve ter no máximo 255 caracteres." }),
});

export const loginUserSchema = z.object({
    email: z.string().email({ message: "Formato de e-mail inválido." }),
    password: z.string().min(1, { message: "Senha é obrigatória." }),
});

export const createTaskSchema = z.object({
    title: z.string().min(1, { message: "Título é obrigatório." }).max(255, { message: "Título deve ter no máximo 255 caracteres." }),
    description: z.string().max(1000, { message: "Descrição deve ter no máximo 1000 caracteres." }).nullable().optional(),
    status: z.enum(['pending', 'completed'], { message: "Status deve ser 'pending' ou 'completed'." }).default('pending').optional(),
});

export const updateTaskSchema = z.object({
    title: z.string().min(1, { message: "Título é obrigatório." }).max(255, { message: "Título deve ter no máximo 255 caracteres." }).optional(),
    description: z.string().max(1000, { message: "Descrição deve ter no máximo 1000 caracteres." }).nullable().optional(),
    status: z.enum(['pending', 'completed'], { message: "Status deve ser 'pending' ou 'completed'." }).optional(),
}).refine(data => data.title !== undefined || data.description !== undefined || data.status !== undefined, {
    message: "Ao menos um campo (title, description ou status) deve ser fornecido para atualização.",
    path: ['title', 'description', 'status'],
});

export const taskIdSchema = z.object({
    id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "ID da tarefa deve ser um número válido.",
    }).transform(val => parseInt(val, 10)),
});

export const getTasksQuerySchema = z.object({
    status: z.enum(['pending', 'completed'], { message: "Status deve ser 'pending' ou 'completed'." }).optional(),
    search: z.string().optional(),
    page: z.string().default('1').transform(val => parseInt(val, 10)).pipe(z.number().min(1, "A página deve ser um número positivo.")),
    limit: z.string().default('10').transform(val => parseInt(val, 10)).pipe(z.number().min(1, "O limite deve ser um número positivo.")),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status']).default('createdAt'),
    sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});