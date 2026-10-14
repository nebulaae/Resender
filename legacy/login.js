"use strict";

/**
 * One-time interactive login for the USER account (not the bot).
 *
 * This reads your account via MTProto so it can see channels you've joined
 * and re-download media even when "restrict saving content" is enabled.
 *
 * Run:  npm run login
 * Then paste the printed USER_SESSION string into your .env file.
 *
 * You will need API_ID and API_HASH in .env first (https://my.telegram.org).
 */

require("dotenv").config();
const readline = require("readline");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

function prompt(question, { hidden = false } = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    if (hidden) {
      // Mask input (for 2FA password / login code if you prefer privacy).
      const onData = (char) => {
        char = char + "";
        if (["\n", "\r", "\u0004"].includes(char)) {
          process.stdin.removeListener("data", onData);
        } else {
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          rl.output.write(question + "*".repeat(rl.line.length));
        }
      };
      process.stdin.on("data", onData);
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

(async () => {
  const apiId = parseInt(process.env.API_ID || "", 10);
  const apiHash = (process.env.API_HASH || "").trim();

  if (!apiId || !apiHash) {
    console.error(
      "\nSet API_ID and API_HASH in .env first (from https://my.telegram.org).\n"
    );
    process.exit(1);
  }

  console.log("\n=== Telegram user login ===");
  console.log("This logs in YOUR Telegram account to read restricted channels.\n");

  const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => prompt("Phone number (e.g. +15551234567): "),
    password: () => prompt("2FA password (leave blank if none): ", { hidden: true }),
    phoneCode: () => prompt("Login code (sent in Telegram): "),
    onError: (err) => console.error("Login error:", err.message || err),
  });

  const me = await client.getMe();
  const session = client.session.save();

  console.log("\nLogged in as:", me.username ? "@" + me.username : me.firstName);
  console.log("\n==================== USER_SESSION ====================");
  console.log(session);
  console.log("======================================================");
  console.log("\nPut this in your .env as:\n  USER_SESSION=" + session + "\n");
  console.log("Keep it secret — it grants full access to your account.\n");

  await client.disconnect();
  process.exit(0);
})();
