// Import every model once so Sequelize registers all tables for db.sync().
// Add new models here.
import '../../src/user/models/User';
import '../../src/user/models/UsageEvent';
import '../../src/account/models/TelegramAccount';
import '../../src/forward/models/ForwardJob';
