import request from 'supertest';
import app from '../server';
import db from '../models';

describe('Task API', () => {
    let authToken: string;
    let userId: number;
    let uniqueEmail: string;

    beforeAll(async () => {
        uniqueEmail = `task_user_${Date.now()}@example.com`;
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Task User Test',
                email: uniqueEmail,
                password: 'password123'
            });
        expect(registerRes.statusCode).toEqual(201);
        expect(registerRes.body.user).toHaveProperty('id');
        userId = registerRes.body.user.id;

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: uniqueEmail,
                password: 'password123'
            });
        expect(loginRes.statusCode).toEqual(200);
        expect(loginRes.body).toHaveProperty('token');
        authToken = loginRes.body.token;
    });

    describe('POST /api/tasks', () => {
        beforeEach(async () => {
            await db.Task.destroy({ where: { userId: userId }, truncate: true, cascade: true });
        });

        it('should create a new task successfully with valid data and token', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Minha Tarefa Criada Teste',
                    description: 'Esta é a descrição para o teste de criação.'
                });
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'Tarefa criada com sucesso!');
            expect(res.body.task).toHaveProperty('id');
            expect(res.body.task.title).toEqual('Minha Tarefa Criada Teste');
            expect(res.body.task.description).toEqual('Esta é a descrição para o teste de criação.');
            expect(res.body.task.status).toEqual('pending');
            expect(res.body.task.userId).toEqual(userId);
        });

        it('should create a new task with only title (description optional)', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Tarefa Apenas com Título'
                });
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'Tarefa criada com sucesso!');
            expect(res.body.task).toHaveProperty('title', 'Tarefa Apenas com Título');
            expect(res.body.task.description).toBeNull();
        });

        it('should return 400 if title is missing', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'Tarefa sem título'
                });
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Erros de validação.');
            expect(res.body.errors[0].path[0]).toEqual('title');
            expect(res.body.errors[0].message).toContain('Título é obrigatório');
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .send({
                    title: 'Tarefa sem token'
                });
            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Token de autenticação não fornecido.');
        });

        it('should return 403 if an invalid token is provided', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer invalidtoken`)
                .send({
                    title: 'Tarefa com token inválido'
                });
            expect(res.statusCode).toEqual(403);
            expect(res.body).toHaveProperty('message', 'Token de autenticação inválido ou expirado.');
        });
    });

    describe('GET /api/tasks', () => {
        beforeEach(async () => {
            await db.Task.destroy({ where: { userId: userId }, truncate: true, cascade: true });
            await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`).send({ title: 'Task A (Pending)', status: 'pending', createdAt: new Date('2025-01-01T10:00:00Z') });
            await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`).send({ title: 'Task B (Completed)', status: 'completed', createdAt: new Date('2025-01-02T11:00:00Z') });
            await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`).send({ title: 'Task C (Pending) - Searchable', description: 'This is a test description.', status: 'pending', createdAt: new Date('2025-01-03T12:00:00Z') });
            await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`).send({ title: 'Task D (In Progress)', status: 'in_progress', createdAt: new Date('2025-01-04T13:00:00Z') });
            await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`).send({ title: 'Another Task E', description: 'Another searchable keyword.', status: 'pending', createdAt: new Date('2025-01-05T14:00:00Z') });
            await request(app).post('/api/tasks').set('Authorization', `Bearer ${authToken}`).send({ title: 'Zebra Task (Completed)', status: 'completed', createdAt: new Date('2025-01-06T15:00:00Z') });
        });

        it('should retrieve all tasks for the authenticated user with default pagination/sort', async () => {
            const res = await request(app)
                .get('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('totalTasks', 6);
            expect(res.body.tasks.length).toBe(6);
            expect(res.body.currentPage).toBe(1);
            expect(res.body.limit).toBe(10);
            expect(res.body.tasks[0].title).toEqual('Zebra Task (Completed)');
            expect(res.body.tasks[5].title).toEqual('Task A (Pending)');
        });

        it('should apply pagination and limit correctly', async () => {
            const res = await request(app)
                .get('/api/tasks?page=1&limit=3')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.tasks.length).toBe(3);
            expect(res.body.currentPage).toBe(1);
            expect(res.body.limit).toBe(3);
            expect(res.body.totalTasks).toBe(6);
            expect(res.body.totalPages).toBe(2);
            expect(res.body.tasks[0].title).toEqual('Zebra Task (Completed)');
        });

        it('should get tasks from the second page', async () => {
            const res = await request(app)
                .get('/api/tasks?page=2&limit=3')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.tasks.length).toBe(3);
            expect(res.body.currentPage).toBe(2);
            expect(res.body.tasks[0].title).toEqual('Task C (Pending) - Searchable');
        });

        it('should filter tasks by status "completed"', async () => {
            const res = await request(app)
                .get('/api/tasks?status=completed')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.totalTasks).toEqual(2);
            expect(res.body.tasks.length).toEqual(2);
            expect(res.body.tasks[0].title).toEqual('Zebra Task (Completed)');
            expect(res.body.tasks[1].title).toEqual('Task B (Completed)');
            expect(res.body.tasks.every((task: any) => task.status === 'completed')).toBeTruthy();
        });

        it('should filter tasks by search term in title or description', async () => {
            const res = await request(app)
                .get('/api/tasks?search=test')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.totalTasks).toEqual(1);
            expect(res.body.tasks.length).toEqual(1);
            expect(res.body.tasks[0].title).toEqual('Task C (Pending) - Searchable');
        });

        it('should apply sorting by title ascending', async () => {
            const res = await request(app)
                .get('/api/tasks?sortBy=title&sortOrder=asc')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.tasks.length).toEqual(6);
            expect(res.body.tasks[0].title).toEqual('Another Task E');
            expect(res.body.tasks[5].title).toEqual('Zebra Task (Completed)');
        });

        it('should apply sorting by title descending', async () => {
            const res = await request(app)
                .get('/api/tasks?sortBy=title&sortOrder=desc')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.tasks.length).toEqual(6);
            expect(res.body.tasks[0].title).toEqual('Zebra Task (Completed)');
            expect(res.body.tasks[5].title).toEqual('Another Task E');
        });

        it('should combine pagination, filter and sorting', async () => {
            const res = await request(app)
                .get('/api/tasks?status=pending&search=test&page=1&limit=1&sortBy=title&sortOrder=asc')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.totalTasks).toEqual(1);
            expect(res.body.tasks.length).toEqual(1);
            expect(res.body.tasks[0].title).toEqual('Task C (Pending) - Searchable');
            expect(res.body.currentPage).toEqual(1);
            expect(res.body.limit).toEqual(1);
        });

        it('should return 400 for invalid page parameter', async () => {
            const res = await request(app)
                .get('/api/tasks?page=0')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].message).toContain('A página deve ser um número positivo.');
        });

        it('should return 400 for invalid limit parameter', async () => {
            const res = await request(app)
                .get('/api/tasks?limit=0')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].message).toContain('O limite deve ser um número positivo.');
        });

        it('should return 400 for invalid status parameter', async () => {
            const res = await request(app)
                .get('/api/tasks?status=invalid_status')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].message).toContain('Status inválido. Use pending, completed, in_progress ou cancelled.');
        });

        it('should return 400 for invalid sortBy parameter', async () => {
            const res = await request(app)
                .get('/api/tasks?sortBy=invalid_field&sortOrder=asc')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].message).toContain('Campo de ordenação inválido.');
        });

        it('should return 400 for invalid sortOrder parameter', async () => {
            const res = await request(app)
                .get('/api/tasks?sortBy=title&sortOrder=invalid_direction')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body.errors[0].message).toContain('Direção de ordenação inválida.');
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app).get('/api/tasks');
            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Token de autenticação não fornecido.');
        });
    });

    describe('GET /api/tasks/:id', () => {
        let createdTaskId: number;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Tarefa para Busca', description: 'Descrição da tarefa para busca.' });
            createdTaskId = res.body.task.id;
        });

        it('should retrieve a task by its ID for the authenticated user', async () => {
            const res = await request(app)
                .get(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('id', createdTaskId);
            expect(res.body.title).toEqual('Tarefa para Busca');
            expect(res.body.userId).toEqual(userId);
        });

        it('should return 404 if task ID does not exist', async () => {
            const nonExistentId = createdTaskId + 999;
            const res = await request(app)
                .get(`/api/tasks/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'Tarefa não encontrada ou você não tem permissão para vê-la.');
        });

        it('should return 400 if task ID is invalid', async () => {
            const res = await request(app)
                .get('/api/tasks/invalid-id')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Erros de validação.');
            expect(res.body.errors[0].path[0]).toEqual('id');
            expect(res.body.errors[0].message).toContain('ID da tarefa deve ser um número válido');
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app).get(`/api/tasks/${createdTaskId}`);
            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Token de autenticação não fornecido.');
        });
    });

    describe('PUT /api/tasks/:id', () => {
        let createdTaskId: number;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Tarefa para Atualizar', description: 'Descrição antiga.', status: 'pending' });
            createdTaskId = res.body.task.id;
        });

        it('should update a task successfully with valid data and token', async () => {
            const res = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Tarefa Atualizada Teste',
                    status: 'completed'
                });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Tarefa atualizada com sucesso!');
            expect(res.body.task).toHaveProperty('id', createdTaskId);
            expect(res.body.task.title).toEqual('Tarefa Atualizada Teste');
            expect(res.body.task.status).toEqual('completed');
            expect(res.body.task.description).toEqual('Descrição antiga.');
        });

        it('should allow partial updates (e.g., only description)', async () => {
            const res = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    description: 'Nova descrição atualizada.'
                });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Tarefa atualizada com sucesso!');
            expect(res.body.task).toHaveProperty('id', createdTaskId);
            expect(res.body.task.description).toEqual('Nova descrição atualizada.');
            expect(res.body.task.title).toEqual('Tarefa para Atualizar');
        });

        it('should return 400 if no update data is provided', async () => {
            const res = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({});
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Erros de validação.');
            expect(res.body.errors[0].message).toContain('Ao menos um campo (title, description ou status) deve ser fornecido');
        });

        it('should return 404 if task ID does not exist', async () => {
            const nonExistentId = createdTaskId + 999;
            const res = await request(app)
                .put(`/api/tasks/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Invalid Task Update' });
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'Tarefa não encontrada ou você não tem permissão para atualizá-la.');
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app)
                .put(`/api/tasks/${createdTaskId}`)
                .send({ title: 'No token' });
            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Token de autenticação não fornecido.');
        });
    });

    describe('DELETE /api/tasks/:id', () => {
        let taskToDeleteId: number;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Task to Delete', description: 'Will be deleted.' });
            taskToDeleteId = res.body.task.id;
        });

        it('should delete a task successfully by its ID for the authenticated user', async () => {
            const res = await request(app)
                .delete(`/api/tasks/${taskToDeleteId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Tarefa deletada com sucesso!');

            const checkRes = await request(app)
                .get(`/api/tasks/${taskToDeleteId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(checkRes.statusCode).toEqual(404);
        });

        it('should return 404 if task ID does not exist', async () => {
            const nonExistentId = taskToDeleteId + 999;
            const res = await request(app)
                .delete(`/api/tasks/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'Tarefa não encontrada ou você não tem permissão para deletá-la.');
        });

        it('should return 400 if task ID is invalid', async () => {
            const res = await request(app)
                .delete('/api/tasks/invalid-id')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Erros de validação.');
            expect(res.body.errors[0].path[0]).toEqual('id');
            expect(res.body.errors[0].message).toContain('ID da tarefa deve ser um número válido');
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app).delete(`/api/tasks/${taskToDeleteId}`);
            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Token de autenticação não fornecido.');
        });
    });
});