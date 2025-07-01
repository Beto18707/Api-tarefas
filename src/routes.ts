import { Router } from 'express';
import {
    register,
    login,
    createTask,
    getTasks,
    getTaskById,
    updateTask,
    deleteTask
} from './controllers';
import { authenticateToken } from './middlewares/authenticateToken';
import { validateBody, validateParams, validateQuery } from './validation';
import {
    registerUserSchema,
    loginUserSchema,
    createTaskSchema,
    updateTaskSchema,
    taskIdSchema,
    getTasksQuerySchema
} from './schema';

const router = Router();

router.post('/auth/register', validateBody(registerUserSchema), register);
router.post('/auth/login', validateBody(loginUserSchema), login);

router.post('/tasks', authenticateToken, validateBody(createTaskSchema), createTask);
router.get('/tasks', authenticateToken, validateQuery(getTasksQuerySchema), getTasks);
router.get('/tasks/:id', authenticateToken, validateParams(taskIdSchema), getTaskById);
router.put('/tasks/:id', authenticateToken, validateParams(taskIdSchema), validateBody(updateTaskSchema), updateTask);
router.delete('/tasks/:id', authenticateToken, validateParams(taskIdSchema), deleteTask);

export default router;