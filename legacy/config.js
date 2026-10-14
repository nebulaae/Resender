"use strict";

const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config.json");

function fail(msg) {
  console.error("\n[config] " + msg + "\n");
  process.exit(1);
}

function loadRoutesFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fail(
      "config.json not found. Copy config.example.json to config.json and set your routes."
    );
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    fail("config.json is not valid JSON: " + e.message);
  }
  return raw;
}

/**
 * A "peer" in config can be:
 *   - a numeric id (channel id, e.g. -1001234567890) as number or string
 *   - a public @username
 *   - a t.me link (https://t.me/name or https://t.me/+invitehash)
 * We pass it straight to GramJS getEntity(), which accepts all of these,
 * EXCEPT private invite links (t.me/+hash or joinchat) which must be joined first.
 */
function normalizePeer(v, where) {
  if (v === undefined || v === null || v === "") {
    fail(`Missing "${where}" in a route.`);
  }
  if (typeof v === "number") return v;
  const s = String(v).trim();
  // Numeric id (channel like -1001234567890, or a user id): pass as a Number so
  // GramJS treats it as an id, not a username to look up. Telegram ids fit well
  // under 2^53, so Number is safe.
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isSafeInteger(n)) return n;
  }
  return s;
}

function loadConfig() {
  const apiId = parseInt(process.env.API_ID || "", 10);
  const apiHash = (process.env.API_HASH || "").trim();
  const botToken = (process.env.BOT_TOKEN || "").trim();
  const userSession = (process.env.USER_SESSION || "").trim();
  const delivery = (process.env.DELIVERY || "userbot").trim().toLowerCase();
  const ownerIds = (process.env.OWNER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiId || Number.isNaN(apiId)) {
    fail("API_ID is missing in .env (get it from https://my.telegram.org).");
  }
  if (!apiHash) {
    fail("API_HASH is missing in .env (get it from https://my.telegram.org).");
  }
  if (delivery !== "userbot" && delivery !== "bot") {
    fail('DELIVERY must be "userbot" or "bot".');
  }
  if (delivery === "bot" && !botToken) {
    fail('DELIVERY=bot but BOT_TOKEN is missing in .env.');
  }

  const file = loadRoutesFile();
  const options = Object.assign(
    { albumWaitMs: 1500, logLevel: "info" },
    file.options || {}
  );

  // Routes are optional: you can run on-demand (link -> copy) only.
  const rawRoutes = Array.isArray(file.routes) ? file.routes : [];

  const routes = rawRoutes.map((r, i) => ({
    source: normalizePeer(r.source, `routes[${i}].source`),
    dest: normalizePeer(r.dest, `routes[${i}].dest`),
    footer: typeof r.footer === "string" ? r.footer : "",
    dropCaption: !!r.dropCaption,
  }));

  return {
    apiId,
    apiHash,
    botToken,
    userSession,
    delivery,
    ownerIds,
    options,
    routes,
  };
}

module.exports = { loadConfig, ROOT };
