import { Options } from 'sequelize';
import 'dotenv/config';

const config: Options = {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    dialect: (process.env.DB_DIALECT || 'mysql') as Options['dialect'],
    port: process.env.DB_PORT !== undefined ? Number(process.env.DB_PORT) : 3306,
    logging: false,
    define: {
        timestamps: true,
        underscored: true,
    },
    dialectOptions: {
        authPlugins: {
            mysql_clear_password: () => () => Buffer.from((process.env.DB_PASSWORD || '') + '\0')
        }
    }
};

export default config;