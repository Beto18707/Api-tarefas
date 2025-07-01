import { z } from 'zod';

const envSchema = z.object({
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    JWT_SECRET: z.string().min(10),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string().optional(),
    DB_DATABASE: z.string().min(1),
    DB_HOST: z.string().min(1),
    DB_DIALECT: z.enum(['mysql', 'postgres', 'sqlite', 'mssql']).default('mysql'),
    DB_PORT: z.string().default('3306').transform(val => parseInt(val, 10)),
});

type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (): EnvConfig => {
    try {
        return envSchema.parse(process.env);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            console.error('Erro de validação das variáveis de ambiente:');
            error.errors.forEach(err => {
                console.error(`- ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        console.error('Erro desconhecido na validação de ambiente:', error);
        process.exit(1);
    }
};

declare global {
    namespace NodeJS {
        interface ProcessEnv extends EnvConfig {}
    }
}