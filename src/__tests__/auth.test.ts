import supertest from 'supertest';
import express from 'express';
import db from '../models'; 
import routes from '../routes';
import { errorHandler } from '../middlewares/errorHandler';
import { validateEnv } from '../utils/envValidation'; 

const app = express();
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);
 
process.env.NODE_ENV = 'test';

describe('Auth API', () => {
    beforeAll(async () => {
        validateEnv(); 
        await db.sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await db.sequelize.close(); 
    });

    beforeEach(async () => {
       await db.Task.destroy({ where: {}, truncate: false, cascade: true });
       await db.User.destroy({ where: {}, truncate: false, cascade: true });
    });

    it('should register a new user successfully', async () => {
        const userData = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
        };

        const res = await supertest(app)
            .post('/api/auth/register')
            .send(userData);

        expect(res.statusCode).toEqual(201);
        expect(res.body.message).toEqual('Usuário registrado com sucesso!');
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user).toHaveProperty('email', userData.email);
        expect(res.body.user).not.toHaveProperty('password'); 
    });

    it('should return 409 if email is already registered', async () => {
        const userData = {
            name: 'Existing User',
            email: 'existing@example.com',
            password: 'password123',
        };
        await supertest(app).post('/api/auth/register').send(userData);

        const res = await supertest(app)
            .post('/api/auth/register')
            .send(userData);

        expect(res.statusCode).toEqual(409);
        expect(res.body.message).toEqual('Email já cadastrado.');
    });

    it('should return 400 for invalid registration data (Zod validation)', async () => {
        const invalidUserData = {
            name: 'Te',
            email: 'invalid-email', 
            password: '123', 
        };

        const res = await supertest(app)
            .post('/api/auth/register')
            .send(invalidUserData);

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toEqual('Erros de validação.');
        expect(res.body.errors).toBeInstanceOf(Array);
        expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should login an existing user and return a token', async () => {
        const userData = {
            name: 'Login User',
            email: 'login@example.com',
            password: 'password123',
        };
        await supertest(app).post('/api/auth/register').send(userData); // Primeiro, registra o usuário

        const res = await supertest(app)
            .post('/api/auth/login')
            .send({
                email: userData.email,
                password: userData.password,
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toEqual('Login bem-sucedido!');
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user).toHaveProperty('email', userData.email);
    });

    it('should return 401 for invalid login credentials', async () => {
        const res = await supertest(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toEqual('Credenciais inválidas.');
    });
});