"use strict";
require("dotenv").config();
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");

(async () => {
  const client = new TelegramClient(
    new StringSession(process.env.USER_SESSION),
    parseInt(process.env.API_ID, 10),
    process.env.API_HASH,
    { connectionRetries: 5 }
  );
  client.setLogLevel("error");
  await client.connect();

  const ent = await client.getEntity(-1003518911101);
  console.log("channel:", ent.title);
  console.log("channel.noforwards (protected):", ent.noforwards);

  const me = await client.getMe();
  console.log("my id:", me.id.toString(), "| premium:", !!me.premium);

  await client.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error("ERR:", e.message || e);
  process.exit(1);
});
