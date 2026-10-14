import { DataTypes, Model, Optional } from 'sequelize';
import db from '../../../shared/config/database';

export type UserRole = 'user' | 'admin';

export interface UserAttributes {
  id: string;
  telegramId: string; // BIGINT as string
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string;
  isPremium: boolean;
  referredBy: string | null;
  role: UserRole;
  isBlocked: boolean;
  lastSeenAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type UserCreation = Optional<
  UserAttributes,
  'id' | 'username' | 'firstName' | 'lastName' | 'languageCode' | 'isPremium' | 'referredBy' | 'role' | 'isBlocked' | 'lastSeenAt'
>;

export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  public id!: string;
  public telegramId!: string;
  public username!: string | null;
  public firstName!: string | null;
  public lastName!: string | null;
  public languageCode!: string;
  public isPremium!: boolean;
  public referredBy!: string | null;
  public role!: UserRole;
  public isBlocked!: boolean;
  public lastSeenAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    telegramId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    username: { type: DataTypes.STRING(64), allowNull: true },
    firstName: { type: DataTypes.STRING(128), allowNull: true },
    lastName: { type: DataTypes.STRING(128), allowNull: true },
    languageCode: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'en' },
    isPremium: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    referredBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
    role: { type: DataTypes.ENUM('user', 'admin'), allowNull: false, defaultValue: 'user' },
    isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastSeenAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize: db, modelName: 'User', tableName: 'users' },
);

export default User;
