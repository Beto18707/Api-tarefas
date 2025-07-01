export interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Task {
    id: number;
    title: string;
    description?: string;
    status: 'pending' | 'completed';
    createdAt: Date;
    updatedAt: Date;
    userId: number;
}

export interface JwtPayload {
    userId: number;
    email: string;
}