import './registry';
import { User } from '../../src/user/models/User';
import { UsageEvent } from '../../src/user/models/UsageEvent';
import { TelegramAccount } from '../../src/account/models/TelegramAccount';
import { ForwardJob } from '../../src/forward/models/ForwardJob';

let done = false;

export const setupAssociations = (): void => {
  if (done) return;
  done = true;

  User.hasMany(TelegramAccount, { foreignKey: 'userId', as: 'accounts' });
  TelegramAccount.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(ForwardJob, { foreignKey: 'userId', as: 'jobs' });
  ForwardJob.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  ForwardJob.belongsTo(TelegramAccount, { foreignKey: 'accountId', as: 'account' });

  User.hasMany(UsageEvent, { foreignKey: 'userId', as: 'usage' });
  UsageEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.belongsTo(User, { foreignKey: 'referredBy', as: 'referrer' });
  User.hasMany(User, { foreignKey: 'referredBy', as: 'referrals' });
};

export default setupAssociations;
