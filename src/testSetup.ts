import db from './models';

beforeAll(async () => {
    try {
        await db.sequelize.authenticate(); 
        console.log('Connection to database has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw new Error('Failed to connect to the database for tests.');
    }

    await db.sequelize.sync({ force: true });
    console.log('Database synced for testing.');
});

afterAll(async () => {
    await db.sequelize.close();
    console.log('Database connection closed.');
});