import { DataTypes, Model, Optional } from 'sequelize';
import db from '../../../shared/config/database';

export type AccountStatus = 'active' | 'expired' | 'revoked';

export interface TelegramAccountAttributes {
  id: string;
  userId: string;
  tgUserId: string; // BIGINT as string
  username: string | null;
  phone: string | null;
  sessionEnc: string; // AES-GCM encrypted StringSession
  dcId: number | null;
  isPremium: boolean;
  status: AccountStatus;
  label: string | null;
  lastUsedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type Creation = Optional<
  TelegramAccountAttributes,
  'id' | 'username' | 'phone' | 'dcId' | 'isPremium' | 'status' | 'label' | 'lastUsedAt'
>;

export class TelegramAccount
  extends Model<TelegramAccountAttributes, Creation>
  implements TelegramAccountAttributes
{
  public id!: string;
  public userId!: string;
  public tgUserId!: string;
  public username!: string | null;
  public phone!: string | null;
  public sessionEnc!: string;
  public dcId!: number | null;
  public isPremium!: boolean;
  public status!: AccountStatus;
  public label!: string | null;
  public lastUsedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TelegramAccount.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    tgUserId: { type: DataTypes.BIGINT, allowNull: false },
    username: { type: DataTypes.STRING(64), allowNull: true },
    phone: { type: DataTypes.STRING(32), allowNull: true },
    sessionEnc: { type: DataTypes.TEXT, allowNull: false },
    dcId: { type: DataTypes.INTEGER, allowNull: true },
    isPremium: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.ENUM('active', 'expired', 'revoked'), allowNull: false, defaultValue: 'active' },
    label: { type: DataTypes.STRING(64), allowNull: true },
    lastUsedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize: db,
    modelName: 'TelegramAccount',
    tableName: 'telegram_accounts',
    indexes: [{ unique: true, fields: ['user_id', 'tg_user_id'] }],
  },
);

export default TelegramAccount;
