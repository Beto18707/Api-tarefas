import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import config from './config';

export interface UserAttributes {
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TaskAttributes {
    id: number;
    title: string;
    description?: string;
    status: 'pending' | 'completed';
    userId: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const sequelize = new Sequelize(
    config.database as string,
    config.username as string,
    config.password,
    {
        host: config.host,
        dialect: config.dialect,
        port: config.port,
        logging: config.logging,
        define: config.define,
        dialectOptions: config.dialectOptions
    }
);

export class User extends Model<UserAttributes, Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'>> implements UserAttributes {
    public id!: number;
    public name!: string;
    public email!: string;
    public password!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'users',
        timestamps: true,
    }
);

export class Task extends Model<TaskAttributes, Optional<TaskAttributes, 'id' | 'createdAt' | 'updatedAt' | 'description'>> implements TaskAttributes {
    public id!: number;
    public title!: string;
    public description?: string;
    public status!: 'pending' | 'completed';
    public userId!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Task.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING(1000),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('pending', 'completed'),
            allowNull: false,
            defaultValue: 'pending',
        },
        userId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'tasks',
        timestamps: true,
    }
);

User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const db = {
    sequelize,
    User,
    Task,
};

export default db;