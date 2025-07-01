import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './models';
import { Op } from 'sequelize';
import { ApiError } from './middlewares/errorHandler';

interface JwtPayload {
    userId: number;
    email: string;
}

interface AuthRequest extends Request {
    userId?: number;
    user?: { id: number; email: string };
}

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não definido nas variáveis de ambiente. Verifique o .env e envValidation.ts');
}

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await db.User.findOne({ where: { email } });
        if (existingUser) {
            throw new ApiError('Email já cadastrado.', 409);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.User.create({
            name,
            email,
            password: hashedPassword,
        });
        const userResponse = newUser.toJSON();
        delete (userResponse as any).password;
        res.status(201).json({ message: 'Usuário registrado com sucesso!', user: userResponse });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        const user = await db.User.findOne({ where: { email } });
        if (!user) {
            throw new ApiError('Credenciais inválidas.', 401);
        }
        const isPasswordValid = await bcrypt.compare(password, user.password!);
        if (!isPasswordValid) {
            throw new ApiError('Credenciais inválidas.', 401);
        }
        const payload: JwtPayload = { userId: user.id, email: user.email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: 'Login bem-sucedido!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new ApiError('Usuário não autenticado. Token JWT ausente ou inválido.', 401);
        }
        const { title, description } = req.body;
        const newTask = await db.Task.create({
            title,
            description,
            status: 'pending',
            userId,
        });
        res.status(201).json({
            message: 'Tarefa criada com sucesso!',
            task: {
                id: newTask.id,
                title: newTask.title,
                description: newTask.description,
                status: newTask.status,
                userId: newTask.userId,
                createdAt: newTask.createdAt,
                updatedAt: newTask.updatedAt,
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new ApiError('Usuário não autenticado. Token JWT ausente ou inválido.', 401);
        }

        // Extract and parse query parameters with default values and validation
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as 'pending' | 'completed' | 'in_progress' | 'cancelled' | undefined;
        const search = req.query.search as string | undefined;
        const sortBy = req.query.sortBy as string | undefined;
        const sortOrder = req.query.sortOrder as string | undefined;

        // Basic validation for page and limit to ensure they are positive
        if (page <= 0) {
            throw new ApiError('A página deve ser um número positivo.', 400);
        }
        if (limit <= 0) {
            throw new ApiError('O limite deve ser um número positivo.', 400);
        }

        const offset = (page - 1) * limit;

        const whereClause: any = { userId };
        if (status) {
            const validStatuses = ['pending', 'completed', 'in_progress', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new ApiError('Status inválido. Use pending, completed, in_progress ou cancelled.', 400);
            }
            whereClause.status = status;
        }
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
            ];
        }

        const order: [string, string][] = [];
        const validSortByFields = ['createdAt', 'updatedAt', 'title', 'status'];
        const validSortOrderDirections = ['ASC', 'DESC'];

        if (sortBy && validSortByFields.includes(sortBy) && sortOrder && validSortOrderDirections.includes(sortOrder.toUpperCase())) {
            order.push([sortBy, sortOrder.toUpperCase() as 'ASC' | 'DESC']);
        } else {
            order.push(['createdAt', 'DESC']);
        }

        const { count, rows: tasks } = await db.Task.findAndCountAll({
            where: whereClause,
            limit: limit,
            offset: offset,
            order: order,
        });

        res.status(200).json({
            tasks,
            totalTasks: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit: limit,
        });
    } catch (error) {
        next(error);
    }
};

export const getTaskById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new ApiError('Usuário não autenticado. Token JWT ausente ou inválido.', 401);
        }
        const { id } = req.params;
        const taskId = Number(id);

        const task = await db.Task.findOne({ where: { id: taskId, userId: userId } });
        if (!task) {
            throw new ApiError('Tarefa não encontrada ou você não tem permissão para vê-la.', 404);
        }
        res.status(200).json(task);
    } catch (error) {
        next(error);
    }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new ApiError('Usuário não autenticado. Token JWT ausente ou inválido.', 401);
        }
        const { id } = req.params;
        const taskId = Number(id);
        const updates = req.body;

        const task = await db.Task.findOne({ where: { id: taskId, userId: userId } });
        if (!task) {
            throw new ApiError('Tarefa não encontrada ou você não tem permissão para atualizá-la.', 404);
        }
        task.set(updates);
        await task.save();
        res.status(200).json({ message: 'Tarefa atualizada com sucesso!', task: task });
    } catch (error) {
        next(error);
    }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.userId;
        if (!userId) {
            throw new ApiError('Usuário não autenticado. Token JWT ausente ou inválido.', 401);
        }
        const { id } = req.params;
        const taskId = Number(id);

        const task = await db.Task.findOne({ where: { id: taskId, userId: userId } });
        if (!task) {
            throw new ApiError('Tarefa não encontrada ou você não tem permissão para deletá-la.', 404);
        }
        await task.destroy();
        res.status(200).json({ message: 'Tarefa deletada com sucesso!' });
    } catch (error) {
        next(error);
    }
};