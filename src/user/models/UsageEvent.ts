import { DataTypes, Model, Optional } from 'sequelize';
import db from '../../../shared/config/database';

export type UsageType = 'forward' | 'message' | 'bytes';

export interface UsageEventAttributes {
  id: string;
  userId: string;
  type: UsageType;
  value: string; // BIGINT as string
  jobId: string | null;
  createdAt?: Date;
}

type Creation = Optional<UsageEventAttributes, 'id' | 'jobId'>;

export class UsageEvent extends Model<UsageEventAttributes, Creation> implements UsageEventAttributes {
  public id!: string;
  public userId!: string;
  public type!: UsageType;
  public value!: string;
  public jobId!: string | null;
  public readonly createdAt!: Date;
}

UsageEvent.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    type: { type: DataTypes.ENUM('forward', 'message', 'bytes'), allowNull: false },
    value: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    jobId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize: db,
    modelName: 'UsageEvent',
    tableName: 'usage_events',
    updatedAt: false,
    indexes: [{ fields: ['user_id', 'type'] }, { fields: ['created_at'] }],
  },
);

export default UsageEvent;
