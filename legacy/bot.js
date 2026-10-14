"use strict";

/**
 * Resender — two ways to copy from channels where forwarding/saving is blocked:
 *
 *   1) Live mirror: automatically copies NEW posts from "source" channels to a
 *      "dest" chat, defined in config.json routes.
 *
 *   2) On-demand: DM the bot a message link (e.g. https://t.me/c/123456789/100
 *      or a range .../100-110) and it replies with a fresh copy of that exact
 *      message — including old history, photos and videos.
 *
 * A USER account (MTProto) does the reading/downloading (it can view joined
 * channels and re-download media even when "restrict saving" is on). The bot
 * (BOT_TOKEN) provides the DM command interface and can also deliver copies.
 *
 * Run:  npm start
 */

const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { Album } = require("telegram/events/Album");
const { getPeerId } = require("telegram/Utils");

const { loadConfig } = require("./config");
const { log, setLevel } = require("./log");
const { copySingle, copyAlbum } = require("./copy");

const cfg = loadConfig();
setLevel(cfg.options.logLevel);

const MAX_RANGE = 100; // safety cap on how many messages one link-range fetches

// ---------------------------------------------------------------------------
// Link parsing for on-demand mode
// ---------------------------------------------------------------------------

/**
 * Parse all Telegram message links in a text blob.
 * Supports:
 *   https://t.me/c/<internalId>/<msgId>
 *   https://t.me/c/<internalId>/<threadId>/<msgId>
 *   https://t.me/<username>/<msgId>
 *   https://t.me/<username>/<threadId>/<msgId>
 *   ...and a range on the last segment: .../<from>-<to>
 * Returns: [{ channel, ids: number[], raw }]
 */
function parseTargets(text) {
  const out = [];
  const re = /t\.me\/(?:c\/(\d+)|([A-Za-z0-9_]{4,}))\/([0-9/\-]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const channel = m[1] ? Number("-100" + m[1]) : "@" + m[2];
    const parts = m[3].split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last) continue;

    let ids = [];
    if (last.includes("-")) {
      const [a, b] = last.split("-").map((x) => parseInt(x, 10));
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        for (let i = lo; i <= hi && ids.length < MAX_RANGE; i++) ids.push(i);
      }
    } else {
      const id = parseInt(last, 10);
      if (!Number.isNaN(id)) ids = [id];
    }
    if (ids.length) out.push({ channel, ids, raw: m[0] });
  }
  return out;
}

async function fetchAndCopyTarget(userClient, botClient, target, chatId) {
  let entity;
  try {
    entity = await userClient.getEntity(target.channel);
  } catch (e) {
    await botClient.sendMessage(chatId, {
      message:
        `❌ Не могу открыть ${target.channel}. ` +
        "Твой аккаунт должен быть подписан на этот канал.",
    });
    return;
  }

  const fetched = [];
  for (let i = 0; i < target.ids.length; i += 100) {
    const chunk = target.ids.slice(i, i + 100);
    const res = await userClient.getMessages(entity, { ids: chunk });
    for (const msg of res) if (msg) fetched.push(msg);
  }

  if (fetched.length === 0) {
    await botClient.sendMessage(chatId, {
      message: "❌ Сообщение не найдено (удалено или нет доступа).",
    });
    return;
  }

  const route = { destEntity: chatId, footer: "", dropCaption: false };
  const seenGroups = new Set();
  let ok = 0;
  for (const msg of fetched) {
    try {
      if (msg.groupedId) {
        const gid = String(msg.groupedId);
        if (seenGroups.has(gid)) continue;
        seenGroups.add(gid);
        const group = fetched.filter(
          (x) => x.groupedId && String(x.groupedId) === gid
        );
        await copyAlbum(userClient, botClient, group, route);
      } else {
        await copySingle(userClient, botClient, msg, route);
      }
      ok++;
    } catch (e) {
      log("error", `on-demand copy msg ${msg.id} failed:`, e.message || e);
      await botClient.sendMessage(chatId, {
        message: `⚠️ Не удалось скопировать сообщение ${msg.id}: ${e.message}`,
      });
    }
  }
  log("info", `on-demand: delivered ${ok} item(s) from ${target.channel}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!cfg.userSession) {
    console.error(
      "\nUSER_SESSION is empty. Run `npm run login` first, then paste the " +
        "session string into .env.\n"
    );
    process.exit(1);
  }
  if (cfg.routes.length === 0 && !cfg.botToken) {
    console.error(
      "\nNothing to do: no routes in config.json and no BOT_TOKEN for " +
        "on-demand mode. Add at least one.\n"
    );
    process.exit(1);
  }

  const userClient = new TelegramClient(
    new StringSession(cfg.userSession),
    cfg.apiId,
    cfg.apiHash,
    { connectionRetries: 5, floodSleepThreshold: 120 }
  );
  userClient.setLogLevel("error");
  await userClient.connect();

  if (!(await userClient.checkAuthorization())) {
    console.error(
      "\nUSER_SESSION is invalid or expired. Run `npm run login` again.\n"
    );
    process.exit(1);
  }
  const me = await userClient.getMe();
  log("info", "User client ready:", me.username ? "@" + me.username : me.firstName);

  // Start the bot client whenever we have a token (needed for on-demand, and
  // optionally for delivery of the live mirror).
  let botClient = null;
  if (cfg.botToken) {
    botClient = new TelegramClient(new StringSession(""), cfg.apiId, cfg.apiHash, {
      connectionRetries: 5,
      floodSleepThreshold: 120,
    });
    botClient.setLogLevel("error");
    await botClient.start({ botAuthToken: cfg.botToken });
    const bme = await botClient.getMe();
    log("info", "Bot client ready:", bme.username ? "@" + bme.username : bme.firstName);
  }

  const mirrorSender =
    cfg.delivery === "bot" && botClient ? botClient : userClient;

  // ---- Live mirror routes ----
  const routeMap = new Map(); // markedSourceId(string) -> [route,...]
  for (const route of cfg.routes) {
    let srcEnt, destEnt;
    try {
      srcEnt = await userClient.getEntity(route.source);
    } catch (e) {
      log("error", `Cannot resolve source ${route.source}: ${e.message}. Is your account joined?`);
      continue;
    }
    try {
      destEnt = await mirrorSender.getEntity(route.dest);
    } catch (e) {
      log("error", `Cannot resolve dest ${route.dest}: ${e.message}.`);
      continue;
    }
    route.destEntity = destEnt;
    const key = String(getPeerId(srcEnt));
    if (!routeMap.has(key)) routeMap.set(key, []);
    routeMap.get(key).push(route);
    log("info", `Mirror route: ${route.source}  ->  ${route.dest}`);
  }

  if (routeMap.size > 0) {
    userClient.addEventHandler(async (event) => {
      try {
        const msg = event.message;
        if (!msg || msg.groupedId) return;
        const key = msg.chatId ? String(msg.chatId) : null;
        const routes = key && routeMap.get(key);
        if (!routes) return;
        for (const route of routes) {
          await copySingle(userClient, mirrorSender, msg, route);
          log("info", `mirrored msg ${msg.id} -> ${route.dest}`);
        }
      } catch (e) {
        log("error", "mirror single failed:", e.message || e);
      }
    }, new NewMessage({}));

    userClient.addEventHandler(async (event) => {
      try {
        const messages = event.messages || [];
        if (messages.length === 0) return;
        const key = messages[0].chatId ? String(messages[0].chatId) : null;
        const routes = key && routeMap.get(key);
        if (!routes) return;
        for (const route of routes) {
          await copyAlbum(userClient, mirrorSender, messages, route);
          log("info", `mirrored album (${messages.length}) -> ${route.dest}`);
        }
      } catch (e) {
        log("error", "mirror album failed:", e.message || e);
      }
    }, new Album({}));
  }

  // ---- On-demand: DM the bot a link ----
  if (botClient) {
    const owners = cfg.ownerIds;
    if (owners.length === 0) {
      log(
        "warn",
        "OWNER_IDS is empty: the bot will reply with each sender's ID and ask " +
          "them to configure it, but will NOT fetch until you set OWNER_IDS."
      );
    }

    botClient.addEventHandler(async (event) => {
      try {
        const msg = event.message;
        if (!msg || !msg.isPrivate) return; // only direct messages
        const chatId = msg.chatId;
        const senderId = msg.senderId ? String(msg.senderId) : null;
        const text = msg.message || "";

        if (owners.length === 0) {
          await botClient.sendMessage(chatId, {
            message:
              `Твой Telegram ID: ${senderId}\n\n` +
              "Добавь его в OWNER_IDS в файле .env и перезапусти бота, " +
              "чтобы я начал работать.",
          });
          return;
        }
        if (!owners.includes(senderId)) {
          await botClient.sendMessage(chatId, {
            message:
              `⛔ Нет доступа. Твой ID: ${senderId}\n` +
              "Если это твой бот — добавь этот ID в OWNER_IDS в .env и перезапусти.",
          });
          return;
        }

        const targets = parseTargets(text);
        if (targets.length === 0) {
          await botClient.sendMessage(chatId, {
            message:
              "Пришли мне ссылку на сообщение, например:\n" +
              "https://t.me/c/123456789/100\n\n" +
              "Или диапазон (до 100 сообщений за раз):\n" +
              "https://t.me/c/123456789/100-110",
          });
          return;
        }

        for (const target of targets) {
          await fetchAndCopyTarget(userClient, botClient, target, chatId);
        }
      } catch (e) {
        log("error", "on-demand handler failed:", e.message || e);
      }
    }, new NewMessage({}));

    log("info", "On-demand ready: DM the bot a message link.");
  }

  log("info", "Listening. Press Ctrl+C to stop.");

  const shutdown = async () => {
    log("info", "Shutting down...");
    try {
      await userClient.disconnect();
      if (botClient) await botClient.disconnect();
    } catch (_) {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await new Promise(() => {}); // keep alive
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
