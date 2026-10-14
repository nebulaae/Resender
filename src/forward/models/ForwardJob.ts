import { DataTypes, Model, Optional } from 'sequelize';
import db from '../../../shared/config/database';

export type ForwardScope = 'single' | 'range' | 'all';
export type JobStatus = 'queued' | 'running' | 'paused' | 'done' | 'failed' | 'canceled';

export interface ForwardJobAttributes {
  id: string;
  userId: string;
  accountId: string | null;
  sourceRef: string; // raw link/username the user supplied
  sourceChatId: string | null; // resolved BIGINT as string
  scope: ForwardScope;
  fromMsgId: number | null;
  toMsgId: number | null;
  deliverChatId: string; // bot<->user chat id (BIGINT as string)
  status: JobStatus;
  total: number;
  processed: number;
  failed: number;
  bytes: string; // BIGINT as string
  cursorMsgId: number | null;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type Creation = Optional<
  ForwardJobAttributes,
  | 'id' | 'accountId' | 'sourceChatId' | 'fromMsgId' | 'toMsgId' | 'status'
  | 'total' | 'processed' | 'failed' | 'bytes' | 'cursorMsgId' | 'error'
  | 'startedAt' | 'finishedAt'
>;

export class ForwardJob extends Model<ForwardJobAttributes, Creation> implements ForwardJobAttributes {
  public id!: string;
  public userId!: string;
  public accountId!: string | null;
  public sourceRef!: string;
  public sourceChatId!: string | null;
  public scope!: ForwardScope;
  public fromMsgId!: number | null;
  public toMsgId!: number | null;
  public deliverChatId!: string;
  public status!: JobStatus;
  public total!: number;
  public processed!: number;
  public failed!: number;
  public bytes!: string;
  public cursorMsgId!: number | null;
  public error!: string | null;
  public startedAt!: Date | null;
  public finishedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ForwardJob.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    accountId: { type: DataTypes.UUID, allowNull: true, references: { model: 'telegram_accounts', key: 'id' }, onDelete: 'SET NULL' },
    sourceRef: { type: DataTypes.STRING(512), allowNull: false },
    sourceChatId: { type: DataTypes.BIGINT, allowNull: true },
    scope: { type: DataTypes.ENUM('single', 'range', 'all'), allowNull: false },
    fromMsgId: { type: DataTypes.INTEGER, allowNull: true },
    toMsgId: { type: DataTypes.INTEGER, allowNull: true },
    deliverChatId: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.ENUM('queued', 'running', 'paused', 'done', 'failed', 'canceled'), allowNull: false, defaultValue: 'queued' },
    total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    processed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    failed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    bytes: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    cursorMsgId: { type: DataTypes.INTEGER, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    finishedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize: db,
    modelName: 'ForwardJob',
    tableName: 'forward_jobs',
    indexes: [{ fields: ['status'] }, { fields: ['user_id'] }],
  },
);

export default ForwardJob;
