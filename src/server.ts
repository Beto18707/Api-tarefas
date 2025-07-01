import 'dotenv/config';
import express from 'express';
import db from './models';
import routes from './routes';
import { validateEnv } from './utils/envValidation';
import { errorHandler } from './middlewares/errorHandler';
import rateLimit from 'express-rate-limit';

validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições de seu IP, tente novamente após 15 minutos.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Muitas tentativas de login/registro de seu IP, tente novamente após 1 hora.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.json());

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter, routes);

app.get('/', (req, res) => {
    res.send('API de Gerenciamento de Tarefas está funcionando!');
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
    db.sequelize.sync({ force: false })
        .then(() => {
            console.log('Connection to database has been established successfully.');
            app.listen(PORT, () => {
                console.log(`Servidor rodando na porta ${PORT}`);
                console.log(`Acesse: http://localhost:${PORT}`);
            });
        })
        .catch((error) => {
            console.error('Erro ao conectar ou sincronizar o banco de dados:', error);
            process.exit(1);
        });
} else {
    console.log('Running in test environment. Server not explicitly started, DB handled by testSetup.');
}

export default app;